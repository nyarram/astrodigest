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
COPY apps/api/tsconfig.json           ./apps/api/
COPY apps/api/src/                    ./apps/api/src/
# database package has "types": "./src/index.ts" — tsc resolves straight to source
COPY packages/database/src/           ./packages/database/src/

RUN npm run build --workspace=apps/api

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

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Switch into the service directory so node resolves relative to dist/
WORKDIR /app/apps/api

ARG PORT=3000
EXPOSE $PORT

CMD ["node", "dist/index.js"]
