# 03 Architecture

Applies the boundary clues from [02-discovery.md](./02-discovery.md).

## Bounded contexts

| Context | Type | Aggregate / model | Owns |
| :-- | :-- | :-- | :-- |
| `roster` | Supporting | `PlayerProfile` (aggregate root) | Player CRUD, athletic conversions (`dashToAverageYps`) |
| `playbook` | Supporting | `Route` (aggregate root) | Route templates, cut detection, alignment mirroring, decision points |
| `simulation` | Core | `SimulationState` (engine state), `SimulationFrame` (snapshot) | Movement, pursuit, pass odds, outcomes, decisions, rendering, play store |

Shared kernel (`src/shared/kernel`): `Vec2` and geometry helpers, field dimensions, `DomainError`, `Tone`.

## Context map

```
roster ──(published language: PlayerProfile, Position, metrics)──▶ simulation
playbook ──(published language: Route, DecisionTrigger, resolveRoutePoints)──▶ simulation
```

- Simulation is **downstream** of both. It conforms to their published models and never reaches into their internals.
- Roster and playbook do not know about each other or about simulation.
- The only runtime link is the HTTP API; the simulator loads both catalogs and passes plain data to the engine.

## Layers inside each module

```
src/modules/<context>/
├── domain/           entities, value types, rules, repository ports, domain errors (no frameworks)
├── application/      use cases (and the Zustand play store for simulation)
├── infrastructure/   adapters: Prisma repositories, HTTP API clients, canvas rendering
├── presentation/     HTTP handlers, React components, hooks, labels
├── composition.ts    server-side wiring of adapters to use cases and handlers (roster, playbook)
├── index.ts          published language: types and rules other contexts may use
└── ui.ts             client entry point: components and hooks other code may render
```

Dependency rule: `domain` <- `application` <- `infrastructure` / `presentation`. Inner layers never import outer ones.

## Directory layout

```
src/
├── app/                 Next.js routing and composition only (pages, layout, api route files)
├── shared/
│   ├── kernel/          geometry, field, errors, tone
│   ├── infrastructure/  Prisma client, HTTP response mapping, JSON fetch client
│   └── ui/              layout shell, shadcn primitives, hooks, formatting
└── modules/
    ├── roster/
    ├── playbook/
    └── simulation/
```

Next.js route files stay one-liners, for example `export const GET = playerHandlers.list`.

## Enforced rules (`eslint.config.mjs`)

| Rule | Applies to |
| :-- | :-- |
| No imports from outer layers | every module layer |
| No `react`, `next` or Prisma client imports | `domain` and `application` |
| Other modules only through `index`, `ui` or `composition` | all module code and `src/app` |
| No dependency on any module | `src/shared` |
| No dependency on modules or frameworks | `src/shared/kernel` |

## Errors

Business-rule failures are domain errors (`PlayerNotFoundError`), thrown by repositories and mapped to HTTP codes (404, 409 for conflicts) in `shared/infrastructure/http/apiResponses.ts`. Prisma error codes never leave the infrastructure layer.

## Deliberate trade-offs

- Domain events are not modeled as objects yet; the play store logs them as text. See the discovery doc.
- Presentation components call the API clients in `infrastructure/` directly. A client-side application layer would add indirection without a second consumer.
- Zod schemas sit in the roster domain because they express the Player invariants that both the API and the form must enforce.
- Simulation re-uses `PlayerProfile` from roster instead of translating it through an anti-corruption layer. If roster's model starts to diverge, add a mapper in `simulation/application`.
