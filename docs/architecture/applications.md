# Applications

[Applications](../DICTIONARY.md#application) are independently runnable or
served deployment shells. Their names describe product-facing or execution
roles, while their internal technical mechanisms remain private.

## Current Inventory

One application workspace exists: `@booking-system/booking-system-web` at
`apps/booking-system-web`.

## Accepted Initial Boundary

The first application is `apps/booking-system-web`, one
[workspace](../DICTIONARY.md#workspace) with one application package manifest
and one independently runnable and deployable booking-system boundary. It is
not only the Vite frontend and is not split into frontend and API workspaces;
it owns technical composition for the complete same-origin application.
Its browser experience is React-based and follows the accepted [browser
conventions](browser-conventions.md).

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
- **Adjacent parts:** The implemented `packages/booking` domain package, private
  Worker/Vite/Better Auth composition, and D1 persistence.

The browser reaches backend behavior through the same-origin API, such as
`/api/*`.

Participant-facing and Admin-facing experiences are both browser
responsibilities of this one application. They do not create separate
`apps/participant`, `apps/admin`, `apps/frontend`, or generic frontend
workspaces, and their two audiences do not by themselves justify permanent
audience-first source buckets. See [browser conventions](browser-conventions.md)
for the accepted browser libraries and their responsibilities.

The implemented browser exposes Participant Google entry, onboarding, and home
at `/`, the administration entry at `/admin`, and nested Course
index/create/detail routes through one responsive MUI shell. Stable Course
detail contains the owned Group and future-Module lists and creation forms
rather than adding incidental routes. Navigation preserves the same browser
cookie and Better Auth principal; Participant context resolves its own current
domain identity without selecting a role or revealing Course data before a
later Assignment authorizes access. Every route is direct-navigation and
refresh-safe through the application-owned SPA fallback.

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

| Operation | Authentication | Input | Results |
| --- | --- | --- | --- |
| `GET /api/admin/entry` | Public | None | `200 { mode: "register-admin" | "login" }` |
| `POST /api/admin/bootstrap` | Normal application session | `{ name }` only | `201` current Admin; `401 unauthenticated`; `422 invalid-name`; `409 bootstrap-unavailable` |
| `GET /api/admin/me` | Normal application session | None | `200` current Active Admin; `401 unauthenticated`; `403 no-admin-user`; `403 disabled-admin` |

Admin success representations contain only `id`, `name`, `state`, and
`authority`.

The public entry read reveals only whether the browser should present first
Admin registration or normal login. The browser uses Better Auth directly for
fixed-destination Google sign-in and sign-out; no redundant booking-facing
session endpoint is added. Bootstrap and current-Admin resolution use the
stable external principal derived server-side from the normal application
session. Browser-controlled bootstrap input contains the required
booking-system Admin User name, never an external principal, domain identity,
state, authority, role, or permissions. Each current-Admin read resolves fresh
booking state rather than trusting session claims. The application translates
these narrow outcomes directly rather than introducing a generic API or error
framework.

The workspace's one manifest declares browser runtime
dependencies, Worker/API runtime dependencies, application build and
development tooling, and the dependency on `packages/booking`. Sharing that
manifest does not make each dependency architecturally available to every
source responsibility or include it in every runtime output.

### Participant Registration HTTP Surface

The implemented `course-access` registration slice uses two concrete
same-origin operations:

```text
GET  /api/participant/me
POST /api/participant/onboarding
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Current Participant | Normal session resolving the current Participant fresh by external principal | `200` narrow Active Participant; `401 unauthenticated`; `403 no-participant`; `403 disabled-participant` |
| Participant onboarding | Normal session plus explicit `{ name, email }` booking profile | `201` narrow Active Participant; `401`; `422 invalid-name`/`invalid-email`; `409 participant-already-exists`/`email-already-exists` |

Participant success representations contain only `id`, `name`, `email`, and
`state`. The server derives the external principal, Participant identity,
case-insensitive whole-email comparison key, and Active state; browser trust
fields are ignored. One constraint-backed insert decides repeated or
concurrent principal/email conflicts without partially changing a profile.
Authentication or abandoned onboarding creates no Participant, Course
Assignment, or Module Selection. The `/` browser resolves this HTTP state on
direct navigation and refresh, presents the mandatory German profile form when
the Participant is missing, and presents the truthful zero-membership home
after registration without issuing Course requests or offering public
discovery.

### Course Administration HTTP Surface

The implemented `course-structure` creation slices use five concrete
same-origin operations:

```text
GET  /api/admin/courses
POST /api/admin/courses
GET  /api/admin/courses/:courseId
POST /api/admin/courses/:courseId/groups
POST /api/admin/courses/:courseId/modules
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Course index | Normal session resolving a current Active Admin | `200 { courses }`; `401 unauthenticated`; exact `403` missing/Disabled Admin |
| Course creation | Same plus guarded Active-Admin write acceptance | `201` narrow Course; `401`; exact `403`; `422` field outcome |
| Course detail | Normal session resolving a current Active Admin | `200` Course with ordered `groups` and `modules`; `401`; exact `403`; `404 course-not-found` |
| Group creation | Same plus guarded current Active Admin and Active Course acceptance | `201` narrow Active Group; `401`; exact `403`; `404`; `409` stale Course/name conflict; `422` field outcome |
| Module creation | Same plus guarded current Active Admin and Active Course acceptance | `201` narrow Scheduled Module with definite instants; `401`; exact `403`; `404`; `409` stale Course; `422` field/time/overlap outcome |

Course representations contain only `id`, `name`, `description`, `timezone`,
and `state`; detail adds only its Course-owned Group and Module
representations. The server creates identities and lifecycle state, derives
the Course and definite instants, ignores browser trust fields, freshly
resolves Admin context for every request, and uses guarded inserts so an actor
Disabled or Course Archived after page load creates nothing. Group responses
omit the persistence normalization key. Module responses preserve exact ISO
instants; local input, DST gap rejection, and overlap choices remain request
mechanics interpreted through the persisted Course timezone. The browser nests
`/admin/courses`, `/admin/courses/new`, and
`/admin/courses/:courseId` behind its current-Admin gate, while Worker
authorization remains authoritative for every operation.

### No Separate API Application

The initial architecture has neither `apps/api` nor a separate frontend
application workspace. Different source responsibilities or technical
dependency sets do not justify another application or manifest. Such a
workspace would define a second independently runnable and deployable
application boundary, which the accepted one-application model does not
justify. A separate application may be reconsidered only when a future
concrete requirement needs an independent deployment, runtime, or application
boundary.

See [runtime and hosting](runtime-and-hosting.md) for the implemented local
runtime and accepted deployment shape. The application is locally runnable;
no remote deployment or release environment exists yet.

## Definition Rule

Document every application here when it is introduced. Give it a conceptual
name and define its `Responsibility`, `Not responsible for`, `Inputs`,
`Outputs`, and runtime surface. Keep provider names and framework mechanics out
of the application identity.

An application may compose domain behavior with technical capabilities at its
root. It may not turn that composition root into a product-policy owner, global
service locator, or generic integration package.
