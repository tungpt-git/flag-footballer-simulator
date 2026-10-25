# Flag Football Lab

Flag football management and route simulation app: player profiles, a 2D top-down field simulator, and two modes:

- **Playbook (View only)**: pick a receiver and route, press Play, and watch the receiver dot run the route while a defender pursues.
- **Tactical (Interactive)**: the play pauses at the route cut or at 2.5 s. Call *Pass to WR*, *Pump Fake & Scramble* or *Checkdown*; the engine resolves the outcome from receiver speed, defender separation, throw timing and pass-rush pressure.

Stack: Next.js (App Router, TypeScript), Tailwind CSS v4, shadcn/ui (restyled to a dark broadcast-analytics theme with a light option), HTML5 Canvas, Zustand, Prisma 7 + PostgreSQL, Vitest.

## Quick start

```bash
pnpm install
cp .env.example .env        # DATABASE_URL for the Docker database
pnpm db:up                  # postgres:16 in Docker
pnpm exec prisma migrate dev  # create tables
pnpm db:seed                # 34 players (replaces the roster) + 12 routes
pnpm dev                    # http://localhost:3000
```

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Production

Docker-based: a one-shot `prisma migrate deploy` job and the Next.js standalone server, in `docker-compose.prod.yml` (separate project `flag-football-prod`, so it never touches the dev database). The database is hosted on Supabase.

```bash
cp .env.production.example .env.production   # set the Supabase password in DATABASE_URL
pnpm prod:up                                 # build, migrate, start on APP_PORT (default 3000)
pnpm prod:logs
pnpm prod:down
```

The seed is not run in production because it replaces the roster. To load the sample data once, run `DATABASE_URL=<supabase url> pnpm db:seed`.

Supabase notes: the direct host `db.<ref>.supabase.co` is IPv6-only unless the IPv4 add-on is enabled. If the host can't reach it, use the Session pooler string from the Supabase dashboard (Connect) instead.

## Project structure

The code is organized by bounded context, following DDD. See [docs/ddd](docs/ddd) for scope, discovery and architecture notes.

```
prisma/                      schema.prisma, migrations, seed.ts
src/
├── app/                     routing and composition only
│   ├── page.tsx, _components/DashboardOverview.tsx
│   ├── players/page.tsx, simulator/page.tsx
│   └── api/players, api/routes   one-line route files wired to module handlers
├── shared/
│   ├── kernel/              Vec2 + geometry, field dimensions, domain errors, Tone
│   ├── infrastructure/      Prisma client, HTTP response mapping, activation-key check
│   └── ui/                  layout shell, shadcn primitives, design tokens in globals.css, hooks
└── modules/
    ├── roster/              Player CRUD (supporting)
    │   ├── domain/          PlayerProfile, Zod invariants, repository port, errors, athletics
    │   ├── application/     playerUseCases
    │   ├── infrastructure/  prismaPlayerRepository
    │   └── presentation/    API handlers, form, hooks, UI
    ├── playbook/            Routes (supporting)
    │   ├── domain/          Route, route templates, cut detection, alignment mirroring
    │   ├── application/     routeUseCases
    │   ├── infrastructure/  prismaRouteRepository, routeApiClient
    │   └── presentation/    API handlers, useRoutes
    └── simulation/          Play engine (core)
        ├── domain/          pure TypeScript engine: movement, defense, outcome, simulation, rng, types
        ├── application/     simulationStore (Zustand)
        ├── infrastructure/  rendering: drawField, drawRoutes, drawPlayers, fieldMetrics
        └── presentation/    FieldCanvas, SetupPanel, DecisionDialog, OutcomeBanner, ...
```

Each module exposes `index.ts` (types and rules other contexts may use) and `ui.ts` (components and hooks). Roster and playbook also have `composition.ts`, which binds the Prisma adapters to the use cases for the API routes. ESLint enforces the layer and module boundaries.

## Coordinates

Field units are yards. `x` is lateral (0 to 30), `y` is downfield: 0 is midfield, 50 is the goal line and 60 is the back of the end zone. Route offsets are stored relative to the receiver's alignment, with `+x` toward the field center, so one route works on the left or right.

## JSON contracts

**PlayerProfile**

```json
{
  "id": "p_wr1",
  "name": "Jordan Reyes",
  "position": "WR",
  "altPositions": ["DB"],
  "jerseyNumber": 11,
  "metrics": { "fortyYardDash": 4.55, "agility": 84, "catchProbability": 0.8, "flagPullEfficiency": 0.35 },
  "stats": { "targets": 48, "receptions": 36, "yards": 512, "flagPulls": 2, "interceptions": 0 }
}
```

`position` is the player's main position (`QB | WR | DB | RUSHER`). `altPositions` lists the other positions the player can play (never the main one); the simulator and playbook offer a player for every position they can play. `catchProbability` means catching (WR), throw accuracy (QB) or ball skills (DB).

**Route**

```json
{
  "id": "r_slant",
  "name": "Slant",
  "type": "SLANT",
  "waypoints": [
    { "x": 0, "y": 0, "cut": false },
    { "x": 0, "y": 3, "cut": true, "cutAngleDeg": 45 },
    { "x": 7, "y": 10, "cut": false },
    { "x": 10, "y": 13, "cut": false }
  ],
  "decisionPoints": [
    { "id": "dp_cut", "trigger": "AT_CUT", "waypointIndex": 1 },
    { "id": "dp_time", "trigger": "AT_TIME", "timeSec": 2.5 }
  ]
}
```

**SimulationFrame** (`getFrame(state)` in `modules/simulation/domain/simulation.ts`)

```json
{
  "t": 0.53,
  "phase": "PAUSED_FOR_DECISION",
  "entities": [
    { "id": "receiver", "role": "RECEIVER", "label": "11", "pos": { "x": 6, "y": 33 }, "vel": { "x": 0, "y": 5.2 }, "routeProgress": 0.18 },
    { "id": "cornerback", "role": "DEFENDER", "label": "21", "pos": { "x": 6.8, "y": 34.1 }, "vel": { "x": 0.3, "y": 6.1 }, "targetId": "receiver" },
    { "id": "rusher", "role": "RUSHER", "label": "55", "pos": { "x": 15, "y": 37 }, "vel": { "x": 0, "y": 0 } },
    { "id": "qb", "role": "QB", "label": "1", "pos": { "x": 15, "y": 25 }, "vel": { "x": 0, "y": 0 } }
  ],
  "ball": null,
  "metrics": { "separationYd": 1.6, "pursuitAngleDeg": 23, "rusherDistanceYd": 12 },
  "pendingDecision": { "dpId": "dp_cut", "options": ["PASS_TO_WR", "PUMP_FAKE_SCRAMBLE", "CHECKDOWN"] },
  "outcome": null
}
```

`outcome` is `{ result, yardsGained, touchdown, reason, probabilities?, metrics? }` where `result` is `COMPLETED_PASS | INTERCEPTED | FLAG_PULLED | TURNOVER | INCOMPLETE | SCRAMBLE_GAIN`.

## How the simulation works

- **Receiver:** follows the route polyline at `(40 / dash) * 1.12` yd/s, ramping up from the snap and slowing into sharp cuts. Agility reduces the cut penalty.
- **Defenders:** lead-pursuit aim (solves `|P_rec + V_rec * t - P_def| = speed * t`), limited by top speed and agility-based acceleration so they lag at cuts. Each defensive play (Man Free, Press Man, Cover 2 Zone, Bracket Double Team, All-Out Blitz, Prevent Deep Zone) sets how the cornerback and safety line up and cover (man or zone) and when the rusher breaks (`modules/simulation/domain/defensivePlays.ts`). The rusher chases the QB after that play's delay.
- **Offense vs. defense:** every play has a category. As OFFENSE you call the throw while the engine runs the defense. As DEFENSE (Playbook → Defense tab → "Run live", or the simulator's "Coach the" switch) the engine runs the offense and the play pauses for your call: Hold coverage, Jump the route (faster break and a higher interception chance, but he can be beaten by a double move) or Blitz the safety (adds a second rusher). The Playbook page splits into OFFENSE (routes) and DEFENSE (defensive plays) tabs.
- **Throws:** the ball is led to the receiver's projected position. At arrival the odds come from separation, speed difference, timing relative to the cut, pressure and throw distance (`modules/simulation/domain/outcome.ts`). The rolls then decide complete, intercepted or incomplete, followed by a flag-pull check on the catch.
- **Determinism:** the engine steps at a fixed 1/120 s and uses a seeded RNG, so a given seed always replays the same way.
- **Rendering:** `FieldCanvas` runs one `requestAnimationFrame` loop that reads the Zustand store directly, so React does not re-render every frame.
