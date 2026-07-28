#!/usr/bin/env bash
# Runs the whole app with plain Node + npm — no Docker required.
# Installs dependencies (first run only), seeds the database, then starts
# both the API (http://localhost:4000) and the dev frontend (http://localhost:5173).
set -e

cd "$(dirname "$0")"

if [ ! -d "server/node_modules" ]; then
  echo "Installing server dependencies..."
  npm install --prefix server
fi
if [ ! -d "client/node_modules" ]; then
  echo "Installing client dependencies..."
  npm install --prefix client
fi
if [ ! -d "node_modules" ]; then
  echo "Installing root dependencies..."
  npm install
fi

if [ ! -f "server/data/clinic.db" ]; then
  echo "Seeding database from server/seed-data/*.csv..."
  npm run seed --prefix server
fi

echo ""
echo "Starting server (http://localhost:4000) and client (http://localhost:5173)..."
echo "Press Ctrl+C to stop both."
echo ""
npx concurrently -n server,client -c blue,magenta \
  "npm run dev --prefix server" \
  "npm run dev --prefix client"
