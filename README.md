# Smart Sports Analytics Platform

Big Data lab project (23N710): FastAPI backend + React frontend over **MongoDB** and **Neo4j**,
using the data models from the lab report (Exp 5 MongoDB collections, Exp 6 Neo4j graph).

## Setup

### 1. Backend
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env      # then fill in the passwords / Neo4j URI
.venv/bin/uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Click **Load sample data** to seed both databases
(or run `.venv/bin/python -m app.seed` from `backend/`).

## Data

| Database | Contents |
|---|---|
| MongoDB (`smart_sports`) | `players`, `training_centers` (2dsphere index), `training_sessions`, `sensor_telemetry`, `media_highlights` |
| Neo4j | `(:Coach)-[:COACHES]->(:Player)-[:PLAYS_FOR]->(:Team)` |

Both databases use the same player IDs (`P101`–`P105`), which is the key used to
integrate the two sources.

## API
- `GET  /api/health` – connection status of each database
- `POST /api/seed` – reload sample data into both databases
- `GET  /api/mongo/overview` – collection counts + players
- `GET  /api/neo4j/overview` – node/relationship counts + players with team and coach
