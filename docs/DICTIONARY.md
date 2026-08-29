# Dictionary

This file is the canonical terminology source for the repository. Use one term
for one concept and update this file when stable terminology changes.

## Repository Concepts

The product concepts below are accepted specification truth. The first Admin
bootstrap, Course creation/editing, Course-wide-Group creation/editing/
archival/reactivation/deletion, future-Scheduled-Module creation,
Module descriptive editing, pre-start rescheduling, terminal cancellation, and
reference-protected permanent Module deletion,
Participant registration/profile maintenance, Course Assignment creation/
revocation/reactivation, Participant Disable/Re-enable, assigned Course access,
terminal Course archival with private read-only historical access, and
Participant-managed Module Selection subsets are implemented; remaining
concepts and later lifecycle behavior are still specifications until their
delivery tasks complete.

### Admin-Assisted Booking

An accepted operation in which an Active Admin User adds an existing Active
Participant to a Module and Group, changes the selected Group, or removes that
Participant's Module Selection. Setting a Group uses normal booking eligibility
and the `startsAt` deadline and may establish or reactivate the ordinary Course
Assignment in the same successful outcome. Refusal leaves no membership side
effect. The operation creates no Admin-specific booking, Selection, or
membership state. See [Module
participation](product/module-participation.md#admin-assisted-booking).

### Admin Invite

A non-Course-specific, one-time invitation through which a person may
authenticate, supply a required Admin User name, and create one ordinary Active
Admin User. Successful onboarding makes the Invite Claimed; an Active Admin
User may instead Revoke it. Claimed and Revoked are terminal, and Admin Invites
do not expire automatically. The complete URL is shown only at creation. See
[Admin access](product/admin-access.md#admin-invites).

### Admin User

A booking-system domain identity for a person authorized to operate the
administration experience. It is distinct from Participant and has its own
stable identity, required name, Active or Disabled access state, ordinary Admin
or Super Admin authority, and deletion rules. Being an Admin User does not make
the person a Participant. See [Admin
access](product/admin-access.md#admin-user-identity).

### Admin User Name

The one required human-readable name an Admin User explicitly supplies or
confirms during onboarding. It is a booking-system profile property, not domain
identity or authoritative authentication-provider data. An authorized Active
Admin User may edit it without changing identity, state, or authority. See
[name and onboarding](product/admin-access.md#name-and-onboarding).

### Course

The primary booking-system container for Groups, Modules, Course Assignments,
one Course timezone, and at most one current shared Course Invite. It has
required name and timezone plus optional description. A new Course is Active
and empty; an Archived Course is permanent and structurally read-only. The
local application implements terminal Active-to-Archived transition after
every Scheduled Module has ended or been Cancelled, without rewriting retained
structure or participation history. See [the
domain model](product/domain-model.md#course).

### Course Assignment

The Active or Revoked relationship stating that one Participant belongs to one
Course. It is Course-specific membership and remains distinct from Participant
global state and Module participation. Participant Course access requires both
an Active Participant and an Active Assignment. The local application
implements Admin discovery, Course membership reads, and direct creation or
idempotent retention of an Active Assignment, plus retained-row revocation and
Active-Course reactivation with exact future-Selection removal. Participant-
facing access follows fresh Assignment state across Active Courses and private
read-only Archived-Course history until revocation. See [Course
access](product/course-access.md#administrative-assignment).

### Course Invite

The Course-specific, person-independent shared invitation through which an
Active Participant may explicitly attempt to Join a Course. A Course has at
most one current Invite, which may be enabled, disabled, or replaced. A
recognized unusable Invite may reveal only its Course name; an unknown Invite
reveals no Course data. The local application implements the one-current
create/disable/re-enable/replace lifecycle, current URL retrieval/copy, and
minimal public recognition, signed session continuation, and explicit atomic
Join. Authentication or onboarding never accepts the Invite; missing
membership is created only after an Active Participant confirms, Active
membership is an idempotent success, and Revoked membership is not self-
reactivated. See [shared Course
Invite](product/course-access.md#shared-course-invite).

### Course Timezone

The single IANA/TZDB timezone used to interpret one Course's Module schedule,
defaulting to `Europe/Berlin`. It may change only while the Course is Active
and no Module has ever been successfully created in it. Successful creation of
the first Module permanently freezes it; deleting the first, last, or every
Module does not restore editability. The local application enforces that
permanent history on Course edits and guards a concurrent first Module against
being resolved with a stale timezone. Local schedule input resolves through
DST rules to definite instants. See [Course
timezone](product/course-structure.md#course-timezone).

### External Authentication Identity

The stable external principal presented by the chosen authentication layer to
establish which booking-system domain identity is acting. Several sign-in
methods may resolve to the same principal; different principals remain
different and are not merged because profile data matches. One principal may
independently back one Participant, one Admin User, or both. See [the domain
model](product/domain-model.md#external-authentication-identity) and
[authentication architecture](architecture/authentication-and-sessions.md#technical-principal-and-domain-identities).

### First Admin Bootstrap

The one-time installation flow available while no Admin User has ever been
created, regardless of whether Participants exist. The first successfully
accepted registrant authenticates, supplies a required Admin User name, and
becomes an Active Super Admin. See [Admin
access](product/admin-access.md#first-admin-bootstrap).

The local application foundation implements this flow and its permanent
exactly-once bootstrap history; that local acceptance is not a production
release.

### Group

A permanently Course-owned, Active or Archived attendance option with required
name and optional free-text details. It applies Course-wide rather than per
Module. Active Group names are unique within one Course after normalized,
case-insensitive comparison. The local application implements complete field
editing in either state, archival blocked only by a retained Selection for a
future Scheduled Module, and retained-identity reactivation with current
Active-name uniqueness. Archival never removes or rewrites a Selection, and a
retained selected Group keeps its identity and details in Participant history.
An Active Admin User may permanently delete an Active or Archived Group in an
Active Course only when no currently retained Module Selection references it.
Every retained live or historical Selection blocks deletion; a removed or
replaced Selection that no longer exists does not, and the application invents
no separate complete reference audit.
See [Groups](product/course-structure.md#groups).

### Module

One non-recurring Scheduled or terminal Cancelled occurrence in exactly one
Course. It has required title, `startsAt`, and `endsAt`, optional description
and instructions, and no separate timezone. Its definite interval determines
upcoming, in-progress, and ended descriptions. Descriptive fields remain
editable in an Active Course throughout its lifetime. A Scheduled interval is
editable only before its current start and only to another strictly future
valid interval; begun schedules are immutable. Either accepted edit preserves
identity and retained Selections. An Active Admin User may
terminally Cancel a Scheduled Module before its exact `endsAt`, including
while it is in progress. Cancellation preserves identity, schedule, content,
and every retained Selection, which immediately becomes historical and cannot
be changed or removed. Cancelled schedules remain immutable. An Active Admin
User may permanently delete a Scheduled or Cancelled Module in an Active
Course only when no currently retained Selection references it, regardless of
time position. Deletion removes only that row and never restores Course
timezone editability; a retained live or historical Selection blocks it. See
[Modules](product/course-structure.md#modules).

### Module Selection

The relationship recording that one Participant intends to attend one Module
using one Group. Absence means non-participation. A retained Selection is live
only while Participant, Course, and Assignment are Active, the Module is
Scheduled, and `now < endsAt`; otherwise it is historical. It does not prove
attendance. See [Module participation](product/module-participation.md).
The current local application implements Participant set/change/remove before
`startsAt` and derives current or historical presentation without storing a
Selection status; Admin-assisted Selection remains later work.

### Participant

A fully registered booking-system domain identity for a person in
participant-facing booking. A Participant has required name and unique email,
Active or Disabled global state, zero or more Course Assignments, and zero or
more Module Selections. It remains distinct from Admin User even when one
external authentication identity backs both. See [the domain
model](product/domain-model.md#participant).

### Participant Disabled State

The reversible global state that removes normal participant-facing access
without deleting Participant identity or changing Course Assignment states.
Disable removes future Scheduled-Module Selections and retains in-progress,
ended, and Cancelled-Module Selections as history. Re-enable restores only
currently eligible access and never restores removed Selections. The local
application implements guarded atomic Disable and retained-identity Re-enable
with fresh access state. See [Participant global access
state](product/course-access.md#participant-global-access-state).

### Participant Email

The required valid email profile property of a registered Participant. It is
retained after surrounding whitespace is trimmed and the resulting complete
string is validated, and is unique by case-insensitive comparison of the
complete trimmed address. No provider-specific transformation or alias
inference applies. It is neither Participant identity nor a basis for merging
external principals or Participants. See [Participant
profile](product/course-access.md#participant-profile).
The local application implements self-service Active-Participant and
Active-Admin edits with this exact storage/comparison rule.

### Participant Name

The required human-readable profile property of a registered Participant. It
is non-unique, may match another Participant's name, and is neither Participant
identity nor proof that two external principals belong to one person. See
[Participant profile](product/course-access.md#participant-profile).
The local application lets an Active Participant or Active Admin User edit this
property without changing Participant identity or relationships.

### Participant Onboarding

The mandatory participant registration step after a new external principal
authenticates in participant context. Valid Participant name and email complete
registration and create an Active Participant. Incomplete onboarding is not a
Participant lifecycle state and grants no normal application or Course access.
The local application implements this explicit registration and the truthful
zero-Assignment home.
See [Participant registration and
onboarding](product/course-access.md#participant-registration-and-onboarding).

### Super Admin

The broader Admin User authority automatically assigned to the first
successfully bootstrap-created Admin User and later available through explicit
promotion of an Active ordinary Admin User by an Active Super Admin. Several
Super Admins may coexist. Promotion preserves identity, no demotion exists in
v1, and every accepted mutation must leave at least one Active Super Admin. See
[Admin access](product/admin-access.md#super-admin-promotion).

## Meta And Internal Terms

### Application

An independently runnable or served workspace that composes conceptual
behavior with private technical implementations at an explicit runtime edge.

### Authentication Layer

The application-owned technical responsibility that authenticates a request
and establishes one stable [external authentication
identity](#external-authentication-identity). It does not own Participant,
Admin User, or booking authorization decisions. The implemented initial layer
uses Better Auth inside the web application's Worker. See [Authentication and
sessions](architecture/authentication-and-sessions.md#accepted-composition).

### Authentication Session

The application-owned technical relationship that keeps one external
principal authenticated across requests. The implemented initial model is a
database-backed opaque server-side session identified by a secure
same-origin `HttpOnly` cookie; it contains no booking authorization snapshot.
See [Session
model](architecture/authentication-and-sessions.md#session-model).

### Booking Package

The conceptual domain package `@booking-system/booking` at `packages/booking`.
Its implemented `admin-access` module owns the first Admin behavior, and its
implemented `course-structure` module owns Course, Course-wide Group, future
Scheduled Module, Course editing with its permanent timezone lock, terminal
Course archival, and
Group editing/archival/reactivation/permanent deletion with retained Selection
policy, plus Course-local definite-time creation and pre-start-rescheduling
policy with lifetime Module descriptive editing, terminal state-only
cancellation, and reference-protected permanent Module deletion. Its
implemented `course-access` module owns fresh Participant context and
registration/profile policy plus Course Assignment creation/lifecycle and
Participant lifecycle plus assigned Active/Archived-Course access; Invite
behavior in that module now includes one-current shared Course Invite
management, minimal recognition, and explicit Join policy. Its implemented
`module-participation` module owns Participant Selection eligibility,
set/change/remove, and derived current/history policy, with Admin-assisted
behavior still deferred. See
[Packages](architecture/packages.md#accepted-initial-package).

### Booking-System Web Application

The implemented single deployable application
`@booking-system/booking-system-web` at `apps/booking-system-web`. It owns the
browser/Vite experience, frontend static assets, Cloudflare Worker and
same-origin `/api/*` handling including Participant registration/directory,
Participant profile maintenance, Course membership/direct Assignment,
Assignment revocation/reactivation, Participant Disable/Re-enable, Participant
Module Selection, Course creation/editing, and Course-owned Group/Module
creation plus Group editing/archival/reactivation and permanent deletion of
unreferenced Groups plus Module descriptive editing/pre-start rescheduling,
terminal Module cancellation with retained Selection history,
permanent deletion of unreferenced Modules with Course timezone history intact,
terminal Course archival with read-only Admin/Participant presentation,
shared Course Invite persistence and Admin lifecycle HTTP plus the public
fragment-to-signed-session `/invite` continuation and explicit Join surface,
private technical adapters, and composition roots.
See
[Applications](architecture/applications.md#accepted-initial-boundary).

### Boundary Map

One workspace's explicit deny-by-default declaration of its package namespace,
allowed workspace dependencies, responsibility-module edges, exact
third-party permissions, composition-file interfaces, and test-only
permissions.

### CI Gate

The automated verification result that must succeed before a change may merge
or advance toward release. The current GitHub status check is named `verify`.

### Co-Located Docs

Optional Markdown files named `*.docs.md` that live next to one concrete source
or configuration file and capture local guidance difficult to recover quickly
from code alone. They are discovered by adjacency, not global indexing.

### Composition File

An application-root source file explicitly permitted to join selected
responsibility modules and private technical implementations. It owns wiring,
not product policy.

### Conceptual Domain

A stable product responsibility with its own language, rules, and change
pressure. Technical mechanisms implement conceptual domains but do not become
peer domains by default.

### Deployment

Making one application version available in a specific runtime environment. A
normal merge to `main` is not a production deployment in this repository.

### Development Backlog

The repository-local `.markplane/` project containing development epics,
tasks, dependencies, plans, and notes. It is planning state, not canonical
repository truth or product runtime data.

### Domain-Oriented Functional Composition

The implemented JavaScript style in which vertical-slice
workflows compose named domain or application instructions over plain data,
receive narrow explicit capabilities, keep conceptual decisions visible, and
extract abstractions only after concrete evidence. Functional techniques and
optional Ramda may support this style but do not create a peer architecture or
override conceptual ownership. The first slice uses plain JavaScript without
Ramda. See [vertical slices](#vertical-slice) and [JavaScript
conventions](architecture/javascript-conventions.md#architecture-before-technique).

### Global Docs

Canonical repository-wide Markdown under `docs/`, routed through the root and
area `_index.md` files.

### Indexed Docs System

The documentation model separating [global docs](#global-docs) from optional
[co-located docs](#co-located-docs) and routing global docs through structured
indexes.

### Non-Production Authentication

The implemented, separately composed test-only mechanism that establishes normal
[authentication sessions](#authentication-session) for deterministic named
fixed Admin and Participant fixture identities without automating third-party
provider UIs or bypassing booking-domain authorization. It must be unavailable
in production. See
[Non-production authentication](architecture/authentication-and-sessions.md#non-production-authentication).

### Production

The live application environment and its dedicated D1 database. Destructive
regression tests never target production; only safe post-deployment smoke
checks do.

### Public Interface

The explicit named exports a source directory or conceptual package permits
other owners to use. It contains no hidden implementation access.

### Release

The accepted tag-triggered process that re-verifies a commit already contained
in `main`, validates it in a real staging or preview environment, and then
promotes that same commit to production. Release automation is planned but not
yet implemented.

### Release Hardening

The planned delivery phase after the MVP is feature-complete and accepted
locally in which account-bound deployment infrastructure, hosted staging
verification, deployment credentials, and the production release path are
established and validated. It must be complete before the first production
release. See [Releases](process/releases.md#current-state-and-release-hardening-trigger).

### Responsibility Module

A first-level `src/` module named for one conceptual responsibility or explicit
application role and governed by its workspace's [boundary map](#boundary-map).

### Staging

The isolated pre-production environment used to verify a release version in
the real hosting runtime before production promotion. It uses non-production
test data and a D1 database separate from production.

### Technical Mechanism

A replaceable implementation detail such as a runtime engine, transport,
database, object store, framework, provider SDK, or native command. It remains
private behind conceptual language.

### Vertical Slice

A focused change path within one responsibility module, usually organized
around one use case rather than a horizontal technical layer.

### Workspace

One application or conceptual package directory. Each workspace owns one
package manifest and one [boundary map](#boundary-map); internal
[responsibility modules](#responsibility-module) share those workspace-level
artifacts unless an accepted independent boundary later extracts them into
actual workspaces. A manifest declares dependency availability but does not
grant architectural import permission.
