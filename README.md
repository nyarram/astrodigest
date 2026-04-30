# AstroDigest

AstroDigest is a mobile app that delivers a daily digest of astronomy news, space discoveries, and celestial events directly to your phone. It aggregates content from trusted sources, processes it through an intelligent pipeline, and surfaces the most relevant stories for each user. Built for curious minds who want to stay connected to the universe without the noise.

---

## Monorepo Structure

```
astrodigest/
├── apps/
│   ├── mobile/       # React Native + Expo app (iOS & Android)
│   └── api/          # Fastify REST API server
└── packages/
    ├── shared/       # Shared types, constants, and utilities
    ├── database/     # Database client, schema, and migrations
    ├── ingestion/    # Content ingestion and parsing logic
    └── workers/      # Background jobs and scheduled tasks
```

| Package                  | Description                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `@astrodigest/mobile`    | The user-facing iOS and Android app built with React Native and Expo |
| `@astrodigest/api`       | Fastify HTTP server powering all app endpoints                       |
| `@astrodigest/shared`    | Types, constants, and utilities shared across packages               |
| `@astrodigest/database`  | Database schema, migrations, and query client                        |
| `@astrodigest/ingestion` | Fetches, parses, and normalises content from external sources        |
| `@astrodigest/workers`   | Background jobs for ingestion scheduling, notifications, and cleanup |

---

## Getting Started

**Prerequisites:** Node 20+, npm 10+

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start all packages in development mode
npm run dev
```

---

## Tech Stack

| Layer      | Technology                |
| ---------- | ------------------------- |
| Mobile     | React Native, Expo        |
| API        | Fastify, Node.js          |
| Language   | TypeScript (strict)       |
| Monorepo   | Turborepo, npm Workspaces |
| Linting    | ESLint, typescript-eslint |
| Formatting | Prettier                  |
| Git Hooks  | Husky, lint-staged        |
| CI         | GitHub Actions            |

---

## Download

| Platform | Link                           |
| -------- | ------------------------------ |
| iOS      | [Download on the App Store](#) |
| Android  | [Get it on Google Play](#)     |
