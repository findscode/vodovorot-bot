#!/usr/bin/env bash
set -euxo pipefail

APP_DIR=/opt/vodovorot-bot
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes'

ENV_BACKUP=""
if [ -f "$APP_DIR/.env" ]; then
  ENV_BACKUP=$(mktemp)
  cp "$APP_DIR/.env" "$ENV_BACKUP"
fi

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
else
  rm -rf "$APP_DIR"
  git clone git@github.com:findscode/vodovorot-bot.git "$APP_DIR"
  cd "$APP_DIR"
  git checkout main
fi

if [ -n "$ENV_BACKUP" ] && [ ! -f "$APP_DIR/.env" ]; then
  cp "$ENV_BACKUP" "$APP_DIR/.env"
fi
rm -f "$ENV_BACKUP"

cd "$APP_DIR"
if [ ! -f .env ]; then
  echo "ERROR: missing .env in $APP_DIR — copy from .env.example and restart."
  exit 1
fi

# s-1vcpu-512mb: npm ci в Docker часто OOM без swap
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

docker compose up -d --build
docker compose ps
docker compose logs --tail=30 bot
