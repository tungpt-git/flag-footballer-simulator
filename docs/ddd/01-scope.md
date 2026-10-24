# 01 Scope (ddd-scope)

## Problem and value statements

- **Problem:** Coaches keep player ratings in spreadsheets and have no way to see how a route plays out against coverage, so they cannot judge a throw or a pass-rush decision before they call it in a game.
- **Value:** A coach can maintain a roster, pick a receiver and a route, and either watch the play or make the quarterback's call at the decision point and see a believable result.

## Goals and non-goals

| Goals | Boundary |
| :-- | :-- |
| Maintain player profiles (bio, athletic metrics, season stats) | Create, edit, delete and list. Jersey numbers may repeat. |
| Maintain a catalog of named routes | Slant, Out, Go, Hook, Post, defined as offsets from the receiver's alignment. Read-only in the UI. |
| Simulate one pass play, top-down, for one target | One receiver, one cornerback, one safety, one rusher, one outlet receiver. The offense picks one of 12 routes; the defense runs one of 6 defensive plays (man, press, zone, bracket, blitz, prevent). The user coaches either side (OFFENSE or DEFENSE): defensive plays are interactive, pausing for a defensive call while the engine runs the offense. |
| View Only mode | Pick receiver and route, press Play, watch the run to the end of the route. |
| Tactical mode | Pause at 2.5 s or at the route cut, offer Pass to WR, Pump Fake & Scramble or Checkdown, then resolve the outcome. |
| Reproducible plays | The same seed and the same choices give the same result. |

| Non-goals | Why |
| :-- | :-- |
| Full 11-player (or 5-player) formations and multi-receiver progressions | The model is built for a single target. |
| Authoring routes in the UI | Routes are seeded. Authoring is a later capability. |
| Game, season, scoring and standings management | This is a play simulator, not a league tool. |
| Authentication, teams, multi-tenancy | Single-coach use for now. |
| Multiplayer or networked play | Simulation runs in the browser. |
| Real physics or player tracking data import | The engine is an approximation tuned for plausibility. |

## Constraints and assumptions

| Item | Kind | Verifiable | How to verify |
| :-- | :-- | :-- | :-- |
| Next.js App Router, TypeScript, Tailwind, shadcn, Zustand, Prisma, PostgreSQL | Constraint | Yes | `package.json`, build passes |
| Canvas 2D with one `requestAnimationFrame` loop, no per-frame React render | Constraint | Yes | Code review of `FieldCanvas` |
| Field is 30 yd wide, 0 at midfield to 50 at goal line, 10 yd end zone | Assumption | Yes | `shared/kernel/field.ts` against league rules |
| 40-yard dash time is a fair proxy for football speed; peak speed is 1.12 x dash average | Assumption | No | Needs calibration against tracking data |
| Agility 0-100 maps linearly to acceleration and cut penalty | Assumption | No | Needs coach feedback on feel |
| `catchProbability` is reused per position (catching, throw accuracy, ball skills) | Assumption | Yes | Ask coaches whether separate fields are needed |
| Engine runs deterministically at a fixed 1/120 s step | Constraint | Yes | `simulation.test.ts` |
| Jersey numbers may be shared by several players | Assumption | No | Players are told apart by id, not by number |
| Outlet receiver and default defenders are synthetic, not rostered players | Assumption | Yes | `simulation/domain/constants.ts` |

## Terminology seeds

| Term | Candidate definition | Ambiguity | Scenario |
| :-- | :-- | :-- | :-- |
| Player / Profile | A rostered person with bio, metrics and stats | "Player" on the field (entity) vs on the roster (profile) | Roster, Simulation |
| Position | QB, WR, DB or Rusher | Rusher is a flag-football role, not a real position | Roster |
| Metrics | Athletic ratings used by the engine | Overlaps with simulation "frame metrics" | Roster, Simulation |
| Stats | Season counters (targets, receptions, yards, flag pulls, interceptions) | Not used by the engine | Roster |
| Route | A named path as offsets from alignment | A route vs the resolved path on the field | Playbook |
| Waypoint | A vertex of a route, optionally a cut | | Playbook |
| Cut | A waypoint with a sharp turn (>= 20 degrees) | Threshold is a modeling choice | Playbook |
| Alignment | The receiver's starting x position (left or right) | Mirrors the route toward the field center | Playbook, Simulation |
| Decision point | A trigger where a tactical play pauses (AT_TIME or AT_CUT) | Defined by the route, consumed by the simulation | Playbook, Simulation |
| Play / Simulation | One pass play from snap to outcome | | Simulation |
| Frame | Serializable snapshot of a play at one instant | | Simulation |
| Separation | Distance between receiver and nearest defender | | Simulation |
| Pressure | How close the rusher is to the QB (0-1) | | Simulation |
| Timing | How well the throw lines up with the receiver's break | Relative to break time, not to the clock | Simulation |
| Outcome | Completed Pass, Intercepted, Flag Pulled, Turnover, Incomplete, Scramble Gain | Turnover currently means a fumble only | Simulation |
| Checkdown | A short safe throw to the outlet receiver | | Simulation |
| Scramble | QB escapes the rush and runs after a pump fake | | Simulation |

## Risk inventory

| Category | Risk | Impact | Trigger | Mitigation |
| :-- | :-- | :-- | :-- | :-- |
| Business | Coaches do not trust results because the model is uncalibrated | Tool is ignored | Odds feel wrong in review | Show odds before the call, expose the inputs, calibrate with coach feedback |
| Business | Scope creeps into game management | Delivery slips | Requests for scores and standings | Keep the non-goals list visible, split into a new context if needed |
| Integration | Simulation depends on roster and playbook shapes | Changes in either break the engine | Rename of a field | Depend on each module's published `index.ts` only; enforced by lint |
| Integration | Client fetches roster and routes over HTTP | Simulator is unusable if the API is down | Database offline | Clear error state and retry; keep the engine free of I/O |
| Consistency | Deleting a player who is selected in the simulator | Stale lineup | Delete while the simulator is open | The store keeps a selection only if the player still exists, otherwise it picks the first player in that position |
| Delivery | Engine tuning is subjective and has no acceptance numbers | Endless tuning | Disagreement on feel | Document sample odds in tests and freeze them as regression tests |
| Delivery | Layer boundaries erode over time | Big-ball-of-mud returns | Shortcut imports | ESLint `no-restricted-imports` rules per module and layer |

## Next-step preparation (inputs for ddd-discover)

| Role | Required input | Expected output |
| :-- | :-- | :-- |
| Coach (domain expert) | Walk through a pass play and the three decisions | Confirmed events, exceptions and wording |
| Product owner | Confirm non-goals and the single-target scope | Signed-off scope |
| Engineer | Current engine behavior and tuning constants | Event list taken from the code |
