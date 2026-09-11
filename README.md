# Word Antakshari

A personal, two-player online word-chain game. This repository currently contains the working infrastructure foundation only. Rooms, word validation, turns, timers, scoring, rounds, and history are not implemented yet.

## Structure

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS, responsive landing page, and HTTP health route.
- `backend/`: Express and Socket.IO server, environment validation, Prisma/PostgreSQL and Redis connections, readiness/liveness routes, and graceful shutdown.
- `backend/prisma/`: Prisma schema and configuration. No game models or migrations yet.
- `nginx/`: Frontend/API routing and Socket.IO polling/WebSocket proxy configuration.
- `docker-compose.yml`: All five services on a single Docker host.

The browser connects only to Nginx. Nginx forwards `/` to frontend:3000, `/api/` to backend:4000 (removing `/api`), and `/socket.io/` to backend:4000. Only Nginx publishes a host port. PostgreSQL and Redis use an internal data network; the backend connects to both networks. Frontend and backend containers run as the unprivileged Node user.

All future game rules must live in the backend: turn ownership, word validity, reused words, timer deadlines, scoring, and round results. PostgreSQL will hold durable history; Redis will hold active game state. The client will display server state and submit player intents.

## Run the full stack

Requirements: Docker Engine and the Docker Compose v2 plugin. Local package commands additionally require Node.js 22.12+ and npm.

```bash
cp .env.example .env
# Edit .env and set a unique POSTGRES_PASSWORD (URL-safe characters).
docker compose config --quiet
docker compose build
docker compose up -d --wait --wait-timeout 180
docker compose ps
```

Open <http://localhost:8080>. `.env` is ignored by Git. The initial setup created a local `.env` with a randomly generated database password. Keep it private. `POSTGRES_USER`, `POSTGRES_DB`, and the password must use URL-safe characters because Compose constructs the database URL. Changing these settings does not update credentials in an already initialized PostgreSQL volume.

For separate phones, set `APP_ORIGIN` to the exact shared browser URL (for example `http://192.168.1.20:8080` on your LAN), including scheme and port, without a trailing slash, then run `docker compose up -d`. `HTTP_PORT` controls the host port and defaults to 8080. Do not use `localhost` on the phones to reach the host.

For the single Ubuntu/EC2 deployment, install Docker/Compose, copy the repository and private `.env`, and use the same commands. Allow inbound traffic only to the chosen Nginx port (and your restricted administrative SSH access). HTTPS/domain/certificate configuration is a separate deployment step; this foundation serves HTTP. No managed databases or additional machines are required.

## Verify

```bash
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/health
curl --fail http://localhost:8080/api/health
curl --fail http://localhost:8080/api/health/live
curl --fail http://localhost:8080/nginx-health
npm --prefix frontend ci
npm --prefix frontend run verify:stack
docker compose exec nginx nginx -t
docker compose ps
docker compose logs --tail=50
```

The smoke script verifies the frontend HTML, all health endpoints, PostgreSQL/Redis readiness, both Socket.IO transports through Nginx, and rejection of an unconfigured browser origin. Set `STACK_URL` to the configured `APP_ORIGIN` when using a different address.

`/api/health` returns 200 only when a Prisma SQL query and Redis PING succeed; it returns 503 for dependency failures. `/api/health/live` reports that the HTTP process is alive. Frontend `/health` and `/nginx-health` check those processes independently. Compose waits for database/cache health before backend startup, and for both applications before Nginx startup. Docker health checks report failures; restart policies restart exited processes, not merely unhealthy containers.

## Dependencies and builds

```bash
npm --prefix frontend ci
npm --prefix backend ci
npm --prefix backend run generate
npm --prefix backend run db:validate
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

Both applications have separate lockfiles. Backend dependency overrides select patched `deepmerge-ts` and `mysql2` versions for Prisma CLI transitive dependencies; recheck these overrides when upgrading Prisma. Prisma generation runs during the backend Docker build. The schema intentionally has no game tables yet; readiness checks use `SELECT 1`. When game models are added, create and commit a migration with `prisma migrate dev`, then apply it with `prisma migrate deploy` before starting the updated backend. The backend runtime image only copies compiled application code and production dependencies; run migrations from an environment with the Prisma schema, CLI, and network access to PostgreSQL (for example the Dockerfile `build` stage).

For local frontend iteration, run `npm --prefix frontend run dev`. To run the backend outside Docker, provide `DATABASE_URL`, `REDIS_URL`, and `APP_ORIGIN` in `backend/.env`, generate Prisma, and run `npm --prefix backend run dev`. Compose database/cache ports are deliberately not published; the complete Compose stack is the default development environment. After source changes, use `docker compose up -d --build --wait`.

## Operations and scope

```bash
docker compose logs -f backend
docker compose restart backend
docker compose down
```

`docker compose down` retains the PostgreSQL named volume. Adding `--volumes` deletes persistent database data. Redis persistence is disabled: active state is lost on Redis restart, as intended for this initial temporary-state setup. A later game implementation must handle interrupted matches.

The landing page uses a fluid layout, wrapping content, and the device viewport for approximately 320px-wide phones and larger screens. It does not display inactive play buttons. Socket.IO connectivity is installed and verified but has no gameplay events yet. There is no authentication, AI, leaderboard, payment integration, or playable game in this first task.

## Foundation verification (2026-09-08)

Installed both dependency sets, validated Prisma, passed both TypeScript checks and production builds, built both Docker images, and started all five containers healthy. HTTP and Socket.IO smoke checks passed through Nginx. Stopping Redis and PostgreSQL separately produced HTTP 503 readiness responses; restoring each service recovered health. Chromium checks at 320, 375, 768, and 1280px found no horizontal overflow or page errors. Both npm audits reported zero vulnerabilities after the documented overrides.

This host's Compose reports that Buildx/Bake is unavailable, then successfully builds with the standard Docker builder. No Buildx installation is required for the commands above.

Framework setup references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), and [Prisma 7 setup changes](https://docs.prisma.io/docs/orm/v6/more/upgrades/to-v7).
