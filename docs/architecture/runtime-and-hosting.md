# Runtime And Hosting

## Responsibility

This document owns the accepted deployment platform, runtime, and composition
shape for the initial booking-system web application.

## Not Responsible For

This document does not define product behavior, persistence semantics,
verification policy, release promotion, or application-owned route behavior.

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
/             -> Participant frontend entry through SPA fallback
/invite       -> public Course Invite continuation and Join through SPA fallback
/profile      -> Participant profile view through SPA fallback
/courses/*    -> assigned Participant Course views through SPA fallback
/admin        -> administration frontend entry through SPA fallback
/admin/invite -> public invited-Admin continuation through SPA fallback
/admin/invites -> Admin Invite administration through SPA fallback
/admin/users/* -> Admin User directory, name, promotion, and lifecycle UI through SPA fallback
/admin/participants/* -> Participant administration through SPA fallback
/admin/courses/* -> Course administration views through SPA fallback
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
implemented Workers Static Assets configuration uses
`single-page-application` fallback and runs `/api/*` through the Worker first;
see [browser conventions](browser-conventions.md#routing-and-navigation).

There is no separate `apps/api` in the initial architecture. That would be a
second independently runnable and deployable application rather than an
internal HTTP responsibility. It may be reconsidered only if a future concrete
requirement justifies an independent runtime boundary.

## Frontend And Worker Runtime

Vite builds the frontend and Worker through Cloudflare's official Vite plugin,
combining Workers Static Assets and Worker request handling in the same
deployable output.

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

Better Auth 1.7.2 requires Worker-side Node compatibility for
`AsyncLocalStorage` and its bundled `node:crypto` import. Both Worker
configurations therefore declare `nodejs_compat` with the current compatibility
date. ALS-only compatibility is insufficient for the real Vite development
graph.

This is a dependency-specific Worker setting, not permission for arbitrary
Node-only application assumptions. Production remains a Cloudflare Worker, not
a conventional Node server. See [authentication and
sessions](authentication-and-sessions.md#worker-compatibility).

## Dependency Declaration And Runtime Graphs

The `apps/booking-system-web` workspace has one package manifest for
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
shared. `main.jsx` roots the browser graph; `productionWorker.js` and
`nonProductionWorker.js` root the two Worker graphs, and the Vite configurations
select the required Cloudflare composition.

[Dependency boundaries](boundaries.md) separately determine which source
responsibilities may import declared dependencies. Manifest availability,
architectural permission, and runtime output inclusion are independent
questions.

The current application manifest declares MUI Core and Emotion for the browser
experience. Only `main.jsx` and browser-facing source import MUI, while neither
Worker composition nor Worker/authentication source has a MUI or Emotion edge.
The production build places the Material UI implementation in the client
output; the built Worker graph contains no MUI or Emotion reference.

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

## Implemented Local Runtime

The application workspace now includes the actual project configuration needed
to build and exercise the first slice locally:

- Vite;
- MUI Core with one browser-owned theme and `CssBaseline`;
- Cloudflare's then-current supported Vite/Workers integration;
- project-pinned Wrangler;
- Worker configuration used by local development, build, or tests;
- Worker-compatible runtime assumptions; and
- local environment and binding configuration used by implemented behavior.

Production and explicit non-production Wrangler configurations bind local D1,
point to the version-controlled migrations, configure SPA assets, and select
their structurally distinct Worker entrypoints. Worker Vitest and local
Playwright exercise Cloudflare-compatible runtime and D1 semantics rather than
a conventional long-running Node server. No remote Cloudflare resource is
required for this local lifecycle.

Normal manual Vite development persists generated bindings under
`.wrangler/state`. The explicit fixture/Playwright Vite composition and its
migration preparation use `.wrangler/e2e-state` instead. Each preparation
command resets only its own root, so running automated verification cannot
delete or replace the D1 state held by a manual development process.

Normal manual Vite development binds strictly to `localhost:5173`; it fails
instead of selecting another port when that port is occupied. This keeps the
same-origin application aligned with the registered local Google origin and
the one `http://localhost:5173/api/auth/callback/google` provider callback.
The existing Playwright harness remains separately fixed to
`127.0.0.1:4173` and uses explicit non-production composition.

### NixOS Developer Host Tooling

The root flake supplies the x86_64-linux tools that host the existing local
workflow. It pins Node 24 and pnpm 11.17.0, supplies Chromium and Markplane, and
packages the official lockfile-resolved workerd 1.20260826.1 Linux binary with
Nix ELF patching. `MINIFLARE_WORKERD_PATH` selects that immutable runtime for
Wrangler, Miniflare, Worker Vitest, Vite development, local D1 operations, and
the Playwright application server. `NODE_EXTRA_CA_CERTS` supplies Miniflare
with the Nixpkgs CA bundle so outbound HTTPS from the local workerd runtime
does not depend on the host certificate-store layout.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects Nix Chromium.

The flake is not a second application runtime. Wrangler, Vite, Vitest, Better
Auth, the Cloudflare plugins, React, and all other JavaScript dependencies
remain owned by `package.json` and `pnpm-lock.yaml`. Entering `nix develop`
does not install dependencies, apply migrations, reset local state, create
`.env`, patch `node_modules`, or start services. Normal `localhost:5173`
development can therefore keep loading the developer's ignored `.env`, while
the existing build and test commands retain their explicit environment
isolation. No Docker environment or remote Cloudflare resource is introduced.

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
