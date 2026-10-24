Act as a Principal Product Designer and Senior Front-End Engineer. REDESIGN the UI/UX of my existing Flag Football Management & Route Simulation web app. This is a redesign task only.

### Scope Rules (strict)
- DO change: layout, visual design, design tokens, component styling, motion, interaction patterns, copy/microcopy, accessibility, responsive behavior.
- DO NOT change: backend, database schema, Prisma models, API routes, Zustand store shape, simulation/physics logic, or route/player JSON structures. If a redesign needs new data, list it under "Requested data changes" and do not implement it.
- Keep the existing stack: Next.js (TypeScript), Tailwind CSS, Shadcn UI, react-konva/Canvas, Zustand.
- Refactor existing components in place; keep file names and props stable where possible.

### Existing Product (context)
- Player Profiles: name, position (QB, WR, DB, Rusher), jersey #, speed, agility, catching %, flag-pulling efficiency.
- Top-down 2D field simulation with player dots, route arrows, waypoints, and defender pursuit.
- Mode 1 "View Only Playbook": pick a player + route, press Play, watch the dot run the route.
- Mode 2 "Interactive Decision": simulation pauses at trigger points, user picks an action (Pass to WR, Pump Fake & Scramble, Checkdown), outcome is shown (Completed, Intercepted, Flag Pulled, Turnover).

### Redesign Goals
1. Feel like a modern sports analytics / coaching tool (think a pro team's film-room software), not a generic admin dashboard.
2. Make the field the hero: it should occupy the majority of the screen, with controls and data supporting it, not competing with it.
3. Make the two modes instantly distinguishable and switchable without confusion.
4. Make decision moments tense, clear and fast to act on.
5. Work well on desktop, tablet (sideline coaching use) and mobile.

### Design Direction
- Visual style: [choose one or let me pick: "Dark broadcast/analytics", "Clean light coaching board", "Bold athletic/high-contrast"]. Propose 2 options with a short rationale, then fully design the recommended one.
- Define a design-token system (CSS variables mapped into Tailwind config): color palette (primary, accent, success, danger, warning, neutrals, field greens, team colors), typography scale (display, heading, body, numeric/tabular for stats), spacing, radius, elevation, motion durations/easings.
- Support dark and light themes with proper contrast (WCAG AA minimum).
- Position color-coding: consistent colors/shapes for QB, WR, DB, Rusher used everywhere (cards, field dots, legends).

### Screens & Components to Redesign
1. App shell: navigation (sidebar or top bar), mode switcher (View Only / Interactive), global actions, responsive collapse behavior.
2. Player roster: filterable/sortable grid and list views; player cards with jersey number, position badge, and compact stat bars/radar; empty, loading and error states.
3. Player profile detail/edit: grouped sections (Bio, Athletic Metrics, Performance), inline validation, visual stat meters instead of raw numbers, comparison to team average.
4. Playbook / route library: visual route thumbnails (Slant, Out, Go, Hook, Post), search/filter, quick assign-to-player.
5. Simulation stage (main screen):
   - Field redesign: refined turf with subtle mowing stripes, crisp yard lines and numbers, hash marks, end zones, scrimmage and first-down lines; optional zoom/pan and a yard-range focus.
   - Player dots: clear jersey numbers, position color, selected/hover/active states, speed trail or motion blur, shadow.
   - Route arrows: smooth paths with waypoint handles, cut-angle indicators, arrowheads, and a ghost preview of the full route; offense vs. defense visually distinct.
   - Defender coverage: translucent pursuit cones/lines and distance indicators that update in real time.
   - Playback controls: play/pause, restart, step frame, speed (0.25x–2x), scrubbable timeline with markers for snap, cut, decision point and end of play.
   - Side/bottom panel: selected player stats, live telemetry (speed, distance to defender, time since snap), and play summary.
6. Interactive Decision overlay:
   - Dimmed field with spotlight on the key players when paused.
   - Prominent countdown/pressure indicator (optional decision timer).
   - 2–4 large action buttons with icon, label, and a one-line risk/reward hint; keyboard shortcuts (1/2/3) and touch-friendly sizing.
7. Outcome screen/toast: Completed Pass, Intercepted, Flag Pulled, Turnover, each with a distinct color, icon, animation, a short "why" explanation (e.g., defender separation, throw timing), and "Replay / Try another choice / Next play" actions.
8. Session history / results: list of decisions made, success rate, simple charts.

### UX Requirements
- Clear information hierarchy and progressive disclosure (advanced metrics hidden until needed).
- Motion: purposeful, 150–300 ms UI transitions; respect prefers-reduced-motion.
- Accessibility: keyboard navigable, visible focus, ARIA labels for canvas controls, color-blind-safe palette (do not rely on color alone; use shapes/icons/labels), screen-reader summary of each play outcome.
- Responsive: define layouts for ≥1280px, 768–1279px, and <768px (field first, panels become drawers/bottom sheets).
- Performance: do not degrade the 60 fps canvas animation; avoid unnecessary React re-renders (keep canvas state in refs/Zustand selectors).

### Deliverables (in this order)
1. Redesign audit: bullet list of likely UX/visual problems in the current design and how the redesign fixes each.
2. Two style directions with rationale, then the chosen one.
3. Design tokens: tailwind.config.ts extension + globals.css variables.
4. Information architecture and screen layout wireframes (ASCII or described layouts) for desktop, tablet and mobile.
5. Component inventory: which Shadcn components to use or