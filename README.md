# CivicFix

AI-powered civic issue reporting and routing platform. Residents report local problems (potholes, broken streetlights, flooding, etc.) via text or voice; a local Ollama-hosted Gemma model classifies and routes each report to the correct city agency automatically.

## Project Story

### Inspiration
Residents often see civic issues like potholes, broken streetlights, overflowing trash, flooding, or unsafe sidewalks, but they may not know which government department to contact. CivicFix is built to make reporting simple: describe the issue once, and let the system collect the right details, structure the report, and route it.

### What It Does
CivicFix lets residents report civic issues through either a form or a multilingual voice agent. The ElevenLabs voice agent asks follow-up questions in the user’s chosen language and captures report context. A locally hosted Gemma model then analyzes the report, classifies the issue, estimates severity, and creates a structured ticket. Tickets can be assigned, moved, and forwarded between departments when ownership overlaps.

### How We Built It
We built CivicFix as a web app with a resident reporting flow, a voice-reporting flow, a ticket system, and agency dashboards. ElevenLabs powers voice intake, while Gemma (through Ollama) structures raw reports into ticket data. The dashboard supports operational workflows such as viewing, updating, moving, and coordinating ticket handling across departments.

### Challenges We Ran Into
One major challenge was adapting our original architecture goals as implementation progressed. We initially planned deeper authentication and routing layers, but prioritized working end-to-end flows first: AI ticket generation, multilingual voice intake, and department coordination. Another challenge was balancing resident-friendly reporting with operationally useful ticket detail for agencies.

### Accomplishments We’re Proud Of
We’re proud CivicFix became more than a basic complaint form. It now supports multilingual voice reporting, locally hosted AI processing, structured ticket generation, and cross-department coordination workflows including reassignment and assistant-driven operations.

### What We Learned
We learned civic reporting is not just about collecting complaints. The harder technical problem is collecting the right context, formatting it consistently, and routing it quickly to the right operational team. We also learned voice-first flows significantly improve accessibility and inclusion for diverse communities.

### What’s Next for CivicFix
Next steps include adding more roles (especially field workers), richer status tracking, map-based issue views, duplicate issue detection, stronger notification workflows, real government integrations, and deeper analytics for workload, response time, and service outcomes.

---

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
ollama      Gemma model runtime      — port 11434
```

---

## Running Locally (dev mode)

### Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16 running locally (or use Docker for just the DB)
- Ollama installed locally with model pulled (`ollama pull gemma4:e2b`)

### 1. Clone and configure

```bash
git clone <repo-url>
cd uwb-hacks
cp .env.example .env
# Fill in .env with your Auth0/Ollama/ElevenLabs values
```

### 2. Start local LLM and database

Start Ollama:
```bash
ollama run gemma4:e2b
```

Start PostgreSQL (Docker shortcut):

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
cp .env.local .env
# Edit .env — at minimum set POSTGRES_PASSWORD and any API keys you have
```

### 2. Build and start all services

```bash
docker compose up --build
```

This starts two containers:

| Container  | Port | Description               |
|------------|------|---------------------------|
| `db`       | 5432 | PostgreSQL database        |
| `app`      | 8080 | Monolith (nginx + FastAPI + Next.js) |

Uploaded images are stored under `backend/uploads` on your host and served by backend at `/uploads/<filename>`.

### 3. Open the app

`http://localhost:8080`

### Useful commands

```bash
# Run in the background
docker compose up --build -d

# View logs
docker compose logs -f

# View logs for app service
docker compose logs -f app

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
| `DATABASE_URL`        | Yes      | Full PostgreSQL connection string         |
| `OLLAMA_BASE_URL`     | Yes      | Ollama server URL (e.g. `http://localhost:11434`) |
| `OLLAMA_MODEL`        | Yes      | Ollama model name (e.g. `gemma3:4b` or `gemma:2b`) |
| `ELEVENLABS_AGENT_ID` | No       | ElevenLabs Conversational AI agent ID (optional for voice flow)  |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | No       | Voice agent ID exposed to frontend                                |
| `NEXT_PUBLIC_API_URL` | No       | Backend API base URL for split local dev; leave empty for monolith |
| `AUTH0_DOMAIN`        | No       | Auth0 tenant domain (not used in dev stub mode)                  |
| `AUTH0_AUDIENCE`      | No       | Auth0 API audience (not used in dev stub mode)                   |
| `AUTH0_CLIENT_ID`     | No       | Auth0 SPA client ID (not used in dev stub mode)                  |

---

## Voice Agent Setup (ElevenLabs)

The voice report flow uses an ElevenLabs Conversational AI agent for the STT + TTS conversation. After the conversation ends, the full transcript is passed to Gemma for triage and location extraction — the same pipeline as manual reports.

### 1. Create an ElevenLabs account

Sign up at [elevenlabs.io](https://elevenlabs.io) and navigate to **Conversational AI → Agents**.

### 2. Create a new agent

1. Click **Create Agent**
2. Give it a name (e.g. `CivicFix Reporter`)
3. Set the **System Prompt** to instruct it to collect civic issue details. Example:

```
You are a friendly civic assistant helping residents report local issues.
Ask the resident to describe the problem, its exact location (street address or nearby landmark),
and how long it has been present. Keep questions short and conversational.
When you have enough information, say goodbye and end the conversation.
```

4. Choose a voice and configure language settings as needed
5. Click **Save**

### 3. Copy the Agent ID

After saving, the agent detail page shows an **Agent ID** in the format `agent_xxxxxxxxxxxx`. Copy it.

### 4. Configure the environment

**Root `.env`** (used by backend and Docker app container):
```bash
ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxx
NEXT_PUBLIC_API_URL=
```

**`frontend/.env.local`** (optional for split local dev with `npm run dev`):
```bash
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Why two files?** Next.js only exposes `NEXT_PUBLIC_*` variables that were present in the `frontend/` directory at build time. Variables in the project root `.env` are not visible to the browser bundle.

### 5. Allow microphone access

The voice page uses the browser's microphone via the ElevenLabs SDK. When prompted by the browser, click **Allow**. HTTPS is required in production (Digital Ocean App Platform handles this automatically).

### 6. Test the voice flow

1. Open `http://localhost:3000/report/voice`
2. Click **Start Voice Report**
3. Speak your issue naturally — the agent will ask follow-up questions
4. Click **End & Continue** when done
5. Optionally attach a photo, then click **Submit Report**
6. The transcript is sent to Gemma for triage; location is extracted from the transcript automatically

---

## Local Testing (End-to-End)

### 1) Start services
```bash
# Terminal A
ollama run gemma:2b

# Terminal B (project root)
docker compose up --build
```

### 2) Verify health and model availability
```bash
curl -i http://localhost:8080/health
curl -s http://localhost:11434/api/tags
```

Expected:
- `/health` returns `200` with `{"status":"ok"}`
- `/api/tags` includes `gemma4:e2b` (or your configured model)

### 3) Test manual report submission API
```bash
curl -s -X POST "http://localhost:8080/api/reports/manual" \
  -F "description=Large pothole near Main Street and 4th Avenue. Cars are swerving." \
  -F "location=Main Street and 4th Avenue"
```

Expected:
- JSON includes `ticket.id`, `ticket.ticket_number`, `ticket.category`, `ticket.severity`, `ticket.status`

### 4) Verify DB persistence
```bash
docker compose exec db psql -U civicfix -d civicfix -c \
"SELECT ticket_number, title, category, severity, status, routing_status, assigned_agency_id, created_at
 FROM tickets ORDER BY created_at DESC LIMIT 5;"
```

Expected:
- New ticket row appears after each successful submission

### 5) Test via UI
- Open `http://localhost:8080/report`
- Submit form with description + location (+ optional image)
- Confirm success card appears
- Re-run DB query above and confirm the new ticket is stored

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
| `OLLAMA_BASE_URL` | Local Ollama URL (`http://host.docker.internal:11434` in Docker) |
| `OLLAMA_MODEL` | Local model name (match your `.env` value) |
| `ELEVENLABS_API_KEY` | Your ElevenLabs key |

DO injects `PORT=8080` automatically — the app reads this to configure nginx.

### 4. Test locally with the monolith image first

```bash
cp .env.local .env
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
| GET    | `/api/tickets/my`              | Current user's submitted tickets |
| GET    | `/api/agency/tickets`          | Agency-scoped ticket list        |
| GET    | `/api/agencies`                | Registered agency list           |
| PATCH  | `/api/tickets/{id}/status`     | Update ticket status             |
| GET    | `/api/tickets/public`          | Public sanitized issue board     |

Interactive docs available at `http://localhost:8000/docs` when the backend is running.
