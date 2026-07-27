# syntax=docker/dockerfile:1

# ---- Build stage --------------------------------------------------------
# Full monorepo context needed so TypeScript can resolve workspace types
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first — Docker cache layer for npm ci
COPY package.json package-lock.json ./
COPY apps/api/package.json             ./apps/api/
COPY packages/database/package.json   ./packages/database/
COPY packages/shared/package.json     ./packages/shared/
COPY packages/workers/package.json    ./packages/workers/
COPY packages/ingestion/package.json  ./packages/ingestion/

RUN npm ci

# Copy only the source files required for compilation
COPY tsconfig.base.json               ./
COPY packages/workers/tsconfig.json   ./packages/workers/
COPY packages/workers/src/            ./packages/workers/src/
# database package has "types": "./src/index.ts" — tsc resolves straight to source
COPY packages/database/src/           ./packages/database/src/

RUN npm run build --workspace=packages/workers

# ---- Runtime stage ------------------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Copy workspace manifests so npm can reconstruct the workspace graph
COPY package.json package-lock.json ./
COPY apps/api/package.json             ./apps/api/
COPY packages/database/package.json   ./packages/database/
COPY packages/shared/package.json     ./packages/shared/
COPY packages/workers/package.json    ./packages/workers/
COPY packages/ingestion/package.json  ./packages/ingestion/

# Install production deps only (@astrodigest/database is a devDep — omitted)
RUN npm ci --omit=dev

# @astrodigest/database's package.json "main" points at ./src/index.ts (no dist build), and
# its dist-less imports mix ESM/CJS resolution in ways `node --import tsx/esm` doesn't fully
# cover — running the entrypoint itself through tsx (same as the "dev" script) sidesteps that
COPY packages/workers/src/            ./packages/workers/src/
COPY packages/database/src/           ./packages/database/src/

# Switch into the service directory so node resolves relative to src/
WORKDIR /app/packages/workers

CMD ["npx", "tsx", "src/index.ts"]
