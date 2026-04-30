# AstroDigest

[![Live Demo](https://img.shields.io/badge/Live%20Demo-astrodigest.vercel.app-6366f1?style=flat-square&logo=vercel)](https://astrodigest.vercel.app)

AstroDigest delivers a weekly AI-curated digest of astronomy news, space discoveries, and research papers directly to your phone and browser. It aggregates content from NASA, ESO, ALMA, arXiv, and more, scores and summarises each story with an LLM, and surfaces the most relevant content for each user.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Ingestion  (Cloudflare Workers — daily cron)                   │
│                                                                 │
│  arXiv ──┐                                                      │
│  NASA  ──┼──► Fetch & normalise ──► Neon (raw_content table)   │
│  ESO   ──┤                                                      │
│  ALMA  ──┘                                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ rows inserted
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Workers  (BullMQ + Upstash Redis — Railway)                    │
│                                                                 │
│  ScoringWorker ──► score each item (relevance 0–1)             │
│  SummaryWorker ──► summarise with Groq (llama-3.3-70b)         │
│  AssemblyWorker ► assemble weekly digest (sections JSON)        │
│  DeliveryWorker ► push notification to mobile app              │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  API  (Fastify — Railway)                                       │
│                                                                 │
│  GET  /digests/latest          GET  /digests/:id               │
│  GET  /digests?page&limit      PUT  /users/:id/preferences     │
│  POST /users/register          POST /users/:id/push-token      │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ fetch (TanStack Query)   │ push notifications
               ▼                         ▼
┌──────────────────────┐   ┌─────────────────────────┐
│  Web  (Next.js 15)   │   │  Mobile  (React Native) │
│  Vercel              │   │  Expo / App Store       │
└──────────────────────┘   └─────────────────────────┘
```

---

## Monorepo Structure

```
astrodigest/
├── apps/
│   ├── web/          # Next.js 15 web app (Vercel)
│   ├── mobile/       # React Native + Expo app (iOS & Android)
│   └── api/          # Fastify REST API (Railway)
└── packages/
    ├── shared/       # Shared TypeScript types and utilities
    ├── database/     # Kysely client, schema, and migrations (Neon)
    ├── ingestion/    # Cloudflare Workers — RSS + API fetching
    └── workers/      # BullMQ workers — scoring, summary, assembly, delivery
```

| Package                  | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `@astrodigest/web`       | Next.js 15 frontend with Clerk auth, TanStack Query, shadcn/ui     |
| `@astrodigest/mobile`    | iOS and Android app built with React Native and Expo               |
| `@astrodigest/api`       | Fastify HTTP server powering all app endpoints                     |
| `@astrodigest/shared`    | Types, constants, and utilities shared across packages             |
| `@astrodigest/database`  | Database schema, migrations, and Kysely query client               |
| `@astrodigest/ingestion` | Fetches, parses, and normalises content from external sources      |
| `@astrodigest/workers`   | BullMQ background jobs: scoring, summarisation, assembly, delivery |

---

## Getting Started

**Prerequisites:** Node 20+, npm 10+

```bash
# 1. Copy and fill environment variables
cp .env.example .env

# 2. Install all workspace dependencies
npm install

# 3. Start all packages in development mode
npm run dev
```

### Run individual apps

```bash
# Web app only → http://localhost:3000
npm run dev --workspace=@astrodigest/web

# API only → http://localhost:3001
npm run dev --workspace=@astrodigest/api
```

---

## apps/web — Next.js Frontend

The web app lives at `apps/web/` and is deployed to Vercel.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · Clerk · TanStack Query · Axios

**Pages:**

| Route                 | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `/`                   | Latest weekly digest                                  |
| `/archive`            | Paginated list of all past digests                    |
| `/digest/[id]`        | Individual digest with canonical URL and SEO metadata |
| `/preferences`        | Auth-protected user preferences form                  |
| `/sign-in` `/sign-up` | Clerk-hosted auth flows                               |

**Key files:**

```
apps/web/
├── app/                   # Next.js App Router pages
├── components/
│   ├── DigestBody.tsx     # Full digest layout (shared by home + archive)
│   ├── DigestCard.tsx     # Archive grid card with relative date
│   ├── Nav.tsx            # Sticky navbar with Clerk UserButton
│   ├── SourceBadge.tsx    # Colour-coded source pill (NASA/ESO/arXiv…)
│   └── StreamingSummary   # Streams re-summarisation from API
├── lib/
│   ├── api.ts             # Typed axios client with Clerk auth interceptor
│   ├── queries.ts         # TanStack Query hooks
│   └── types.ts           # Web-local types (ApiError, PaginatedDigests)
└── middleware.ts           # Clerk route protection
```

### Deploy to Vercel

1. Import the **monorepo root** as the Vercel project (connect your GitHub repo).
2. In **Project Settings → General**, set **Root Directory** to `apps/web`.  
   _(This tells Vercel where the Next.js app lives. `vercel.json` at the repo root handles the build command and output directory.)_
3. Add the following **Environment Variables** in the Vercel dashboard:

| Variable                              | Value                                                        |
| ------------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Clerk dashboard → API Keys                                   |
| `CLERK_SECRET_KEY`                    | Clerk dashboard → API Keys                                   |
| `NEXT_PUBLIC_API_URL`                 | Railway API service URL (e.g. `https://api-xxx.railway.app`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | `/sign-in`                                                   |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | `/sign-up`                                                   |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/`                                                          |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/`                                                          |

See `apps/web/.env.production.example` for the complete list.

---

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Web        | Next.js 15, React 18, Tailwind CSS, shadcn |
| Mobile     | React Native, Expo                         |
| API        | Fastify, Node.js                           |
| Workers    | BullMQ, Upstash Redis                      |
| Ingestion  | Cloudflare Workers                         |
| Database   | Neon (Postgres), Kysely                    |
| AI         | Groq API (llama-3.3-70b-versatile)         |
| Auth       | Clerk                                      |
| Language   | TypeScript (strict)                        |
| Monorepo   | Turborepo, npm Workspaces                  |
| Linting    | ESLint, typescript-eslint                  |
| Formatting | Prettier                                   |
| Git Hooks  | Husky, lint-staged                         |
| CI         | GitHub Actions                             |
| Hosting    | Vercel (web), Railway (API + workers)      |

---

## Download

| Platform | Link                           |
| -------- | ------------------------------ |
| iOS      | [Download on the App Store](#) |
| Android  | [Get it on Google Play](#)     |
