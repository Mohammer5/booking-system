# Architecture Status

## Accepted Direction

- Cloudflare is the intended production platform.
- The initial deployment is one conceptually named booking-system web
  application workspace at `apps/booking-system-web`, with one application
  package manifest, running in Cloudflare Workers.
- Vite builds frontend assets served through Workers Static Assets, with
  frontend and `/api/*` requests composed at one same-origin deployment.
- The web application owns the browser experience, static assets, Worker and
  `/api/*` handling, private technical adapters, and its composition root; no
  separate `apps/api` application is planned initially.
- Browser-facing and Worker/API-facing code remain distinct internal
  responsibilities. They may share declarations in the application manifest,
  but explicit source boundaries keep their implementation dependencies
  separate and their source/build graphs determine their respective outputs.
- The initial browser experience is React-based, with `react` and `react-dom`
  as foundational browser dependencies. It uses `react-router` in Declarative
  Mode for stable URL-to-view navigation, `@tanstack/react-query` for server
  state, `react-hook-form` for transient form mechanics, and `i18next` with
  `react-i18next` for localization. `classnames`, `debug`, and `ramda` remain
  optional and are introduced only for a concrete use.
- Every independently navigable browser view receives a route, without turning
  incidental UI state into routes. Frontend routes support direct navigation
  and refresh through the same-origin deployment; `/api/*` remains Worker/API
  owned.
- German is the initial frontend language. Stable semantic translation keys,
  language-independent route paths, and language-neutral domain outcomes allow
  later languages without changing the architecture.
- JavaScript follows domain-oriented functional composition inside vertical
  slices: explicit narrow dependencies, instruction-shaped workflows, visible
  conceptual decisions, selective functional techniques, and late
  abstraction remain subordinate to existing architecture boundaries.
- Ramda is accepted selectively in browser/application code,
  runtime-compatible Worker/application workflows, and `packages/booking`
  domain code. Each workspace declares it only when real source uses it and
  its boundary map permits that source responsibility to import it.
- `packages/booking` is the intended initial conceptual domain package, with
  `admin-access`, `course-structure`, `course-access`, and
  `module-participation` as distinct internal responsibility modules rather
  than separate workspaces.
- Deployed relational persistence uses D1 with SQLite-compatible SQL semantics.
- Local/test, staging, and production persistence are isolated; staging and
  production use separate D1 databases.
- Better Auth is the intended application-owned authentication layer inside
  `apps/booking-system-web`, backed by the application's D1 database.
- The application-to-booking authentication seam exposes only
  `externalPrincipalId`; domain identity, state, authority, and permissions are
  resolved fresh from booking persistence rather than authentication claims.
- Authentication uses one database-backed opaque cookie session per stable
  external principal. Each request resolves the context-relevant Participant
  or Admin User and its authorization from authoritative current domain state;
  domain role and permission snapshots do not enter the session.
- Implicit provider linking is disabled in v1. Deterministic browser tests use
  a separately composed, explicitly non-production Better Auth session
  mechanism that must be structurally unavailable in production.
- Google is the implemented normal provider for local development. Its Client
  ID, Client Secret, and Better Auth secret enter only through Worker runtime
  environment configuration; account linking is explicitly disabled.
- First Admin bootstrap availability is permanent historical state independent
  of current Admin User rows, and consuming bootstrap plus creating the first
  Active Super Admin is one atomic persistence outcome.
- The implemented first slice has a same-origin Admin entry, Google sign-in and
  Better Auth sign-out, bootstrap, and current-context HTTP surface with fixed
  application destinations and browser input unable to select principal or
  authority.
- The initial infrastructure boundary is Worker, Workers Static Assets, and D1.
- MVP implementation and local acceptance use Worker/D1-compatible tooling,
  configuration, and semantics from the beginning; a conventional
  long-running Node server or unrelated database is not an interim
  architecture.
- Account-bound Cloudflare Worker environments, remote staging and production
  D1 databases, deployment credentials, and release infrastructure are
  intentionally deferred until [release
  hardening](../DICTIONARY.md#release-hardening), after the MVP is
  feature-complete and accepted locally.

## Current Implementation

- `@booking-system/booking` and `@booking-system/booking-system-web` are real
  modern-ESM workspaces with one manifest each.
- The booking package currently exposes only the three `admin-access`
  operation factories required by first Admin bootstrap and fresh context
  resolution.
- The web application has distinct `browser`, `worker`, and `authentication`
  responsibilities plus thin browser, production Worker, and non-production
  Worker compositions.
- React Router serves the independently navigable `/admin` route. TanStack
  Query owns remote Admin state, React Hook Form owns the name form, and
  German-first i18next resources own all browser copy.
- Vite and the Cloudflare Vite plugin build the browser and Worker outputs;
  Workers Static Assets provides SPA fallback while `/api/*` runs Worker-first.
- Better Auth 1.7.2 uses D1-backed normal sessions and crosses into booking
  behavior only as `externalPrincipalId`. Google sign-in uses the one normal
  `/api/auth/callback/google` provider callback and returns to `/admin`. Fixed
  non-production fixture identities use a separate executable composition.
- A version-controlled D1 migration and atomic `D1Database.batch()` claim
  implement permanent first-bootstrap history and exactly-one creation.
- Both explicit workspace boundary maps are registered in ESLint. The boundary
  converter denies undeclared third-party imports and supports exact test-only
  and composition-interface permissions.
- Repository, domain, Worker/D1, migration, production-composition, build, and
  Chromium E2E verification are integrated into `pnpm check` and CI.

The first slice deliberately does not declare optional `classnames`, `debug`,
or `ramda` dependencies because its source has no concrete use for them. Apple,
Microsoft, and Facebook integration, remote Google credentials and production
callback/domain configuration, production deployment, remote Cloudflare
environments and D1 databases, deployment credentials, and release
infrastructure remain absent. Release hardening and real staging verification
remain mandatory before the first production release.
