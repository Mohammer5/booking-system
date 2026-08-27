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
  and no session-cached booking authorization;
- GitHub Actions CI/CD, Vitest, the Workers Vitest integration, and Playwright;
  and
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

The accepted direction is not yet product implementation:

- no product source code or runtime dependency exists;
- no application or package workspace has been created or implemented;
- none of the accepted browser libraries is installed; React and React DOM are
  not installed, and no React application, route tree, query/form
  configuration, translation resource, or browser runtime composition exists;
- no Vite frontend, Worker, D1 schema, product test suite, Playwright suite,
  Better Auth/session implementation, release workflow, or production
  deployment exists; the account-bound release surfaces are intentionally
  deferred until release hardening;
- no workspace boundary map is registered yet;
- the first project-specific delivery sequence exists only as non-active
  Markplane planning state; and
- no co-located `*.docs.md` file exists.

The architecture rule implementation and its Node tests are live. GitHub
Actions now runs the canonical verification gate. Source-shape rules already
target future `apps/*/src/` and `packages/*/src/` trees. A future workspace
activates deny-by-default dependency enforcement by declaring its local
boundary map and registering it explicitly in `eslint.config.mjs`.

Further project-specific docs should be added only when accepted project truth
gives them a concrete responsibility.
