# Architecture

Current structure of Flag Football Lab. Scope, event flows, and the first boundary pass live in [docs/ddd](./ddd). JSON contracts, field coordinates, and how the engine resolves a throw live in [README.md](../README.md).

## Surfaces

| Route | Context | What it does |
| :-- | :-- | :-- |
| `/` | app shell | Dashboard that launches the other surfaces |
| `/simulator` | `simulation` | One play on a canvas: view-only or tactical, offense or defense, one receiver or a 5-on-5 call |
| `/players` | `roster` | Create, edit, and delete player profiles |
| `/playbook` | `playbook` + `simulation` | Offense library (5-on-5 plays or single routes) and the defense library |
| `/results` | `simulation` | Plays finished in this browser session |
| `/referee` | `officiating` | Rules exam, scored in the browser |

`src/app` only routes and composes. Pages stay thin and import a module through `index.ts`, `ui.ts`, or `composition.ts`.

## Bounded contexts

| Context | Type | Aggregate / model | Owns |
| :-- | :-- | :-- | :-- |
| `roster` | Supporting | `PlayerProfile` | Player CRUD, alternate positions, athletic conversions (`dashToAverageYps`) |
| `playbook` | Supporting | `Route`, `OffensivePlay` | Named routes in Postgres; 10 formations and 30 five-on-five calls as in-memory catalogs; cut detection, alignment mirroring, decision points |
| `simulation` | Core | `SimulationState`, `SimulationFrame` | Movement, coverage, pass odds, outcomes, the play store, canvas rendering, session history. Six defensive plays (`defensivePlays.ts`) and the 5-on-5 snap (`teamPlay.ts`) live here |
| `officiating` | Supporting | `RuleQuestion` | Question bank and exam scoring. No persistence and no link to the other contexts |

Shared kernel (`src/shared/kernel`): `Vec2` and geometry, field dimensions, `DomainError` (including `UnauthorizedError` and `ServiceUnavailableError`), and the activation-key header name.

## Context map

```
roster ──(published language: PlayerProfile, Position, canPlayPosition)──▶ simulation
playbook ──(published language: Route, OffensivePlay, DecisionTrigger, resolveRoutePoints)──▶ simulation
officiating  (standalone)
```

- Simulation is downstream of roster and playbook. It imports only their published `index.ts` and never their internals.
- Roster, playbook, and officiating do not know about each other or about simulation.
- The playbook page is the composition point: `src/app/playbook` loads players and routes, then hands plain data to simulation hooks (`useAssignRouteToSimulator`, `useRunOffensivePlay`, `useRunDefensivePlay`).
- Defensive plays are simulation concepts. The defense tab renders `DefensePlaybook` from `simulation/ui`, not from the playbook module.
- Officiating is a closed context: domain rules plus `RefereeExam`. It does not read the roster or the engine.

## Two ways a play starts

| Kind | Source | What runs |
| :-- | :-- | :-- |
| Single target | A `Route` from the playbook API, one receiver alignment | Receiver, quarterback, cornerback, safety, rusher, outlet. `SimulationConfig.teamPlay` is absent |
| 5-on-5 | An `OffensivePlay` (four skill routes plus the quarterback spot) | `TeamPlaySetup` on the config. The same `TeamLineup` fills X, Y, Z, C, the quarterback, the rusher, and a defender over each skill player |

Modes stay `VIEW` and `TACTICAL`. `PlayCategory` is `OFFENSE` or `DEFENSE`: the user calls one side, and the engine runs the other. Tactical offense pauses for `PASS_TO_WR`, `PUMP_FAKE_SCRAMBLE`, or `CHECKDOWN` (on a 5-on-5 snap, throw choices are per skill player). Tactical defense pauses for `HOLD_COVERAGE`, `JUMP_ROUTE`, or `BLITZ_SAFETY`.

The engine is pure TypeScript. It steps at a fixed 1/120 s with a seeded RNG. `FieldCanvas` runs one `requestAnimationFrame` loop that reads the Zustand store, so React does not render every frame. Finished plays append to `sessionHistoryStore` in memory only.

## Layers inside each module

```
src/modules/<context>/
├── domain/           entities, value types, rules, repository ports, domain errors (no frameworks)
├── application/      use cases, and the Zustand stores for simulation
├── infrastructure/   adapters: Prisma repositories, HTTP clients, canvas drawing
├── presentation/     HTTP handlers, React components, hooks
├── composition.ts    server wiring of adapters to use cases and handlers (roster, playbook)
├── index.ts          published language other contexts may import
└── ui.ts             client entry: components and hooks other code may render
```

Dependency rule: `domain` ← `application` ← `infrastructure` / `presentation`. Inner layers never import outer ones. `officiating` has domain and presentation only.

## Directory layout

```
prisma/                    schema (Player, Route), migrations, seed
src/
├── app/                   Next.js routing and composition
│   ├── page.tsx, players, simulator, playbook, results, referee
│   └── api/
│       ├── players        list and get are open; create, update, delete require the activation key
│       ├── routes         read-only route catalog
│       └── activation/session   checks a key without writing data
├── shared/
│   ├── kernel/            geometry, field, errors, activation header name
│   ├── infrastructure/    Prisma client, HTTP mapping, fetch client, activation-key check
│   └── ui/                shell (sidebar, header), shadcn primitives, activation key button
└── modules/
    ├── roster/
    ├── playbook/
    ├── simulation/
    └── officiating/
```

Next.js route files stay one-liners, for example `export const GET = playerHandlers.list`. The activation session route is the exception: it calls `assertActivationKeyValue` directly because it has no module use case.

## Access to roster writes

Reads of players and routes are open. Creating, updating, or deleting a player requires header `x-activation-key` (`ACTIVATION_KEY_HEADER`). The server compares it in constant time with `ACTIVATION_KEY`. A missing server key is `ServiceUnavailableError` (503). A missing or wrong client key is `UnauthorizedError` (401). The browser keeps the key in `sessionStorage` under `flag-football.activation-key` and never receives the env value. `POST /api/activation/session` validates a key before the user edits anyone.

## Enforced rules (`eslint.config.mjs`)

| Rule | Applies to |
| :-- | :-- |
| No imports from outer layers | every module layer |
| No `react`, `next`, or generated Prisma client imports | `domain` and `application` |
| Other modules only through `index`, `ui`, or `composition` | all module code and `src/app` |
| No dependency on any module | `src/shared` |
| No dependency on modules or frameworks | `src/shared/kernel` |

Modules covered by the lint: `roster`, `playbook`, `simulation`, `officiating`.

## Errors

Business-rule failures are `DomainError` subclasses (`NotFoundError`, `ConflictError`, `UnauthorizedError`, `ServiceUnavailableError`). Repositories throw them. `shared/infrastructure/http/apiResponses.ts` maps them to HTTP status codes. Prisma error codes never leave the infrastructure layer. Request bodies for players are checked with the roster Zod schema before the use case runs.

## Deliberate trade-offs

- Domain events are not objects. The play store logs them as text. See [02-discovery.md](./ddd/02-discovery.md).
- Presentation components call infrastructure API clients directly. A client-side application layer would add indirection without a second consumer.
- Zod schemas sit in the roster domain because they are the `PlayerProfile` invariants shared by the API and the form.
- Simulation reuses `PlayerProfile` and `Route` instead of translating them through an anti-corruption layer. If either model diverges, add a mapper in `simulation/application`.
- Offensive plays and defensive plays are code catalogs, not database rows. Routes stay in Postgres because the single-target library is seeded and listed over HTTP.
- Session results live in a Zustand store for the tab. Refreshing the page clears them.
- The activation key is a shared secret for a single coach, not accounts or teams.
