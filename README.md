# HangarSpace — 3D Aircraft Hangar Optimizer

A web application for FBO operators to plan and optimize aircraft parking inside hangars. Drag aircraft into a 3D hangar, get real-time collision detection, and save layouts for your team.

---

## Features

**3D Editor**
- Interactive Three.js hangar scene — drag, rotate, and position aircraft in real time
- Collision detection using the Separating Axis Theorem (SAT) — fuselage, wing, height, and boundary violations all flagged with distinct colours
- Roof profiles: flat, gabled, and arched — height clearance checked per aircraft per position
- Adjustable safety buffer around each aircraft
- Lock layout mode — freezes all aircraft in place to prevent accidental moves
- Keyboard shortcuts: `R` rotate, `Delete` remove, `Ctrl+C/V` copy-paste

**Fleet Management**
- Define your aircraft fleet with full dimensional specs (length, wingspan, tail height, wing root height, wing type, elevator span)
- Add, edit, and remove aircraft types; clear the entire fleet with cascade cleanup of hangar layouts

**Multi-Tenant Auth**
- Organisation-scoped data — each FBO sees only its own hangars and fleet
- JWT authentication with email/password login and registration
- FBO logo upload (base64), org name, and profile management
- Password visibility toggle on login

**Dashboard**
- Create and manage multiple hangars
- Inline rename hangar cards
- Profile avatar with org name and dropdown (Edit Profile / Log out)

**Backend**
- FastAPI + SQLAlchemy async + PostgreSQL
- Alembic migrations for schema changes
- Per-request structured logging with `org_id` context — every log line is tagged with the requesting org so you can grep by tenant in production
- Full test suite: 30 backend tests covering auth, fleet, hangars, org isolation, and unauthenticated access

**Frontend Tests**
- 80+ tests with Vitest + React Testing Library
- SAT collision logic tested in isolation with 31 unit tests
- Login, ConfirmDialog, and component behaviour covered

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Three.js (`@react-three/fiber`, `@react-three/drei`), Zustand |
| Backend | FastAPI, SQLAlchemy (async), asyncpg, Alembic |
| Database | PostgreSQL |
| Auth | JWT (`python-jose`), bcrypt |
| Testing | Vitest + React Testing Library (frontend), pytest-asyncio + httpx (backend) |

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL running locally

### Frontend
```bash
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export JWT_SECRET=your-secret-key
export DATABASE_URL=postgresql+asyncpg://user@localhost:5432/hangarspace

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```
Runs on `http://localhost:8000`.

### Running Tests

**Backend:**
```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

**Frontend:**
```bash
npm run test
```

---

## Project Structure

```
├── src/
│   ├── components/       # Three.js scene components (Hangar, Aircraft, FloorPlane)
│   ├── pages/            # Route-level pages (Dashboard, Editor, Fleet, Profile, Login)
│   ├── store/            # Zustand store + collision detection logic
│   ├── ui/               # Shared UI components (Sidebar, StatusBar, modals)
│   ├── api/              # API client functions
│   └── tests/            # Frontend test suite
└── backend/
    ├── app/
    │   ├── routers/      # FastAPI route handlers (auth, hangars, fleet)
    │   ├── auth/         # JWT utilities and dependencies
    │   ├── models.py     # SQLAlchemy ORM models
    │   ├── middleware.py # Request logging middleware
    │   └── context.py   # ContextVar for per-request org_id
    ├── alembic/          # Database migrations
    └── tests/            # Backend test suite
```

---

## Deployment

Recommended split:

- **Frontend** → Vercel (static build, CDN, preview deployments per branch)
- **Backend + Postgres** → Railway (persistent server, managed Postgres, built-in log viewer)

Set `VITE_API_URL` on the frontend to point at the deployed backend URL, and configure `DATABASE_URL` and `JWT_SECRET` on Railway via environment variables. Run `railway run alembic upgrade head` after each schema-changing deploy.
