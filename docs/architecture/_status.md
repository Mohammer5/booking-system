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
- First Admin bootstrap availability is permanent historical state independent
  of current Admin User rows, and consuming bootstrap plus creating the first
  Active Super Admin is one atomic persistence outcome.
- The planned first slice has a minimal same-origin Admin entry, bootstrap, and
  current-context HTTP surface with browser input unable to select principal or
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

- Neither accepted application/package workspace nor either workspace manifest
  has been created or implemented.
- No product `src/` directory or product code exists.
- No Vite frontend, Worker, local/test D1 binding, database schema, migration,
  authentication/session implementation, test-authentication composition, or
  real provider integration exists.
- No production deployment, remote Cloudflare environment, remote staging or
  production D1 database, provider production configuration, deployment
  credential, or release infrastructure exists. These account-bound surfaces
  are intentionally deferred until release hardening and do not block normal
  local MVP implementation.
- The repository uses modern ESM JavaScript and pnpm workspace globs.
- ESLint source-shape rules target future application and package source.
- The boundary converter implements deny-by-default workspace and module
  enforcement from explicit local maps.
- Local ESLint rules and boundary conversion have Node test suites.
- No application or package boundary map or exact implemented browser-facing
  or Worker/API-facing responsibility-module declaration exists. The first
  Admin implementation plan now records the intended responsibility split and
  edges for creation with real source.
- No architecture fitness function, secondary checker, inferred dependency
  map, application framework, installed runtime dependency, or runtime
  dependency version exists.

The conceptual workspace identities, initial booking responsibility modules,
and first Admin application/domain contracts are declared and have a detailed
implementation plan. Exact implemented map declarations, entrypoints,
composition-file names, package exports, optional application framework,
internal helper files, schema names, runtime dependency versions, session
timing, provider configuration, and minimum supported Worker compatibility mode
remain implementation choices. Accepted and planned direction must not be
mistaken for implemented runtime code. The accepted application can be
implemented and accepted locally without remote Cloudflare resources, but
release hardening and real staging verification remain mandatory before the
first production release.
