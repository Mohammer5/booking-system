# Dictionary

This file is the canonical terminology source for the repository. Use one term
for one concept and update this file when stable terminology changes.

## Repository Concepts

The product concepts below are accepted specification truth. The first Admin
bootstrap and Course, Course-wide Group, and future Scheduled Module creation
subsets are implemented; remaining concepts and later lifecycle behavior are
still specifications until their delivery tasks complete.

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
and empty; an Archived Course is permanent and structurally read-only. See [the
domain model](product/domain-model.md#course).

### Course Assignment

The Active or Revoked relationship stating that one Participant belongs to one
Course. It is Course-specific membership and remains distinct from Participant
global state and Module participation. Participant Course access requires both
an Active Participant and an Active Assignment. See [Course
access](product/course-access.md#administrative-assignment).

### Course Invite

The Course-specific, person-independent shared invitation through which an
Active Participant may explicitly attempt to Join a Course. A Course has at
most one current Invite, which may be enabled, disabled, or replaced. A
recognized unusable Invite may reveal only its Course name; an unknown Invite
reveals no Course data. See [shared Course
Invite](product/course-access.md#shared-course-invite).

### Course Timezone

The single IANA/TZDB timezone used to interpret one Course's Module schedule,
defaulting to `Europe/Berlin`. It may change only while the Course is Active
and no Module has ever been successfully created in it. Successful creation of
the first Module permanently freezes it; deleting the first, last, or every
Module does not restore editability. Local schedule input resolves through DST
rules to definite instants. See [Course
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
case-insensitive comparison. See [Groups](product/course-structure.md#groups).

### Module

One non-recurring Scheduled or terminal Cancelled occurrence in exactly one
Course. It has required title, `startsAt`, and `endsAt`, optional description
and instructions, and no separate timezone. Its definite interval determines
upcoming, in-progress, and ended descriptions. See
[Modules](product/course-structure.md#modules).

### Module Selection

The relationship recording that one Participant intends to attend one Module
using one Group. Absence means non-participation. A retained Selection is live
only while Participant, Course, and Assignment are Active, the Module is
Scheduled, and `now < endsAt`; otherwise it is historical. It does not prove
attendance. See [Module participation](product/module-participation.md).

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
ended, and Cancelled-Module Selections as history. See [Participant global
access state](product/course-access.md#participant-global-access-state).

### Participant Email

The required valid email profile property of a registered Participant. It is
retained after surrounding whitespace is trimmed and the resulting complete
string is validated, and is unique by case-insensitive comparison of the
complete trimmed address. No provider-specific transformation or alias
inference applies. It is neither Participant identity nor a basis for merging
external principals or Participants. See [Participant
profile](product/course-access.md#participant-profile).

### Participant Name

The required human-readable profile property of a registered Participant. It
is non-unique, may match another Participant's name, and is neither Participant
identity nor proof that two external principals belong to one person. See
[Participant profile](product/course-access.md#participant-profile).

### Participant Onboarding

The mandatory participant registration step after a new external principal
authenticates in participant context. Valid Participant name and email complete
registration and create an Active Participant. Incomplete onboarding is not a
Participant lifecycle state and grants no normal application or Course access.
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
Scheduled Module, and Course-local definite-time creation policy. The accepted
`course-access` and `module-participation` modules arrive with later product
slices. See
[Packages](architecture/packages.md#accepted-initial-package).

### Booking-System Web Application

The implemented single deployable application
`@booking-system/booking-system-web` at `apps/booking-system-web`. It owns the
browser/Vite experience, frontend static assets, Cloudflare Worker and
same-origin `/api/*` handling including Course-owned Group/Module creation,
private technical adapters, and composition roots. See
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
fixture identities without automating third-party provider UIs or bypassing
booking-domain authorization. It must be unavailable in production. See
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
