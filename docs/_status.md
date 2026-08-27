# Docs Status

The indexed docs system is active for the product, process, and architecture
areas. Each area has a human-oriented overview, routing index, current status,
rationale, and focused topic docs.

The indexed product area now defines the accepted, implementation-agnostic
booking-system domain and behavior. It has a human-oriented overview, routing
index, current status, rationale, focused responsibility docs, explicit
non-goals, and representative scenarios.

The repository has accepted an architecture and delivery direction:

- one Cloudflare Worker-based application at `apps/booking-system-web`, owning
  the browser/Vite experience, static assets, `/api/*`, technical adapters, and
  composition root;
- a React-based browser experience using `react` and `react-dom`, React Router
  Declarative Mode, TanStack Query server state, React Hook Form form mechanics,
  German-first i18next localization, and domain-oriented functional
  composition with selectively used Ramda;
- one conceptual domain package at `packages/booking`, with Admin access,
  Course structure, Course access, and Module participation as internal
  responsibility modules;
- Vite-built frontend assets and same-origin API composition;
- D1 persistence with SQLite-compatible semantics and isolated environments;
- Better Auth inside the Worker with D1-backed opaque sessions, one stable
  external principal per session, context-specific domain identity resolution,
  no session-cached booking authorization, and Google as the implemented
  normal local provider with explicit no-linking configuration;
- GitHub Actions CI/CD, Vitest, the Workers Vitest integration, and Playwright;
- a root x86_64-linux Nix development shell for host developer tooling, with
  project JavaScript and Cloudflare dependencies still pnpm-owned; and
- release-tag production promotion after real Cloudflare staging verification.

The accepted delivery sequence is:

1. use the accepted Cloudflare Worker, Workers Static Assets, and D1
   architecture;
2. implement the MVP and validate it locally with Worker/D1-compatible
   semantics;
3. after local acceptance, complete [release
   hardening](DICTIONARY.md#release-hardening) by provisioning account-bound
   infrastructure, credentials, and the remote release path;
4. validate the release candidate in real Cloudflare staging; and
5. promote the same verified release to production.

Remote Cloudflare environments and remote staging/production D1 databases are
therefore not prerequisites for MVP implementation. The operational
prerequisites for the first deployable application are resolved for
pre-implementation planning, and planning may proceed to creation of the real
implementation backlog in Markplane. Release hardening and hosted staging
verification remain mandatory before the first production release.

The first local application foundation is now implemented:

- `@booking-system/booking` at `packages/booking` owns the implemented
  `admin-access` domain behavior;
- `@booking-system/booking-system-web` at `apps/booking-system-web` owns the
  React `/admin` flow, Worker/API handling, Better Auth composition, D1
  persistence, Vite/Workers Static Assets integration, and local runtime;
- one version-controlled migration creates the Better Auth core schema, Admin
  User persistence, and permanent first-bootstrap history;
- production and explicit non-production Worker compositions structurally
  separate fixed fixture-session establishment from production;
- the `/admin` browser flow starts fixed-destination Google sign-in, requires
  authentication before the first-Admin name form, and supports Better Auth
  sign-out in every authenticated Admin-route outcome;
- both workspace boundary maps are registered in ESLint with exact module,
  workspace, composition, third-party, and test-only permissions;
- the root Nix flake supplies NixOS developer-host tooling: Node, pnpm,
  Chromium, Markplane, Git, a patched lockfile-matched workerd, and the CA
  bundle used by Miniflare for local outbound HTTPS, without changing the
  application runtime or GitHub Actions environment; and
- the canonical `pnpm check` now runs repository, domain, Worker/D1, migration,
  build, and Chromium browser evidence.

Apple, Microsoft, and Facebook providers, all later MVP product capabilities,
remote Google credentials and production callback/domain configuration, remote
Cloudflare staging/production resources, release automation, deployment
credentials, and production deployment remain absent. The account-bound
release surfaces are intentionally deferred until release hardening. No
co-located `*.docs.md` file exists.

Further project-specific docs should be added only when accepted project truth
gives them a concrete responsibility.
