up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

backend-shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend python -m app.db.run_migrations

lint:
	docker compose exec backend python -m compileall app

test:
	docker compose exec backend python -m pytest -q
