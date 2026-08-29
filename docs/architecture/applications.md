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

The implemented browser exposes Participant Google entry, onboarding, and
assigned-Course home at `/`, self-profile maintenance at `/profile`, private
Participant Course detail at `/courses/:courseId`, the administration entry at
`/admin`, the Participant directory at `/admin/participants`, stable
Participant detail/edit/lifecycle at `/admin/participants/:participantId`, and
nested Course index/create/detail routes through one responsive MUI shell.
Stable Admin Course detail contains complete Course editing with its permanent
timezone lock, Course membership creation, revocation, and reactivation plus
the owned Group list, creation and complete field forms, current lifecycle
actions, and Module list/creation plus separate descriptive and pre-start
schedule forms, terminal cancellation, and permanent deletion rather than
adding incidental routes.
Navigation
preserves the same browser cookie and Better Auth principal; Participant
context resolves its own
current domain identity without selecting a role or revealing Course data
before current Active Participant/Assignment/Course access authorizes it.
Every route is direct-navigation and refresh-safe through the
application-owned SPA fallback.

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
Assignment, or Module Selection. The Participant route gate resolves this HTTP
state on direct navigation and refresh, presents the mandatory German profile
form when the Participant is missing, and mounts private assigned-Course list
or detail queries only after an Active Participant resolves.

### Participant Profile HTTP Surface

The implemented `course-access` profile-maintenance slice adds self-service to
the existing current-Participant resource:

```text
PUT /api/participant/me
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Own profile update | Normal session resolving a current Active Participant plus explicit complete `{ name, email }` profile | `200` narrow updated Participant; `401 unauthenticated`; exact `403` missing/Disabled/stale Participant; `422 invalid-name`/`invalid-email`; `409 email-already-exists`/`profile-not-updated`; sanitized `500 technical-error` |

The server derives the Participant from the authenticated principal, applies
the same trimmed whole-email comparison used at registration, and changes only
the required name and email. Participant identity, external principal, global
state, Assignments, Selections, history, and any same-principal Admin User stay
unchanged. `/profile` reads and updates this resource behind the existing
Active-Participant gate, reports local and authoritative outcomes in German,
and remains direct-navigation and refresh-safe.

### Participant Course Access HTTP Surface

The implemented read-only `course-access` slice adds two concrete same-origin
operations:

```text
GET /api/participant/courses
GET /api/participant/courses/:courseId
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Assigned Course list | Normal session resolving a current Active Participant, then current Active Assignments and Active or Archived Courses | `200 { courses }`, including truthful empty; `401 unauthenticated`; `403 no-participant`/`disabled-participant`; sanitized `500 technical-error` |
| Assigned Course detail | Same plus a current Active Assignment to the requested current Active or Archived Course | `200` narrow Course with ordered `modules`, Active `groups`, and any selected Archived Group; `401`; exact `403`; one `404 course-unavailable` for malformed, unknown, inactive, unassigned, Revoked, stale, or cross-Participant identifiers; sanitized `500 technical-error` |

List items expose only Course `id`, `name`, optional `description`, `timezone`,
and current Course `state`. Detail adds participant-relevant Module and Group
fields. Each Module exposes only the current Participant's own Selection or
`null`; a present Selection contains its stable identity, selected Group
including retained details/state even when Archived, and derived current-
versus-historical meaning and phase. The response
also derives authoritative `open` or `closed` Selection availability from the
current Participant, Assignment, Course, Module, and injected instant.

The server derives Participant identity only from the authenticated principal,
guards D1 reads by current Participant/Assignment/Course state, and never
exposes a roster, peer profile/email/Selection, Assignment, count, Admin data,
or public catalogue.

### Participant Module Selection HTTP Surface

The implemented `module-participation` slice adds two operations at one stable
same-origin resource:

```text
PUT    /api/participant/courses/:courseId/modules/:moduleId/selection
DELETE /api/participant/courses/:courseId/modules/:moduleId/selection
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Set or change Selection | Normal session resolving a current Active Participant, current Active Assignment and Course, future Scheduled Module, and explicit Active same-Course `{ groupId }` | `201 created`; `200 changed`/`already-selected`; `401 unauthenticated`; exact Participant `403`; private `404 course-unavailable`; `409 module-not-selectable`/`selection-deadline-reached`/`group-not-selectable`; `422 invalid-group-id`; sanitized `500 technical-error` |
| Remove Selection | Same participant, membership, Course, Module, and deadline guards; no Group input | `200 removed`/`already-absent`; `401`; exact `403`; private `404`; `409 module-not-selectable`/`selection-deadline-reached`; sanitized `500 technical-error` |

The server derives Participant and Selection identity, preserves one stable
Participant/Module Selection across replacement, and accepts no default Group.
The guarded D1 statement rechecks current state and the exact `startsAt`
deadline at acceptance. Refusal leaves the prior Selection unchanged and
creates no partial side effect; overlapping Modules remain independent.

### Course Administration HTTP Surface

The implemented `course-structure` slices use fifteen concrete
same-origin operations:

```text
GET  /api/admin/courses
POST /api/admin/courses
GET  /api/admin/courses/:courseId
PUT  /api/admin/courses/:courseId
POST /api/admin/courses/:courseId/archival
POST /api/admin/courses/:courseId/groups
PUT  /api/admin/courses/:courseId/groups/:groupId
DELETE /api/admin/courses/:courseId/groups/:groupId
POST /api/admin/courses/:courseId/groups/:groupId/archival
POST /api/admin/courses/:courseId/groups/:groupId/reactivation
POST /api/admin/courses/:courseId/modules
PUT  /api/admin/courses/:courseId/modules/:moduleId
DELETE /api/admin/courses/:courseId/modules/:moduleId
PUT  /api/admin/courses/:courseId/modules/:moduleId/schedule
POST /api/admin/courses/:courseId/modules/:moduleId/cancellation
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Course index | Normal session resolving a current Active Admin | `200 { courses }`; `401 unauthenticated`; exact `403` missing/Disabled Admin |
| Course creation | Same plus guarded Active-Admin write acceptance | `201` narrow Course; `401`; exact `403`; `422` field outcome |
| Course detail | Normal session resolving a current Active Admin | `200` Course with ordered `groups` and `modules`; `401`; exact `403`; `404 course-not-found` |
| Course update | Same plus guarded current Active Admin and Active Course acceptance, complete `{ name, description, timezone }`, and permanent timezone history | `200` updated Course; `401`; exact `403`; `404 course-not-found`; `409` stale Course or locked/stale timezone; `422` field outcome; sanitized `500 technical-error` |
| Course archival | Same plus guarded current Active Admin, current Active Course, and no Scheduled Module with server-captured `now < endsAt`; no request body | `200 { outcome: "archived", course }`; `401`; exact `403`; `404 course-not-found`; `409 course-archival-blocked` or terminal/stale actor/Course state; sanitized `500 technical-error` |
| Group creation | Same plus guarded current Active Admin and Active Course acceptance | `201` narrow Active Group; `401`; exact `403`; `404`; `409` stale Course/name conflict; `422` field outcome |
| Group update | Same plus one same-Course Active/Archived Group and complete `{ name, details }` | `200` narrow updated Group; `401`; exact `403`; `404` Course/Group; `409` stale state or Active-name conflict; `422` field outcome; sanitized `500 technical-error` |
| Group deletion | Same plus one same-Course Active/Archived Group with no currently retained Selection | `200 { outcome: "deleted", group }`; `401`; exact `403`; `404`; `409 group-deletion-blocked` or stale state; sanitized `500 technical-error` |
| Group archival | Same plus current Active Group and no retained Selection for a Scheduled Module with `now < startsAt` | `200 { outcome: "archived", group }`; `401`; exact `403`; `404`; `409` exact blocker or stale Group/Course state; sanitized `500 technical-error` |
| Group reactivation | Same plus current Archived Group and authoritative Active-name uniqueness | `200 { outcome: "reactivated", group }`; `401`; exact `403`; `404`; `409` name or stale state; sanitized `500 technical-error` |
| Module creation | Same plus guarded current Active Admin and Active Course acceptance | `201` narrow Scheduled Module with definite instants; `401`; exact `403`; `404`; `409` stale Course; `422` field/time/overlap outcome |
| Module descriptive update | Same plus one same-Course Scheduled/Cancelled Module and complete `{ title, description, instructions }` | `200` narrow updated Module; `401`; exact `403`; `404` Course/Module; `409` stale actor/Course/Module state; `422` field outcome; sanitized `500 technical-error` |
| Module reschedule | Same plus one same-Course Scheduled Module before its current start, local start/end fields, and optional explicit overlap occurrences | `200` narrow rescheduled Module; `401`; exact `403`; `404` Course/Module; `409` locked or stale actor/Course/timezone/state/schedule; `422` field/DST/interval outcome; sanitized `500 technical-error` |
| Module cancellation | Same plus one same-Course Scheduled Module with server-captured `now < endsAt`; no request body | `200 { outcome: "cancelled", module }`; `401`; exact `403`; `404` Course/Module; `409` deadline, terminal, or stale actor/Course/state; sanitized `500 technical-error` |
| Module deletion | Same plus one same-Course Scheduled/Cancelled Module with no currently retained Selection; no request body | `200 { outcome: "deleted", module }`; `401`; exact `403`; `404` Course/Module; `409 module-deletion-blocked` or stale actor/Course/reference state; sanitized `500 technical-error` |

Course representations contain only `id`, `name`, `description`, `timezone`,
`state`, and derived `isTimezoneEditable`; detail adds derived
`isArchivalAvailable` plus only its Course-owned Group and Module
representations. The server creates identities and lifecycle state, derives
the Course and definite instants, ignores browser trust fields, freshly
resolves Admin context for every request, and uses guarded writes so an actor
Disabled or Course Archived after page load creates nothing and an edit changes
no field partially. A Course update accepts all three editable fields but
changes timezone only before any successful Module creation. Module insertion
rechecks the exact Course timezone used to resolve its local schedule, so a
concurrent timezone edit and first Module creation have one consistent winner.
Group responses omit the persistence normalization key. Module responses add
only the server-derived `isScheduleEditable` and `isCancellationAvailable`
capabilities to stable identity, content, lifecycle, and exact instants.
Descriptive writes preserve identity,
state, schedule, and every Selection. Rescheduling preserves identity,
content, state, and every Selection while the guarded write rechecks the
expected old interval, current Scheduled state, captured current instant, and
unchanged Course timezone; Selection deadlines therefore follow the stored
new `startsAt` without rewriting references. Cancellation accepts no browser
instant, state, ownership, or Selection input and changes only Scheduled state
to Cancelled after rechecking Active Admin/Course and the exact `endsAt`
deadline. It preserves every other Module field and Selection row; current
Selection writes already reject the terminal state. Module deletion also
accepts no browser trust fields and removes only one same-Course Module after
rechecking Active Admin/Course and the absence of every retained Selection.
It is independent of Module time/state beyond Scheduled or Cancelled, cascades
nothing, and leaves permanent Course scheduling history set; the restrictive
Selection foreign key arbitrates a concurrent new reference. Course archival
accepts no browser instant, state, Module, or related-data input. One guarded
update captures and rechecks the current Active Admin/Course plus the absence
of any Scheduled Module whose `endsAt` remains future; exact end and every
Cancelled Module are eligible. Success changes only Course state, while all
existing Active-Course write guards make retained structure and booking data
read-only. The detail capability is explanatory only and a concurrent Module
mutation remains governed by the accepting update. Group lifecycle
and deletion actions accept no browser-supplied instant, state, Course ownership,
or Selection data; the server derives retained-reference context and the
guarded accepting D1 statement rechecks it. Archival and reactivation retain
the row and never update a Selection. Deletion removes only an Active or
Archived Group with no retained Selection and consults no past-reference
audit. Local Module input, DST gap rejection, and overlap choices remain request
mechanics interpreted through the persisted Course timezone. The browser nests
`/admin/courses`, `/admin/courses/new`, and
`/admin/courses/:courseId` behind its current-Admin gate, while Worker
authorization remains authoritative for every operation.

### Participant Administration And Course Assignment HTTP Surface

The implemented `course-access` administration slice adds eight concrete
same-origin operations:

```text
GET  /api/admin/participants
GET  /api/admin/participants/:participantId
PUT  /api/admin/participants/:participantId
POST /api/admin/participants/:participantId/disablement
POST /api/admin/participants/:participantId/reenablement
GET  /api/admin/courses/:courseId/assignments
POST /api/admin/courses/:courseId/assignments
POST /api/admin/courses/:courseId/assignments/:assignmentId/revocation
```

| Operation | Authentication and current state | Results |
| --- | --- | --- |
| Participant directory | Normal session resolving a current Active Admin | `200 { participants }`; `401 unauthenticated`; exact `403` missing/Disabled Admin |
| Participant detail | Same plus an existing registered Active or Disabled Participant | `200` narrow Participant; `401`; exact `403`; `404 participant-not-found`; sanitized `500 technical-error` |
| Admin profile update | Same plus explicit complete `{ name, email }` profile and guarded current Active-Admin/current-target acceptance | `200` narrow updated Participant; `401`; exact `403`; `404 participant-not-found`; `422 invalid-name`/`invalid-email`; `409 email-already-exists`/`profile-not-updated`; sanitized `500 technical-error` |
| Participant Disable | Same plus a current Active Participant and guarded exact current instant | `200 { outcome: "disabled", participant, removedSelectionCount }`; `401`; exact `403`; `404 participant-not-found`; `409 participant-not-active`; sanitized `500 technical-error` |
| Participant Re-enable | Same plus a current Disabled Participant | `200 { outcome: "re-enabled", participant }`; `401`; exact `403`; `404 participant-not-found`; `409 participant-not-disabled`; sanitized `500 technical-error` |
| Course membership | Same plus an existing Active or Archived Course | `200 { assignments }`; `401`; exact `403`; `404 course-not-found` |
| Direct Assignment or reactivation | Same plus guarded current Active Admin, Active Course, and fully registered Active/Disabled Participant acceptance | `201 { outcome: "created", assignment }`; `200` `already-active` no-op or retained-row `reactivated`; `401`; exact `403`; `404` Course/Participant; `409` stale Course/target; `422 invalid-participant-id` |
| Assignment revocation | Same plus the requested retained Assignment in an Active or Archived Course | `200` `revoked` or `already-revoked` with the retained Assignment and exact future-Selection removal count; `401`; exact `403`; private `404 assignment-not-found`; `409` stale Course/Assignment; sanitized `500 technical-error` |

Participant list and detail items expose only `id`, `name`, `email`, and global
`state`. Profile writes change only name/email and preserve Participant
identity, state, principal, relationships, history, and same-principal Admin
data. Assignment items expose only `id`, Assignment `state`, and that same
minimum Participant representation. Lifecycle action resources accept no
browser-selected state, instant, Assignment, or Selection data. Disable uses
one guarded D1 batch to remove only future Scheduled-Module Selections across
all Courses and change the retained Participant to Disabled; exact-start,
begun, ended, and Cancelled history plus all Assignment states and same-
principal Admin data remain. Re-enable changes only that retained Participant
to Active and restores no removed Selection. The browser supplies only
`participantId`; the server derives Assignment identity and state, ignores
trust fields, freshly authorizes every request, and uses one guarded
uniqueness-backed upsert so a stale or concurrent attempt cannot create a
duplicate identity and a Revoked pair reuses its stable row. Revocation uses
one atomic D1 batch to retain the Assignment, change it to Revoked, and remove
only Scheduled Selections whose Module starts strictly after the accepted
instant. Exact-start or begun Scheduled history, all Cancelled history, and
other-Course membership and Selections remain unchanged; repeating revocation
is a successful no-op. Reactivation restores current assigned-Course access
when all current predicates permit it but never restores removed Selections.
`/admin/participants`
remains independent of membership so zero-Assignment Participants stay
discoverable, `/admin/participants/:participantId` owns stable profile and
lifecycle maintenance, and Course membership stays on the stable Course detail
route.

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
