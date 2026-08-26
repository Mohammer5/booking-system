# Booking System

This repository defines the product and documentation foundation for a
deliberately simple course and module booking system. It currently contains:

- an authoritative, implementation-agnostic product specification;
- an indexed, maintainable documentation process;
- a conceptual-domain-first architecture philosophy with ESLint enforcement;
- an accepted Cloudflare Worker, Vite, and D1 application direction;
- GitHub Actions verification for pull requests and `main`; and
- a repository-local Markplane development backlog.

The direction is accepted, but the application is not implemented. The
repository still contains no product workspace, runtime code, Vite frontend,
Worker, D1 schema, product test suite, Playwright suite, release workflow, or
production deployment.

Start with [the product specification](docs/product/README.md) for accepted
booking-system behavior or [the docs overview](docs/README.md) for the
repository documentation model. Use
[the docs index](docs/_index.md) to route to the smallest relevant document.
The [architecture overview](docs/architecture/README.md) describes the accepted
runtime direction, and [verification](docs/process/verification.md) and
[releases](docs/process/releases.md) own CI and release policy.

## Development Tracking

The repository-local `.markplane/` project tracks development work. It is
planning state, not canonical repository truth or runtime product data.

```sh
markplane dashboard
markplane serve --open
markplane sync
markplane check
```

## Verification

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm check
```

These commands currently verify the architecture tooling. GitHub Actions runs
`pnpm check` in the `verify` job. Workspace boundary enforcement becomes active
for each future workspace when it adds an explicit local
`boundaries.config.mjs` map and registers it in `eslint.config.mjs`.
