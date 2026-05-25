#!/usr/bin/env bash
# Поднимает bot; при WEBAPP_DOMAIN в .env — также Caddy (HTTPS).
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILES=""
if grep -qE '^WEBAPP_DOMAIN=.+' .env 2>/dev/null; then
  PROFILES=webapp
  if command -v ufw >/dev/null 2>&1; then
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
  fi
fi

export COMPOSE_PROFILES="$PROFILES"
docker compose up -d --build "$@"
