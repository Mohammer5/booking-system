# Applications

[Applications](../DICTIONARY.md#application) are independently runnable or
served deployment shells. Their names describe product-facing or execution
roles, while their internal technical mechanisms remain private.

## Current Inventory

No application workspace or runtime implementation exists. The accepted first
application target is `apps/booking-system-web`.

## Accepted Initial Boundary

The first application will be `apps/booking-system-web`, one
[workspace](../DICTIONARY.md#workspace) with one application package manifest
and one independently runnable and deployable booking-system boundary. It is
not only the Vite frontend and is not split into frontend and API workspaces;
it owns technical composition for the complete same-origin application.

- **Responsibility:** Compose and serve the browser-facing application,
  Vite-built frontend/static assets, Cloudflare Worker request handling,
  Worker/API-facing `/api/*` HTTP handling, private technical adapters, runtime
  integration, authentication and session establishment, and the application
  composition root as one deployable boundary.
- **Not responsible for:** Owning product rules or turning runtime and storage
  or authentication providers into product concepts.
- **Inputs:** Browser navigation, static-asset requests, API and authentication
  requests, session cookies, and booking capabilities supplied by the
  conceptual package.
- **Outputs:** Frontend/static-asset responses, same-origin API responses, and
  authenticated external-principal context for application operations.
- **Adjacent parts:** The planned `packages/booking` domain package, private
  Worker/Vite/Better Auth composition, and D1 persistence.

The browser reaches backend behavior through the same-origin API, such as
`/api/*`.

Better Auth remains private to this application and resolves a request to one
stable external principal. The application then uses participant or
administration context to resolve the relevant current domain identity and
authorization through `packages/booking`; the authentication session is not a
domain role selector. See [authentication and
sessions](authentication-and-sessions.md).

### First Administration HTTP Surface

The first application slice uses three concrete same-origin operations:

```text
GET  /api/admin/entry
POST /api/admin/bootstrap
GET  /api/admin/me
```

The public entry read reveals only whether the browser should present first
Admin registration or normal login. Bootstrap and current-Admin resolution
use the stable external principal derived server-side from the normal
application session. Browser-controlled bootstrap input contains the required
booking-system Admin User name, never an external principal, domain identity,
state, authority, role, or permissions. Each current-Admin read resolves fresh
booking state rather than trusting session claims. Detailed response status
and machine-readable outcome shapes belong to the implementation plan and
application translation rather than a generic API or error framework.

When created, the workspace's one manifest may declare browser runtime
dependencies, Worker/API runtime dependencies, application build and
development tooling, and the dependency on `packages/booking`. Sharing that
manifest does not make each dependency architecturally available to every
source responsibility or include it in every runtime output.

### No Separate API Application

The initial architecture has neither `apps/api` nor a separate frontend
application workspace. Different source responsibilities or technical
dependency sets do not justify another application or manifest. Such a
workspace would define a second independently runnable and deployable
application boundary, which the accepted one-application model does not
justify. A separate application may be reconsidered only when a future
concrete requirement needs an independent deployment, runtime, or application
boundary.

See [runtime and hosting](runtime-and-hosting.md) for the accepted deployment
shape. This target description names the planned workspace but does not create
it or claim that the application is already runnable.

## Definition Rule

Document every application here when it is introduced. Give it a conceptual
name and define its `Responsibility`, `Not responsible for`, `Inputs`,
`Outputs`, and runtime surface. Keep provider names and framework mechanics out
of the application identity.

An application may compose domain behavior with technical capabilities at its
root. It may not turn that composition root into a product-policy owner, global
service locator, or generic integration package.
