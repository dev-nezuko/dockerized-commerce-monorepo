#!/usr/bin/env bash
set -euo pipefail

command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "docker compose plugin is required"; exit 1; }

echo "Starting eco-bottle stack..."
docker compose up --build
