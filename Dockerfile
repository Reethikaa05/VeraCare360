# --- Stage 1: build the React client ---
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: server + built client ---
FROM node:20-slim AS server
WORKDIR /app

# better-sqlite3 needs build tools to compile its native binding
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/server/data
EXPOSE 4000

# Seed on first boot if the DB doesn't exist yet, then start the server.
CMD ["sh", "-c", "node src/db/seed.js && node src/index.js"]
