# 02 Discovery (ddd-discover)

Events are derived from the engine (`simulation/domain/simulation.ts`) and the roster/playbook flows, then checked against the scope in [01-scope.md](./01-scope.md).

## Event flow

### Main path: Tactical play, pass completed

| # | Event (past tense) | Triggering command | Participant | Input / output | Exception branches |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | PlaySnapped | StartPlay | Coach | Lineup, route, alignment, trigger, seed / frame at t = 0 | Missing lineup falls back to default profiles |
| 2 | RouteRunStarted | (automatic) | Receiver | Route points / runner moving | |
| 3 | RusherReleased | (automatic, after 1.2 s) | Rusher | / pressure rising | |
| 4 | DecisionPointReached | (automatic at 2.5 s or at first cut) | Engine | / play paused with options | Route ends first: play finishes without a decision |
| 5 | DecisionMade (PassToWR) | MakeDecision | Coach as QB | Action / ball launched | |
| 6 | PassThrown | (automatic) | QB | Throw point, lead target / ball in flight | |
| 7 | PassCompleted | (automatic on arrival) | Receiver | Odds roll / catch, yards after catch | See exception paths |
| 8 | FlagPulled | (automatic) | Defender | Pull roll / play ends | Pull fails: runner continues to goal line |
| 9 | PlayEnded | (automatic) | Engine | Outcome, yards, touchdown flag / FINISHED | |

### Exception path A: incomplete or intercepted pass

| # | Event | Trigger | Notes |
| :-- | :-- | :-- | :-- |
| 7a | PassIncomplete | Roll says neither complete nor intercept | Outcome INCOMPLETE, 0 yards |
| 7b | PassIntercepted | Roll favors the defender | Outcome INTERCEPTED |

### Exception path B: pump fake and scramble

| # | Event | Trigger | Notes |
| :-- | :-- | :-- | :-- |
| 5b | DecisionMade (PumpFakeScramble) | MakeDecision | |
| 6b | PumpFakePerformed | (automatic, 0.4 s) | Defenders only react after the fake plus their reaction time |
| 7b | ScrambleStarted | (automatic) | QB runs, rusher pursues |
| 8b | FlagPulled or ScrambleEnded | Pull succeeds, or time or goal line reached | Outcome FLAG_PULLED or SCRAMBLE_GAIN |

### Exception path C: checkdown and fumble

| # | Event | Trigger | Notes |
| :-- | :-- | :-- | :-- |
| 5c | DecisionMade (Checkdown) | MakeDecision | Throw to the outlet receiver |
| 7c | PassCompleted | Odds roll | Usually the safest option |
| 8c | FumbleOccurred | 3 % roll whenever a flag is pulled (after a catch or on the QB) | Outcome TURNOVER |

### Exception path D: View Only mode

| # | Event | Notes |
| :-- | :-- | :-- |
| 4d | (no DecisionPointReached) | Play never pauses; the receiver runs to the end of the route and holds, then PlayEnded |

### Roster and playbook flows

| Event | Command | Initiator | Exceptions |
| :-- | :-- | :-- | :-- |
| PlayerRegistered | RegisterPlayer | Coach | ValidationFailed (400) |
| PlayerProfileUpdated | UpdatePlayer | Coach | PlayerNotFound (404), ValidationFailed (400) |
| PlayerRemoved | RemovePlayer | Coach | PlayerNotFound (404) |
| RoutesSeeded | (seed script) | Engineer | |

## Command candidates

| Command | Initiator | Expected result | Idempotency |
| :-- | :-- | :-- | :-- |
| RegisterPlayer | Coach | New player (jersey number may repeat) | No, each call creates a new player |
| UpdatePlayer | Coach | Player replaced with new values | Yes |
| RemovePlayer | Coach | Player deleted | Not idempotent, second call is 404 |
| ListPlayers / ListRoutes | Coach, Simulator | Current catalog | Yes |
| StartPlay | Coach | Play at t = 0 | Yes for a fixed seed |
| MakeDecision | Coach | Play resumes along the chosen branch | Once per decision point |
| PreviewDecision | Coach | Odds shown without changing the play | Yes, runs on a clone |
| Reset | Coach | Play back to PRE_SNAP | Yes |

## Event candidates

| Event | Key fields | Cross-context | Published externally |
| :-- | :-- | :-- | :-- |
| PlayerRegistered, PlayerProfileUpdated, PlayerRemoved | id, jersey number | Yes, Simulation reads the roster | No (read through the API) |
| PlaySnapped | seed, lineup ids, route id | No | No |
| DecisionPointReached | decision point id, options | No | No |
| DecisionMade | action | No | No |
| PassCompleted, PassIncomplete, PassIntercepted | probabilities, metrics | No | No |
| FlagPulled, FumbleOccurred, ScrambleEnded | yards | No | No |
| PlayEnded | outcome, yards, touchdown | No | Event log in the UI |

Domain events are not yet modeled as objects. The simulation store writes them as event log entries. Promote them only when a second consumer needs them.

## Hotspots

- **Consistency:** determinism of a play (seeded RNG, fixed step, state never mutated).
- **Integration:** Simulation consumes `PlayerProfile` and `Route`; the API is the only runtime link between the contexts.
- **Performance:** the canvas loop at 60 fps and the 120 Hz fixed step; the preview runs the engine on a clone.
- **Compliance:** none identified (no personal data beyond names and jersey numbers; no authentication yet).

## Ambiguities

| Ambiguity | Impact | Who must confirm | Suggested resolution |
| :-- | :-- | :-- | :-- |
| `catchProbability` means catching, accuracy or ball skills by position | Confusing data entry and tuning | Coach | Keep one field with position-specific labels, or split into separate fields |
| TURNOVER is only a fumble, INTERCEPTED is also a turnover | Outcome counts mislead | Coach | Rename TURNOVER to FUMBLE_LOST or merge the meaning |
| "Rusher" counts as a position yet rushes the QB only | Roster lists a role, not a person's position | Coach | Keep, document as role |
| Do stats (targets, receptions, yards) feed the model? | Stats look important but change nothing | Product owner | Keep display-only until a use case appears |
| Is the outlet receiver rostered? | Checkdown quality is fixed | Product owner | Keep synthetic, add roster selection later |
| Is 2.5 s the decision time for every route? | Deep routes pause before the break | Coach | Make the time a route property |
| Flag pull on a scramble: does it end the play at the pull point? | Yardage differs by one or two yards | Coach | Confirm and test |

## Boundary clues

Three capabilities cluster around distinct vocabulary and rates of change:

1. **Roster** (supporting): Player, Position, Metrics, Stats, jersey number. Simple CRUD, one aggregate, no invariant that crosses rows.
2. **Playbook** (supporting): Route, Waypoint, Cut, Decision point, alignment mirroring. Read-mostly, pure geometry on offsets.
3. **Simulation** (core): Play, Frame, Separation, Pressure, Timing, Outcome, Decision. All the modeling effort and the tuning live here.

Shared concepts that belong to no single context go in the shared kernel: field geometry, vectors, base domain errors.

Next step: apply these clues in [03-architecture.md](./03-architecture.md).
