# ReachInbox — Enterprise Production-Grade Email Job Scheduler & Dashboard

This repository contains the complete full-stack implementation for the **ReachInbox Hiring Assignment**. It is a restart-safe, multi-tenant email job scheduler and SaaS monitoring dashboard built with TypeScript, Express.js, BullMQ, Redis, PostgreSQL, Prisma, Elasticsearch, Nodemailer (Ethereal Mail), React, Vite, and Tailwind CSS.

---

## ⚡ Absolute Design Guarantees

- **Zero Cron Jobs:** 100% of delayed scheduling relies natively on **BullMQ delayed jobs backed by Redis sorted sets (`ZSET`)**. No `cron`, `node-cron`, `agenda`, or polling loops.
- **Restart Persistence:** Process crashes do not drop or reset jobs. Jobs due while offline execute immediately upon startup; future jobs execute at their exact scheduled time.
- **Atomic Rate Limiting:** Enforces hourly rate limits per sender across concurrent worker instances using an **atomic Redis Lua script**. Jobs exceeding limits are rescheduled to the next hourly window (never dropped or failed).
- **Slack OAuth Alerts:** Triggers automated Slack notifications when a sender's rate limit is hit.
- **Elasticsearch Search Engine:** Sent and scheduled emails are indexed in Elasticsearch with multi-field full-text search, with an automatic fallback to PostgreSQL `ILIKE`.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ or v20 LTS
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and Elasticsearch containers

### 1. Launch Infrastructure
Start PostgreSQL (port 5432), Redis (port 6379), and Elasticsearch (port 9200) using Docker Compose:
```bash
docker-compose up -d
```

### 2. Environment Configuration
Create environment files:
```bash
cp .env.example .env
```

### 3. Install Dependencies & Setup Database
Run the setup script from root:
```bash
# Install backend and frontend dependencies
npm run setup

# Run PostgreSQL database migrations and seed sample data
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..
```

### 4. Run Application Components
Launch all processes concurrently:

```bash
# Option A: Run services in separate terminals
# Terminal 1: API Server
npm run dev:backend

# Terminal 2: BullMQ Worker Process
npm run dev:worker

# Terminal 3: React Frontend Dashboard
npm run dev:frontend
```

Open your browser at:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Live BullMQ Board:** [http://localhost:5000/admin/queues](http://localhost:5000/admin/queues)

---

## 📐 Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (React + Vite)                           |
|  - Real Google OAuth & Instant Demo Login                                        |
|  - Real Slack OAuth Authorization                                                 |
|  - CSV Lead Parser (Client-side validation & duplicate removal)                   |
|  - Scheduled & Sent Email Tables (Paginated, Searchable via Elasticsearch)         |
+----------------------------------------+------------------------------------------+
                                         | HTTP / REST (JWT Cookie)
                                         v
+-----------------------------------------------------------------------------------+
|                              BACKEND API (Express.js)                             |
|  - Auth Controllers (Google ID Token -> HttpOnly Session Cookie)                  |
|  - Email Scheduling Endpoint (Zod Validation -> DB Tx -> Queue Add)               |
|  - Slack OAuth Controller (Exchange Auth Code -> AES-256 Encrypted Storage)        |
|  - Search API (Routes query to Elasticsearch, degrades gracefully to Postgres)    |
|  - BullBoard Dashboard Route (/admin/queues - Protected Session)                  |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
        Transactional |                    | Queue Job          | Sync / Index
        Read / Write|                    | Enqueue            |
                    v                    v                    v
         +------------------+    +------------------+    +------------------+
         |    PostgreSQL    |    |   Redis / BullMQ |    |  Elasticsearch   |
         |  - Users         |    |  - Delayed ZSET  |    |  - email_index   |
         |  - Senders       |    |  - Waiting Queue |    |    (Full text)   |
         |  - Emails        |    |  - Sliding Window|    +------------------+
         |  - Slack Tokens  |    |    Lua Counters  |
         +------------------+    +--------+---------+
                                          |
                                          | Job Pickup (Worker Concurrency = 10)
                                          v
+-----------------------------------------------------------------------------------+
|                               BULLMQ WORKER PROCESS                               |
|  1. Pick up delayed job from Redis ZSET                                           |
|  2. Atomic State Transition in PostgreSQL (QUEUED -> PROCESSING)                  |
|  3. Atomic Redis Sliding-Window Rate Limit Check per Sender (Lua Script)          |
|     |                                                                             |
|     +---> IF LIMIT EXCEEDED:                                                      |
|     |     - Calculate delay until next hourly window                              |
|     |     - Move job to delayed state (DO NOT FAIL OR DROP)                       |
|     |     - Dispatch Slack Notification (if connected & deduplicated)             |
|     |                                                                             |
|     +---> IF WITHIN LIMIT:                                                        |
|           - Execute SMTP send via Nodemailer / Ethereal Mail                      |
|           - Update DB: status = SENT, providerMessageId = Ethereal ID             |
|           - Sync state change to Elasticsearch                                    |
|           - Enforce inter-email minimum delay before releasing worker thread      |
+-----------------------------------------------------------------------------------+
```

---

## 🔒 Idempotency & Delivery Guarantees

1. **Deterministic Job IDs:** BullMQ job ID matches the PostgreSQL Email primary key UUID (`email.id`).
2. **Atomic DB State Lock:** Worker executes `UPDATE emails SET status = 'PROCESSING' WHERE id = $1 AND status IN ('SCHEDULED', 'QUEUED', 'RATE_LIMITED') RETURNING id`. If 0 rows updated, execution halts.
3. **Provider Message ID Tracking:** Ethereal SMTP message ID is stored upon send completion. On retries, existing provider IDs prevent duplicate re-sends.

---

## 📊 Feature Mapping Matrix

| Feature | Backend Source Code | Frontend Source Code |
| :--- | :--- | :--- |
| **No-Cron BullMQ Queue** | `backend/src/queue/emailQueue.ts` | — |
| **Worker Concurrency & Lifecycle** | `backend/src/queue/worker.ts` | — |
| **Atomic Redis Rate Limiter** | `backend/src/services/rateLimiterService.ts` | — |
| **Slack OAuth & Alerts** | `backend/src/services/slackService.ts` | `frontend/src/pages/SettingsPage.tsx` |
| **Elasticsearch & Search Fallback** | `backend/src/services/elasticsearchService.ts` | `frontend/src/components/dashboard/SearchBar.tsx` |
| **Google OAuth & JWT Sessions** | `backend/src/services/authService.ts` | `frontend/src/pages/LoginPage.tsx` |
| **CSV Lead Parser** | — | `frontend/src/hooks/useCsvParser.ts` |
| **Live Queue Dashboard** | `backend/src/app.ts` (`/admin/queues`) | `frontend/src/components/layout/Header.tsx` |

---

## 📽️ Demo & Restart Verification Steps

1. **Login:** Open `http://localhost:3000` and click **"Instant Demo Account Login"** or **"Sign in with Google OAuth"**.
2. **Schedule Sequence:** Click **"Compose Email"**, upload a CSV lead list or paste emails, set start time, spacing (2s), and rate limit (e.g. 5/hr). Click **Schedule**.
3. **Live Queue Monitoring:** Open `http://localhost:5000/admin/queues` to observe delayed and active jobs.
4. **Server Restart Demonstration:**
   - Stop the backend process (`Ctrl+C` in `npm run dev:backend`).
   - Notice Redis retains all delayed jobs in its ZSET.
   - Restart backend (`npm run dev:backend`). Future scheduled emails complete at their exact scheduled time.
5. **Slack Rate Limit Notification:** Connect Slack in settings. Schedule emails exceeding hourly limit. Observe the live Slack alert message arriving in your channel.
