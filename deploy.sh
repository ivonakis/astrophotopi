#!/bin/bash
set -e

source "$(dirname "$0")/.env"

echo "Building..."
npm run build

echo "Deploying to ${PI_USER}@${PI_HOST}:${PI_PATH}..."
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'src' \
  --exclude 'data' \
  --exclude '.env' \
  --exclude 'deploy.sh' \
  --exclude 'vite.config.js' \
  --exclude 'eslint.config.js' \
  --exclude 'jsconfig.json' \
  --exclude 'CLAUDE.md' \
  ./ "${PI_USER}@${PI_HOST}:${PI_PATH}/"

echo "Done."
