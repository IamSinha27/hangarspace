# Project Guide: HangarSpace 3D Optimizer

An application to ingest LiDAR scans of aircraft hangars and optimize aircraft parking using 3D spatial constraints.

## 🛠 Tech Stack
- **Frontend/UI:** React (Web) or Electron (Desktop) for 3D visualization.
- **3D Engine:** Three.js or Unity (for processing LiDAR point clouds and OBJ meshes).
- **Backend:** Node.js or Python (FastAPI).
- **Optimization Engine:** Python (using `scipy.optimize` or custom heuristic packing algorithms).
- **Data Format:** `.LAS/.LAZ` or `.OBJ` for Hangar scans; JSON for Airplane specs.

## 📏 Core Dimensions & Constraints
- **Hangar Default:** 100ft (L) x 136ft (W) x 28ft (H).
- **Safety Buffer:** Default to 3ft (adjustable) around all aircraft perimeters.
- **Strict Rule:** No wing overlapping (Z-axis stacking) permitted per user safety requirements.
- **Height Check:** Aircraft tail height ($H_{tail}$) must be $< (H_{ceiling\_point} - \text{buffer})$.

## 📋 Development Standards
- **Math Units:** All internal calculations in Meters (convert to Feet for UI).
- **Naming Convention:** `PascalCase` for components, `camelCase` for variables/functions.
- **Performance:** Decimate LiDAR point clouds to < 1 million points for smooth UI rendering.
- **Safety First:** Collision detection must use Bounding Volumes (AABB or OBB) for real-time dragging.

## 🛠 Common Commands
- `npm install` - Install dependencies.
- `npm run dev` - Start local development environment.
- `python optimize.py --input hangar.obj --fleet current_fleet.json` - Run standalone optimization.

## 👨‍🏫 Collaboration Style
- The user is learning system design while shipping real software. Guide like a senior dev mentoring a junior — explain *why* behind every decision, not just *what* to do.
- Surface trade-offs clearly. Don't just recommend — teach the reasoning so the user can make informed calls.
- When introducing a new concept (auth, migrations, ORM, etc.), give a one-paragraph mental model before diving into code.
- Flag when a decision is reversible vs. hard to undo later — juniors often don't know which is which.

## 🏗 Key Workflows
- **Ingestion:** LiDAR scan → Mesh Conversion → Obstruction Mapping.
- **Simulation:** User drags aircraft; system highlights red if $d < \text{buffer}$ or height $z$ exceeds ceiling.
- **Auto-Layout:** Solve for max density using a 2D-bin packing algorithm with 3D height-map validation.
