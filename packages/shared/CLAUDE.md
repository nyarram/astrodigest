# @astrodigest/shared

TypeScript types, constants, and lightweight utility functions shared across all other packages in the monorepo. Contains no runtime dependencies and no business logic — it is a pure types-and-utilities package. Every inter-package contract (API response shapes, queue job payloads, normalised article schema) is defined here so that `api`, `mobile`, `workers`, and `ingestion` all speak the same language.

## Conventions

- No runtime dependencies — `devDependencies` only (TypeScript, etc.)
- Export everything from `src/index.ts` — consumers import from `@astrodigest/shared`, never from deep paths
- Types are organised by domain: `src/types/articles.ts`, `src/types/digest.ts`, `src/types/jobs.ts`, etc.
- No functions with side effects — pure transformations and type guards only
- If something needs a dependency, it belongs in another package, not here
