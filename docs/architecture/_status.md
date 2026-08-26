# Architecture Status

## Accepted Direction

- Cloudflare is the intended production platform.
- The initial deployment is one conceptually named booking-system web
  application running in Cloudflare Workers.
- Vite builds frontend assets served through Workers Static Assets, with
  frontend and `/api/*` requests composed at one same-origin deployment.
- Deployed relational persistence uses D1 with SQLite-compatible SQL semantics.
- Local/test, staging, and production persistence are isolated; staging and
  production use separate D1 databases.
- The initial infrastructure boundary is Worker, Workers Static Assets, and D1.

## Current Implementation

- No application or package workspace is declared.
- No product `src/` directory or product code exists.
- No Vite frontend, Worker, D1 binding, database schema, migration, or
  production deployment exists.
- The repository uses modern ESM JavaScript and pnpm workspace globs.
- ESLint source-shape rules target future application and package source.
- The boundary converter implements deny-by-default workspace and module
  enforcement from explicit local maps.
- Local ESLint rules and boundary conversion have Node test suites.
- No architecture fitness function, secondary checker, inferred dependency
  map, application framework, or runtime dependency exists.

The exact workspace identity, dependency edges, responsibility modules,
composition files, package exports, optional application framework, and exact
runtime dependency versions remain undeclared until application implementation
begins. Accepted direction must not be mistaken for implemented runtime code.
