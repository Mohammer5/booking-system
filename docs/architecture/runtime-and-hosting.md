# Runtime And Hosting

## Responsibility

This document owns the accepted deployment platform, runtime, and composition
shape for the initial booking-system web application.

## Not Responsible For

This document does not define product behavior, persistence semantics,
verification policy, release promotion, or the exact future application route
implementation.

## Inputs

- same-origin browser requests;
- frontend assets built by Vite; and
- API requests handled by application-owned Worker code.

## Outputs

- one deployable booking-system web application;
- static frontend responses; and
- same-origin API responses.

## Adjacent Parts

[Applications](applications.md) owns the conceptual deployment boundary,
[persistence](persistence.md) owns durable data, and
[verification](../process/verification.md) and
[releases](../process/releases.md) own the evidence and promotion gates around
the deployed application.

## Accepted Deployment Shape

Cloudflare is the intended production platform. The initial application is one
Worker-based deployment rather than independently deployed frontend and API
applications:

```text
Browser
  |
  v
booking-system-web / Cloudflare Worker
  |
  +-- Vite-built frontend/static assets
  |
  +-- /api/* request handling
  |
  v
Cloudflare D1
```

The default routing model is same-origin:

```text
/             -> frontend application
/assets/*     -> frontend static assets
/api/*        -> backend/API handling
```

The exact routing implementation remains private to the application. A
separate Cloudflare Pages deployment requires a future concrete reason to add
another deployment boundary.

Frontend routing must preserve direct browser navigation and refresh for
independently navigable views: a frontend route that is not a static asset or
Worker-owned endpoint must still reach the browser application through the
same-origin Worker/static-assets shape. `/api/*` remains reserved for
Worker/API handling. Browser route paths remain stable across locales. The
future implementation chooses the exact route tree and fallback mechanism;
see [browser conventions](browser-conventions.md#routing-and-navigation).

There is no separate `apps/api` in the initial architecture. That would be a
second independently runnable and deployable application rather than an
internal HTTP responsibility. It may be reconsidered only if a future concrete
requirement justifies an independent runtime boundary.

## Frontend And Worker Runtime

Vite will build the frontend. When implementation begins, use Cloudflare's
then-current official Vite integration to combine Workers Static Assets and
Worker request handling in the same deployable application.

Backend and API code will remain JavaScript in the Node.js ecosystem, but its
production runtime is Cloudflare Workers. Production is not a persistent Node
process, does not listen on a TCP port through `node server.js`, and does not
assume Express, Fastify, Nest, or another server framework. Node compatibility
APIs may be enabled only when a concrete dependency requires them.

Keep three concerns distinct:

- Node.js runs repository tooling, builds, and CI;
- Node-compatible packages may be used where the Worker supports them; and
- the deployed application executes in the Workers runtime.

### Authentication Runtime Compatibility

The accepted Better Auth composition currently requires Worker-side
`AsyncLocalStorage` support. When dependencies are introduced, verify the
then-current Better Auth and Cloudflare requirements and enable the narrowest
supported compatibility capability: prefer `nodejs_als` when sufficient and
otherwise use `nodejs_compat`.

This is a dependency-specific Worker setting, not permission for arbitrary
Node-only application assumptions. Production remains a Cloudflare Worker, not
a conventional Node server. See [authentication and
sessions](authentication-and-sessions.md#worker-compatibility).

## Dependency Declaration And Runtime Graphs

The planned `apps/booking-system-web` workspace has one package manifest for
the complete application. That manifest declares which dependencies are
available to the workspace's build, runtime, and tooling environment; it does
not define one universal runtime graph.

```text
apps/booking-system-web/package.json
                |
        declares dependencies
                |
          +-----+-----+
          |           |
   browser graph   Worker graph
          |           |
   browser output  Worker output
```

The source/build graph rooted at the relevant entrypoint and configuration
determines inclusion in each output. A browser-only dependency is not included
in the Worker output merely because the same application manifest declares it,
provided Worker/API-facing source does not import it. Likewise, a Worker/API
dependency does not become a browser dependency merely because the manifest is
shared. Exact entrypoints, build configuration, and bundler integration remain
deferred until the application is implemented.

[Dependency boundaries](boundaries.md) separately determine which source
responsibilities may import declared dependencies. Manifest availability,
architectural permission, and runtime output inclusion are independent
questions.

## Infrastructure Boundary

The accepted initial hosting footprint is deliberately small:

```text
Cloudflare Worker
+ Workers Static Assets
+ D1
```

Operating within Cloudflare's free hosting and database quotas at small scale
is a design goal, not a correctness invariant or a promise that domains,
identity providers, developer programs, or other external dependencies are
free. Durable rules therefore do not embed current quota numbers.

Durable Objects, KV, R2, Queues, Workflows, Containers, external databases,
Redis, background workers, separate hosting providers, and other
infrastructure require a concrete need and a separate architecture decision.

## Implementation-Time Local Runtime Requirements

The direction above is accepted but not implemented. When real application
code begins, introduce the actual project configuration needed to build and
exercise the implemented behavior locally, as applicable:

- Vite;
- Cloudflare's then-current supported Vite/Workers integration;
- project-pinned Wrangler;
- Worker configuration used by local development, build, or tests;
- Worker-compatible runtime assumptions; and
- local environment and binding configuration used by implemented behavior.

These surfaces arrive with code and tests that use them. Placeholder runtime
code, empty infrastructure scaffolding, and unused configuration do not satisfy
this contract. Local development and verification must exercise compatible
Worker semantics rather than treating a conventional long-running Node server
as proof of production-runtime behavior.

## Release-Hardening Infrastructure

After the MVP is feature-complete and accepted locally, [release
hardening](../DICTIONARY.md#release-hardening) provisions the account-bound
infrastructure required for actual deployment, as applicable:

- Cloudflare account and project resources;
- remote staging and production Worker environments;
- environment-specific remote configuration;
- staging and production URLs or domains;
- deployment credentials and secrets; and
- other account-bound deployment configuration.

None of these remote resources needs to exist before MVP implementation starts
or while the MVP is being completed locally. Their intentional absence does
not change the accepted same-origin Worker and Workers Static Assets deployment
shape. Release hardening must establish them before the first production
release can pass the release contract.
