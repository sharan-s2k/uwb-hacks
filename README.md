# CivicFix

AI-powered civic issue reporting and routing platform. Residents report local problems (potholes, broken streetlights, flooding, etc.) via text or voice; Gemini AI classifies and routes each report to the correct city agency automatically.

## Architecture

### Monolith image (Docker / Digital Ocean)
```
port 8080
  nginx  ──┬── /api/*  →  FastAPI  (uvicorn :8000, internal)
            └── /*      →  Next.js  (node    :3000, internal)
supervisord manages both processes in one container
PostgreSQL  — separate managed DB (DO Managed Database or local)
```

### Local dev (without Docker)
```
frontend/   Next.js 14 (TypeScript)  — port 3000
backend/    FastAPI (Python 3.12)    — port 8000
            PostgreSQL 16            — port 5432
```

---

## Running Locally (dev mode)

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16 running locally (or use Docker for just the DB)

### 1. Clone and configure

```bash
git clone <repo-url>
cd uwb-hacks
cp .env.local .env
# Fill in .env with your Auth0, Gemini, and ElevenLabs credentials
```

### 2. Start the database (Docker shortcut)

```bash
docker compose up db -d
```

### 3. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Running with Docker (production-like)

### Prerequisites

- Docker 24+ and Docker Compose v2

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set POSTGRES_PASSWORD and any API keys you have
```

### 2. Build and start all services

```bash
docker compose up --build
```

This starts three containers:

| Container  | Port | Description               |
|------------|------|---------------------------|
| `db`       | 5432 | PostgreSQL database        |
| `backend`  | 8000 | FastAPI API server         |
| `frontend` | 3000 | Next.js production server  |

### 3. Open the app

```
http://localhost:3000
```

### Useful commands

```bash
# Run in the background
docker compose up --build -d

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and remove the database volume (full reset)
docker compose down -v
```

---

## Environment Variables

| Variable              | Required | Description                               |
|-----------------------|----------|-------------------------------------------|
| `POSTGRES_DB`         | Yes      | Database name                             |
| `POSTGRES_USER`       | Yes      | Database user                             |
| `POSTGRES_PASSWORD`   | Yes      | Database password                         |
| `AUTH0_DOMAIN`        | Yes      | Auth0 tenant domain                       |
| `AUTH0_AUDIENCE`      | Yes      | Auth0 API audience (JWT validation)       |
| `AUTH0_CLIENT_ID`     | Yes      | Auth0 SPA client ID (frontend)            |
| `GEMINI_API_KEY`      | Yes      | Google Gemini API key (AI triage)         |
| `ELEVENLABS_API_KEY`  | No       | ElevenLabs key (voice TTS — Phase 5)      |

---

## Project Structure

```
uwb-hacks/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              Root layout + nav
│   │   ├── page.tsx                Home page
│   │   ├── report/page.tsx         Manual report form
│   │   ├── report/voice/page.tsx   Voice report flow
│   │   ├── dashboard/
│   │   │   ├── citizen/page.tsx    Resident "My Issues"
│   │   │   └── agency/page.tsx     Agency Kanban board
│   │   └── tickets/[id]/page.tsx   Ticket detail (role-aware)
│   ├── components/
│   │   ├── ReportForm.tsx          Manual report form component
│   │   ├── VoiceReporter.tsx       Voice report UI
│   │   ├── KanbanBoard.tsx         Agency Kanban
│   │   ├── TicketCard.tsx          Ticket card
│   │   ├── TicketDetail.tsx        Ticket detail view
│   │   ├── SeverityBadge.tsx       Severity indicator
│   │   └── StatusBadge.tsx         Status indicator
│   └── lib/
│       ├── types.ts                Shared TypeScript types
│       ├── api.ts                  API client helpers
│       └── auth.ts                 Auth0 helpers
└── backend/
    ├── app/
    │   ├── main.py                 FastAPI app + CORS
    │   ├── config.py               Settings (pydantic-settings)
    │   ├── database.py             SQLAlchemy engine + session
    │   ├── auth/                   JWT middleware, permissions
    │   ├── tickets/                Models, schemas, routes, service
    │   └── seed/                   Demo data seeding script
    ├── requirements.txt
    └── Dockerfile
```

---

## Deploying to Digital Ocean App Platform

### 1. Push the image to a registry

```bash
# Build the monolith image
docker build -t civicfix .

# Tag and push to Docker Hub (or DO Container Registry)
docker tag civicfix your-dockerhub-user/civicfix:latest
docker push your-dockerhub-user/civicfix:latest
```

Or use the DO Container Registry:
```bash
doctl registry create civicfix-registry
docker tag civicfix registry.digitalocean.com/civicfix-registry/civicfix:latest
docker push registry.digitalocean.com/civicfix-registry/civicfix:latest
```

### 2. Create a Managed PostgreSQL database

In the DO console: **Databases → Create → PostgreSQL 16**.  
Copy the connection string — you'll need it as `DATABASE_URL`.

### 3. Create an App on App Platform

1. Go to **App Platform → Create App**
2. Select your container registry and image
3. Set **HTTP port** to `8080`
4. Add these environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | From your managed DB (use the private network URL) |
| `AUTH0_DOMAIN` | Your Auth0 tenant |
| `AUTH0_AUDIENCE` | Your Auth0 API audience |
| `AUTH0_CLIENT_ID` | Your Auth0 client ID |
| `GEMINI_API_KEY` | Your Gemini API key |
| `ELEVENLABS_API_KEY` | Your ElevenLabs key |

DO injects `PORT=8080` automatically — the app reads this to configure nginx.

### 4. Test locally with the monolith image first

```bash
cp .env.example .env
# Fill in .env
docker compose up --build
# Open http://localhost:8080
```

---

## API Reference

| Method | Path                           | Description                      |
|--------|--------------------------------|----------------------------------|
| GET    | `/health`                      | Health check                     |
| POST   | `/api/reports/manual`          | Submit a manual report           |
| POST   | `/api/reports/voice/finalize`  | Submit a voice transcript report |
| GET    | `/api/agency/tickets`          | Agency-scoped ticket list        |
| PATCH  | `/api/tickets/{id}/status`     | Update ticket status             |
| GET    | `/api/tickets/public`          | Public sanitized issue board     |
| GET    | `/api/dashboard/admin-summary` | Admin stats                      |

Interactive docs available at `http://localhost:8000/docs` when the backend is running.
