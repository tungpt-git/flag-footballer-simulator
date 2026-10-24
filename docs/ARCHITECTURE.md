Act as a Principal Full-Stack Software Engineer and UX Designer. Help me architect and build a web-based Flag Football Management & Route Simulation Application.

### Project Goals
1. Manage Flag Football player profiles (attributes, stats, position).
2. Visualize 2D top-down field simulations with moving player dots and route arrows.
3. Support two distinct operational modes: "View Only Mode" and "Interactive Decision Mode".

---

### Tech Stack Specifications
- Frontend: Next.js (TypeScript, React), Tailwind CSS, Shadcn UI
- Simulation & Canvas: HTML5 Canvas API or Konva.js (react-konva)
- State Management: Zustand (for lightweight real-time animation state)
- Backend & DB: Node.js / PostgreSQL with Prisma ORM

---

### Core Module Requirements

1. Player Profile Management
   - Store bio data: Name, Position (QB, WR, DB, Rusher), Jersey #.
   - Store athletic metrics: Speed (m/s or 40-yd dash time), Agility rating (0-100), Catching probability, Flag Pulling efficiency.

2. Route Simulator Engine (Top-Down View)
   - Field Rendering: Top-down green football field with hash marks, yard lines (0 to 50 yards), end zones, and scrimmage line.
   - Waypoint & Vector Arrows: Draw player routes (e.g., Slant, Out, Go, Hook, Post) represented as directional arrows with waypoints/cut angles.
   - Animation Engine: Animate receiver dots running along the route vector based on their profile speed attribute.

3. Two Interactive Modes
   - Mode 1: View Only Playbook Mode
     - Select a player profile and assigned route.
     - Click "Play" to watch the animated receiver dot run the route arrow from snap to end-of-play.
   - Mode 2: Interactive Decision / Tactical Engine
     - Real-time simulation pause/trigger points (e.g., at 2.5 seconds or at the route cut).
     - User decision prompt: Choice of actions (e.g., "Pass to WR", "Pump Fake & Scramble", "Checkdown").
     - Simulation Engine Logic: Calculate defender vector pursuit vs. receiver vector position. Evaluate success rate based on receiver speed, defender distance, and throw timing. Display outcome (Completed Pass, Intercepted, Flag Pulled, Turnover).

---

### Key Deliverables
- Provide a modular project directory structure.
- Define the JSON data structures for Player Profiles, Routes, and Game Simulation Frames.
- Write functional code for the 2D Canvas component showing field, receiver dot animation along route vectors, and defender coverage pursuit.