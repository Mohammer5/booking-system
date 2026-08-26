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
- Authentication uses one database-backed opaque cookie session per stable
  external principal. Each request resolves the context-relevant Participant
  or Admin User and its authorization from authoritative current domain state;
  domain role and permission snapshots do not enter the session.
- Implicit provider linking is disabled in v1. Deterministic browser tests use
  a separately composed, explicitly non-production Better Auth session
  mechanism that must be structurally unavailable in production.
- The initial infrastructure boundary is Worker, Workers Static Assets, and D1.

## Current Implementation

- Neither accepted application/package workspace nor either workspace manifest
  has been created or implemented.
- No product `src/` directory or product code exists.
- No Vite frontend, Worker, D1 binding, database schema, migration,
  authentication/session implementation, test-authentication composition,
  real provider integration, or production deployment exists.
- The repository uses modern ESM JavaScript and pnpm workspace globs.
- ESLint source-shape rules target future application and package source.
- The boundary converter implements deny-by-default workspace and module
  enforcement from explicit local maps.
- Local ESLint rules and boundary conversion have Node test suites.
- No application or package boundary map or exact browser-facing or
  Worker/API-facing responsibility-module name exists.
- No architecture fitness function, secondary checker, inferred dependency
  map, application framework, installed runtime dependency, or runtime
  dependency version exists.

The conceptual workspace identities and initial booking responsibility modules
are declared. Exact application responsibility modules, dependency edges,
entrypoints, composition-file names, package exports, optional application
framework, exact internal source files, and runtime dependency versions remain
undeclared until application implementation begins. Better Auth is selected,
but exact session timing, schema and route names, provider configuration, and
minimum supported Worker compatibility mode remain implementation choices.
Accepted direction must not be mistaken for implemented runtime code.
