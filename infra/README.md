# Infra notes

Сводный статус репозитория, соответствие исходному плану и быстрые пути: [../docs/PROJECT_STATUS.md](../docs/PROJECT_STATUS.md).

Production-style routing:

- `api.domain.com` → reverse proxy to FastAPI (`backend`, port 8000 in compose).
- `app.domain.com` → static or CDN for `frontend-app` build.
- `admin.domain.com` → static or CDN for `frontend-admin` build.

Local compose exposes:

- API: `http://localhost:8000`
- App: `http://localhost:3000`
- Admin: `http://localhost:3001`

Optional TLS termination lives outside this repo (e.g. cloud load balancer or Traefik).
