# AgroDoc-System V2.0

Modular monolith for container registry, application processing, and document generation.

**Ориентация по проекту (план, статус, пути, что дальше):** см. [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

## Domains

- `api.domain.com` - FastAPI backend
- `app.domain.com` - user web app
- `admin.domain.com` - admin web app

## Stack

- Backend: Python, FastAPI, SQLAlchemy, Alembic
- DB: PostgreSQL 15
- Queues: RabbitMQ + Celery
- Frontend: React (`frontend-app`, `frontend-admin`)

## Local run

1. Create `.env.local` from `.env.example`
2. Run:

```bash
make up
```

3. API is available at `http://localhost:8000`
4. Web UI: `http://localhost:3000` (app), admin: `http://localhost:3001`

## Frontend (React + Vite)

Shared styles live in `shared-ui/styles/theme.css` and `shared-ui/styles/shell.css` (sidebar, pager, empty states). Shared **API client** (Bearer token, `sessionStorage`) lives in `shared-ui/src/apiClient.ts` and is wired from each app’s `src/lib/api.ts`. TypeScript includes `shared-ui/src` (e.g. `NavIcons.tsx`); run **`cd shared-ui && npm install`** once so `shared-ui/node_modules` exists and `tsc -b` resolves `react` types for those files (Docker build runs `npm ci` in `shared-ui` before the app build). **Login** is at `/login` (app: without shell header; admin: same). Protected routes use JWT; public lookups `GET` on the server stay unauthenticated, but the admin UI loads them with the token when logged in. User app: **list of applications** (filter by status, pagination) and **application detail** (revisions and audit tabs).

```bash
cd frontend-app && npm install && npm run dev
```

```bash
cd frontend-admin && npm install && npm run dev
```

Set `VITE_API_BASE_URL` to your API (see `frontend-app/.env.example` and `frontend-admin/.env.example`). Docker build passes the same variable (default `http://localhost:8000` for browser → host API).

## API (selected)

- `POST /auth/token` — body `{ "login", "password" }` (passwords use bcrypt; в миграциях сиды: **`e2e_admin` / `testpass1`**, для быстрого ручного теста — **`admin` / `admin`**, не использовать в production); ответ содержит `access_token`, `refresh_token`, `expires_in`, `refresh_expires_in`, `account`
- `POST /auth/refresh` — body `{ "refresh_token" }` (без `Authorization`); новая пара токенов и `account` (ротация сессии в таблице `auth_refresh_sessions`)
- `POST /auth/logout` — body `{ "refresh_token" }`; отзыв refresh-сессии на сервере (идемпотентно `204`)
- `POST /auth/change-password` — смена своего пароля (`Authorization: Bearer`), тело `{ "current_password", "new_password" }`; все refresh-сессии учётки отзываются
- `GET /auth/me` — `Authorization: Bearer <access_token>`
- `POST /admin/accounts` — создание учётки (admin); `PATCH /admin/accounts/{uuid}`; `POST /admin/accounts/{uuid}/set-password` — сброс пароля админом
- `GET /lookups/roles`, `GET /lookups/statuses`, `GET /lookups/source-types`, `GET /lookups/file-types`
- `POST /lookups/roles` — `Authorization: Bearer…` with role `admin`, or (if `AUTH_BYPASS_HEADERS=true`) `X-User-Roles: admin`
- `GET /applications` — list with `page`, `page_size`, optional `status_code`, `created_from`, `created_to` (requires auth)
- `GET /applications/{uuid}/revisions` — пагинация: ответ `{ "items", "total", "page", "page_size" }`, query `page`, `page_size` (1–100, по умолчанию 20)
- `GET /applications/{uuid}/audit-logs` — тот же формат пагинации
- `GET /applications/{uuid}/revisions/adjacent/{version}` — текущая и предыдущая ревизия по номеру версии (для диффа UI без опоры на соседнюю строку страницы списка)
- `GET /applications/{uuid}/allowed-status-targets` — целевые статусы для текущего пользователя и состояния заявки
- `GET /files?entity_type=…&entity_uuid=…` — list file records for an entity (no `storage_path` in JSON)
- `POST /files` — multipart upload; `GET /files/{uuid}/download` — same auth rules as other write/read APIs
- `GET /audit-logs` — query `limit`, `offset`, optional `entity_type` (requires auth)
- `GET /admin/accounts` — list accounts, **admin** only

## File storage

- `FILES_STORAGE_BACKEND=local` (default): `FILES_STORAGE_ROOT` (e.g. `/data/files` in Docker); DB stores absolute path; `GET /files/{uuid}/download` reads via the same backend.
- `FILES_STORAGE_BACKEND=s3`: set `S3_BUCKET`, `S3_REGION`, optional `S3_ENDPOINT_URL` (MinIO). Objects are stored as `s3://bucket/key` in `files.storage_path`.

## Tests

PostgreSQL must be reachable with the same `DATABASE_URL` as the app (for example via `docker compose up -d postgres`).

```bash
cd backend
alembic upgrade head
pytest -q
```

In Docker:

```bash
make migrate
make test
```

## E2E (Playwright)

With API on port 8000 (and optionally app/admin on 3000/3001 after `make up`):

```bash
cd e2e
npm install
npx playwright install chromium
npx playwright test
```

The `ui-optional-landing` specs skip themselves if the frontends are not reachable. `ui-login-applications` performs login on the user app (`PLAYWRIGHT_APP_URL`, default `http://127.0.0.1:3000`) with `PLAYWRIGHT_E2E_LOGIN` / `PLAYWRIGHT_E2E_PASSWORD` (defaults match the seeded `e2e_admin` account) and skips if the app is down. `ui-login-admin-users` does the same on the admin app (`PLAYWRIGHT_ADMIN_URL`, default `http://127.0.0.1:3001`) and opens `/users`. CI job `e2e-api` runs health + auth against a live uvicorn + Postgres.

## Database invariants

- `applications.status_code` is current state only.
- Transition history is tracked in `status_history`.
- Direct status update is forbidden for `app_user`:
  - `REVOKE UPDATE (status_code) ON applications FROM app_user;`
- Status changes must go through backend service `change_status(...)`.
