# syntax=docker/dockerfile:1

FROM node:20-alpine
WORKDIR /app

# Copy workspace manifests so npm can reconstruct the workspace graph
COPY package.json package-lock.json ./
COPY apps/api/package.json               ./apps/api/
COPY packages/database/package.json     ./packages/database/
COPY packages/shared/package.json       ./packages/shared/
COPY packages/workers/package.json      ./packages/workers/
COPY packages/ingestion/package.json    ./packages/ingestion/
COPY packages/digest-assembly/package.json ./packages/digest-assembly/

RUN npm ci --omit=dev

# @astrodigest/database's package.json "main" points at ./src/index.ts (no dist build) —
# run via tsx (same as its "dev" script) so that resolves correctly at runtime
COPY packages/database/src/         ./packages/database/src/
COPY packages/digest-assembly/src/  ./packages/digest-assembly/src/

WORKDIR /app/packages/digest-assembly

# One-shot script — invoked on a schedule (VPS crontab), not a long-running service
CMD ["npx", "tsx", "src/index.ts"]
