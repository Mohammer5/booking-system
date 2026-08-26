# Docs Status

The indexed docs system is active for the product, process, and architecture
areas. Each area has a human-oriented overview, routing index, current status,
rationale, and focused topic docs.

The indexed product area now defines the accepted, implementation-agnostic
booking-system domain and behavior. It has a human-oriented overview, routing
index, current status, rationale, focused responsibility docs, explicit
non-goals, and representative scenarios.

The repository has accepted an architecture and delivery direction:

- one Cloudflare Worker-based booking-system web application;
- Vite-built frontend assets and same-origin API composition;
- D1 persistence with SQLite-compatible semantics and isolated environments;
- GitHub Actions CI/CD, Vitest, the Workers Vitest integration, and Playwright;
  and
- release-tag production promotion after real Cloudflare staging verification.

The accepted direction is not yet product implementation:

- no product source code or runtime dependency exists;
- no application or package workspace is declared;
- no Vite frontend, Worker, D1 schema, product test suite, Playwright suite,
  release workflow, or production deployment exists;
- no workspace boundary map is registered yet;
- no project-specific Markplane item or note exists; and
- no co-located `*.docs.md` file exists.

The architecture rule implementation and its Node tests are live. GitHub
Actions now runs the canonical verification gate. Source-shape rules already
target future `apps/*/src/` and `packages/*/src/` trees. A future workspace
activates deny-by-default dependency enforcement by declaring its local
boundary map and registering it explicitly in `eslint.config.mjs`.

Further project-specific docs should be added only when accepted project truth
gives them a concrete responsibility.
