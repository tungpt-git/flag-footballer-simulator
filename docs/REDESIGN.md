# UI/UX Redesign: deliverables

Scope follows `docs/DESIGN.md`: presentation only. No change to Prisma, API routes, the simulation engine (`domain/*`), the `simulationStore` shape, or route/player JSON.

## 1. Audit of the previous UI

| Area | Problem |
| --- | --- |
| Identity | GitLab-Pajamas gray and blue admin look. Nothing said "football" or "film room". |
| Modes | View-only and Tactical were two text tabs on the page heading. Same colours, same layout. |
| Field | Field was a framed card among other cards. Positions were told apart by colour only. |
| Decision | Decision dialog covered the QB and the rusher, the very things the user must read. |
| Outcome | All results looked alike (tinted banner). No "why", no next step. |
| Roster | Table only. No filters, no comparison to the team, no empty/error states beyond text. |
| Playbook | Routes lived only inside a select. No thumbnails. |
| History | None. |
| A11y | Colour-only coding, no reduced motion, no screen-reader outcome summary, small touch targets. |
| Responsive | 3-column grid with no tablet or phone layout. |

## 2. Two style directions

**A. Dark broadcast / analytics (chosen, default).** Near-black stage, lime primary, condensed display type (Barlow Condensed) for numbers and headings, mono (JetBrains Mono) for telemetry. The field is the brightest, most saturated object on screen. Fits the "film room" brief and makes decision moments feel tense.

**B. Clean light coaching board (shipped as the light theme).** White cards on a cool-gray stage, forest-green primary. Better for outdoor and projector use, and good for roster work. Same tokens, same layout, only values change.

Both themes are real: a toggle in the top bar, persisted in `localStorage`, with the dark theme as default and no flash on load (inline init script).

## 3. Design tokens

Tailwind v4 is CSS-first, so there is no `tailwind.config.ts`. Tokens live in `src/app/globals.css` (`@theme inline` for names, `:root` and `.dark` for values).

| Group | Tokens |
| --- | --- |
| Type | `font-display` (Barlow Condensed), `font-sans` (Inter), `font-mono`. Sizes: `text-display`, `text-title`, `text-heading`, `text-stat`, `text-caption`. Utilities `tabular`, `caption-label`. |
| Surface | `background`, `surface`, `raised`, `stage`, `card`, `popover`, `muted`, `secondary`, `accent`, `border`, `input`, `ring` |
| Brand | `primary` (dark `#b6f23a`, light `#166534`) |
| Semantic | `success`, `warning`, `danger`, `info`, each with a `-soft` tint |
| Mode identity | `mode-view` (blue), `mode-live` (amber). Used by the switcher, stage frame, badges, dashboard cards. |
| Team | `team-offense`, `team-defense` |
| Position | `pos-qb` gold, `pos-wr` sky, `pos-db` vermillion, `pos-rusher` magenta |
| Shape and depth | `--radius`, `shadow-raised`, eases, 150-300 ms durations |
| Motion | `pop-in`, `slide-up`, `fade-in`, `shake`, `pulse-ring`. All disabled under `prefers-reduced-motion`. |

Text and control colours were chosen for WCAG AA against their surfaces in both themes. Muted text is `#9db0c6` on `#090d12` (dark) and `#475569` on white (light).

**Position coding (never colour alone):** QB = circle, WR = diamond, DB = square, Rusher = hexagon. Same silhouettes in the roster, legend, badges, and on the canvas (`positionTheme.ts`).

## 4. Wireframes

Desktop (>= 1280)

```
┌ logo ─ [ View only | Interactive ] ───────────── theme · avatar ┐
├rail┬──────────┬───────────────────────────────┬────────────────┤
│Dash│ SETUP    │ ▌View only · Film room  [Live]│ Live│Log│Session│
│Sim │ receiver │                               │ clock 3.2 s    │
│Ros │ routes   │        F I E L D              │ players picker │
│Pbk │ align    │   (decision overlay at top,   │ telemetry      │
│Res │ trigger  │    outcome card at bottom)    │ team-avg bars  │
│    │ ▸ more   ├───────────────────────────────┤                │
│    │          │ ⟲ ▶ ⏭ ▮▮▮timeline▮▮▮ 0.25-2x │                │
└────┴──────────┴───────────────────────────────┴────────────────┘
```

Tablet (768 to 1279): icon rail, field in the center, one right panel with tabs Setup / Live / Log / Session.

Mobile (< 768): top bar with compact mode switch, field at about 60% of the viewport, toolbar, three buttons (Setup, Live data, Activity) that open a bottom sheet, bottom tab bar for navigation.

Other screens: Dashboard (two mode cards, stat tiles, fastest receivers, session recap). Roster (filter chips, search, sort, grid or list, detail sheet with radar and meters vs team average, edit sheet with live preview). Playbook (route cards with thumbnails, per-card receiver select, "Assign and open simulator"). Results (success donut, outcome mix, per-decision table, play log).

## 5. Component inventory

Shadcn / base-ui primitives restyled in place (`src/shared/ui/primitives`): `Button` (new variants, coarse-pointer sizes), `Badge` (semantic soft variants), `Dialog` (new `sheet` variant: bottom sheet on mobile, right drawer from md), `Tabs`, `Input`, `Select`, `LabeledSelect`, `FormField`, `Slider`, `Table`, `Sonner`, `Tooltip`.

New shared components: `PositionGlyph`, `StatMeter` (role=meter with team-average tick and text delta), `ThemeToggle`, `useMediaQuery`, `usePrefersReducedMotion`, `AppSidebar` plus `MobileTabBar`, rewritten `AppHeader` and `PageHeading`.

Roster: `PlayersWorkspace`, `PlayerCard`, `PlayerTable`, `PlayerDetailSheet`, `PlayerFormDialog`, `PlayerMeters`, `PlayerRadar`, `PositionBadge`.

Playbook: `PlaybookWorkspace`, `RouteThumbnail`.

Simulation: `ModeSwitcher`, `StageHeader`, `StageLegend`, `StagePanels`, `FieldCanvas` (zoom, pan, hover, select, keyboard), `PlaybackToolbar`, `PlaybackTimeline`, `DecisionDialog`, `OutcomeBanner`, `LiveMetricsPanel`, `EventLog`, `SetupPanel`, `SessionHistory`, `SessionSummary`.

Deviations from the brief:

- The canvas is plain Canvas 2D (the project has no react-konva). Static field is cached to an offscreen layer, so per-frame work is unchanged.
- Three small UI-only Zustand stores were added next to, not inside, the engine store: `stageUiStore` (selected and hovered entity) and `sessionHistoryStore` (finished plays). `simulationStore` is untouched.
- The timeline is read-only (markers for snap, cut, decision, end). Frame step forward is built from the existing `tick`.
- The decision overlay shows pressure from the live rusher distance, not a countdown, because a timer would be a simulation rule change.

## 6. Requested data changes (not implemented)

1. `simulationStore.seek(t)` and a backward `stepFrame`, so the timeline can be scrubbed.
2. Optional decision timer, with an auto-resolve action when it runs out.
3. Structured decision and outcome history exposed by the engine store, so the UI does not have to infer it by watching `sim.outcome`.
4. Server-side persistence of session history (new table plus API). Today results live in the browser session only.
5. Per-position season stats on the player model for the performance section. The UI derives them from existing metrics today.

## 7. Verification

`npm run typecheck`, `npm run lint`, and `npm test` pass (35 tests). All five routes return 200 on the dev server. Visual checks at the three breakpoints and contrast measurements in a real browser still need a manual pass.
