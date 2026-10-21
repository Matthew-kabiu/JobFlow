# Docker development

JobFlow runs entirely from repository code: React/Vite in `code/frontend/`,
Fastify/TypeScript in `code/backend/`, and shared API types in `code/shared/`.
Node 22 is required. No n8n instance, webhook URL, database, or employer posting
service is needed. Himalayas and Jobicy work without credentials.

All Docker builds use `./code` as their context. Dockerfiles reference
`frontend/`, `backend/`, and `shared/` relative to that context. The production
Nginx template lives at `code/frontend/nginx.conf`. Both Compose files stay at
the repository root.

## Configuration

Create or update the root, gitignored `.env.development` with your approved
values. This implementation does not create or modify any environment file.

| Variable | Purpose |
| --- | --- |
| `FRONTEND_PORT` | Available host port for the browser |
| `VITE_DEV_PORT` | Vite's internal container port |
| `BACKEND_PORT` | Backend's internal container port; no host port is published |
| `BACKEND_HOST` | Backend bind address; use the all-interfaces bind address for Docker |
| `HIMALAYAS_API_KEY` | Optional free key for an individual API allowance; backend only |
| `RELIEFWEB_APPNAME` | Optional, pre-approved application name; omit to keep ReliefWeb disabled |

The all-interfaces bind address is `0.0.0.0`. Choose valid TCP port numbers for
the three port variables. Browser and Vite ports may differ. Provider credentials
must never use the `VITE_` prefix. The former `VITE_N8N_WEBHOOK_URL` is unused.

Only the backend reads the root environment file. The frontend receives the
non-secret port settings and its internal `BACKEND_ORIGIN` from Compose.
The browser calls same-origin `/api/v1/*`; Vite proxies those requests to Fastify.

## Start and stop

Run from the repository root:

```bash
DOCKER_BUILDKIT=1 docker compose --env-file .env.development -f docker-compose.dev.yml up --build -d
docker compose --env-file .env.development -f docker-compose.dev.yml logs -f backend frontend
docker compose --env-file .env.development -f docker-compose.dev.yml down
```

Open `http://localhost:${FRONTEND_PORT}`, substituting your configured port.
The backend healthcheck must pass before the frontend starts. A healthy backend
means the HTTP service is running; individual providers can still be unavailable.

## Hot reload

- `code/frontend/` mounts at `/app/frontend`; Vite polling and Fast Refresh
  propagate source edits through the browser-facing HMR port.
- `code/backend/` mounts at `/app/backend`; `tsx watch` restarts the API on edits.
- Shared types mount at `/app/shared` in both containers.
- Anonymous dependency volumes isolate each container's Linux `node_modules`
  from host dependencies.

After changing either package manifest or lockfile, rebuild and refresh dependency
volumes. Restart/recreate containers after changing environment values.

```bash
DOCKER_BUILDKIT=1 docker compose --env-file .env.development -f docker-compose.dev.yml up --build --renew-anon-volumes -d
```

## Checks

```bash
docker compose --env-file .env.development -f docker-compose.dev.yml config --quiet
docker compose --env-file .env.development -f docker-compose.dev.yml exec backend npm run typecheck
docker compose --env-file .env.development -f docker-compose.dev.yml exec backend npm test
docker compose --env-file .env.development -f docker-compose.dev.yml exec frontend npm run lint
docker compose --env-file .env.development -f docker-compose.dev.yml exec frontend npx tsc --noEmit -p tsconfig.app.json
docker compose --env-file .env.development -f docker-compose.dev.yml exec frontend npx tsc --noEmit -p tsconfig.node.json
docker compose --env-file .env.development -f docker-compose.dev.yml exec frontend npm test
```

Tests use fixtures and do not call external providers. The explicit opt-in
`test/live-smoke.ts` in the backend performs real public provider requests and is
not part of `npm test`. Do not repeatedly run it: restarts discard provider caches.

## Production configuration

`docker-compose-prod.yml` builds the API and SPA separately. Configure `PORT`
(browser-facing frontend port), `BACKEND_PORT`, `BACKEND_HOST`, and any approved
optional provider settings in the root production environment. Only the frontend
is host-published. Nginx substitutes `BACKEND_ORIGIN` into its template at startup
and forwards `/api/` without the SPA fallback. Production builds require owner
approval; the build definitions do not imply a deployment has been performed.

Backend proxy trust is exactly one hop. Keep the API private behind Vite/Nginx;
publishing it directly would change that trust boundary. Nginx overwrites the
forwarded client address rather than trusting browser-supplied forwarding headers.
Recreate the frontend along with a replaced backend so Nginx resolves its current
service address.

See [BACKEND.md](BACKEND.md) for endpoints, provider behavior, and current limits.
Verbatim build templates and the provider decision record remain in gitignored
`docs/PRIVATE/` and are excluded from Docker builds.
