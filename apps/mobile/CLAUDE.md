# @astrodigest/mobile

React Native + Expo app (iOS and Android) that is the user-facing product. It uses Expo Router for file-based navigation, Zustand for client-side state management, and Clerk for authentication. The app fetches digest and article data from `@astrodigest/api` and displays curated weekly astronomy content with push notification support via Expo Notifications.

## Conventions

- All screens live under `src/app/` following Expo Router conventions
- Global state goes in Zustand stores under `src/stores/` — no prop drilling
- API calls are encapsulated in hooks under `src/hooks/` — never call fetch directly from a component
- Use shared types from `@astrodigest/shared` for all API response shapes
- No business logic in components — keep them presentational
