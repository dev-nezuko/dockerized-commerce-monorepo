.PHONY: init up down test

# Apply migrations and load demo data (safe to repeat).
init:
	docker compose --profile demo-init run --rm db-init
	docker compose --profile demo-init run --rm seed

up:
	docker compose up --build -d

down:
	docker compose down

# Backend unit + integration tests against throwaway databases.
test:
	docker compose --profile test run --rm --build backend-test
	docker compose --profile test rm -sfv postgres-test redis-test
