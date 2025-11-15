#!/usr/bin/env bash
# First run: apply migrations, load demo data, then start the stack.
set -euo pipefail

docker compose version >/dev/null 2>&1 || { echo "Docker with the compose plugin is required" >&2; exit 1; }
[ -f .env ] || { echo "Copy .env.example to .env and fill in the private values first" >&2; exit 1; }

docker compose --profile demo-init run --rm db-init
docker compose --profile demo-init run --rm seed
docker compose up --build -d
echo "Eco Bottle is starting on http://localhost:8080"
