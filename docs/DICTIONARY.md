# Dictionary

This file is the canonical terminology source for the repository. Use one term
for one concept and update this file when stable terminology changes.

## Repository Concepts

The product concepts below are accepted specification truth but are not yet
implemented.

### Admin-Assisted Booking

An accepted operation in which an Active Admin User adds an existing
Participant to a Module and Group, changes the selected Group, or removes that
Participant's Module Selection. Setting a Group uses the normal booking
eligibility and `startsAt` deadline, may establish or reactivate the ordinary
Active Course Assignment as part of the same successful product outcome, and
is idempotent for the same Group while replacing a different Group. Removal
uses the same deadline and lifecycle constraints. The operation grants no
Admin override and creates no separate membership, booking entity, or Selection
state. See [Module
participation](product/module-participation.md#admin-assisted-booking).

### Admin Invite

A non-Course-specific, one-time invitation through which a person may
authenticate, supply a required real name, and create one ordinary Active Admin
User. Multiple Active Admin Invites may coexist. Successful onboarding makes
the Invite Claimed; an Active Admin User may instead Revoke it. Claimed and
Revoked are terminal, and Admin Invites do not expire automatically. See
[Admin access](product/admin-access.md#admin-invites).

### Admin User

A booking-system domain identity for a person authorized to operate the
administration experience. It is distinct from Participant and has its own
stable identity, required real name, Active or Disabled access state, ordinary
Admin or Super Admin authority, and deletion rules. Being an Admin User does
not make the person a Participant. See [Admin
access](product/admin-access.md#admin-user-identity).

### Admin User Real Name

The single required human-readable name an Admin User explicitly supplies or
confirms during onboarding. It is a booking-system property rather than trusted
authentication-provider profile data and may later be edited by an authorized
Admin User. See [real name and
onboarding](product/admin-access.md#real-name-and-onboarding).

### Course

The primary booking-system container for Groups, Modules, Course Assignments,
one Course timezone, and at most one current shared Course Invite. A Course is
Active or permanently Archived; it is never hard-deleted or restored. A
Scheduled Module whose `endsAt` is in the future blocks archival unless it is
explicitly resolved through its lifecycle. See [the domain
model](product/domain-model.md#course).

### Course Assignment

The Active or Revoked relationship stating that one Participant belongs to one
Course. It governs Course access independently of Module participation. A
Revoked Assignment may be reactivated only while its Course is Active. Direct
administration, Invite joining, and Admin-assisted booking produce the same
membership concept and behavior. See [Course access](product/course-access.md).

### Course Invite

The Course-specific, person-independent shared invitation through which an
authenticated Participant may explicitly attempt to join a Course. A Course
has at most one current Invite. A valid active Invite may expose the Course
name as minimal pre-join context but no Course-private information. See
[shared Course Invite](product/course-access.md#shared-course-invite).

### Course Timezone

The single timezone in which one Course's Module `startsAt` and `endsAt` values
are interpreted. It may change while the Course has no Modules and becomes
immutable once the first Module exists. See
[Course timezone](product/course-structure.md#course-timezone).

### External Authentication Identity

A provider-managed identity used to establish which booking-system domain
identity is acting. It may independently back a Participant, an Admin User, or
both without merging them, and the relationship remains compatible with a
domain identity having multiple external identities in the future. See
[the domain model](product/domain-model.md#external-authentication-identity).

### First Admin Bootstrap

The one-time installation flow that offers `Register admin` while no Admin User
has ever been created, regardless of whether Participants exist. The first
successful registrant authenticates, supplies a required real name, and becomes
the first Admin User and Super Admin. See [Admin
access](product/admin-access.md#first-admin-bootstrap).

### Group

A permanently Course-owned, Active or Archived attendance option whose
identity and logistical details apply Course-wide rather than per Module. See
[Groups](product/course-structure.md#groups).

### Module

One non-recurring Scheduled or Cancelled occurrence in exactly one Course. Its
schedule is `startsAt` and `endsAt`, both interpreted in the Course timezone,
with `endsAt > startsAt`; upcoming, in-progress, and ended are derived temporal
descriptions rather than lifecycle states. See
[Modules](product/course-structure.md#modules).

### Module Selection

The relationship recording that one Participant intends to attend one Module
using one Group. It may be created by the Participant or through Admin-assisted
booking. Its absence means non-participation; its live or historical meaning is
derived from surrounding state, and it does not prove actual attendance. See
[Module participation](product/module-participation.md).

### Participant

A booking-system domain identity for a person in participant-facing booking. A
Participant may belong to Courses through Course Assignments, access those
Courses, and make Module Selections. It is distinct from Admin User even when
the same external authentication identity backs both. See [the domain
model](product/domain-model.md#participant).

### Super Admin

The broader Admin User authority assigned to the first Admin User created by
bootstrap. It is an authorization classification on that Admin User, not a
separate identity entity. Ordinary Admin Users cannot mutate the Super Admin;
the Super Admin has broader mutation authority subject to explicit
self-protection. See [Admin
access](product/admin-access.md#super-admin-authority-and-protection).

## Meta And Internal Terms

### Application

An independently runnable or served workspace that composes conceptual
behavior with private technical implementations at an explicit runtime edge.

### Booking Package

The planned conceptual domain package at `packages/booking`. It owns booking
language, rules, and contracts through distinct `admin-access`,
`course-structure`, `course-access`, and `module-participation` responsibility
modules; it is not yet implemented. See
[Packages](architecture/packages.md#accepted-initial-package).

### Booking-System Web Application

The planned single deployable application at `apps/booking-system-web`. It owns
the browser/Vite experience, frontend static assets, Cloudflare Worker and
same-origin `/api/*` handling, private technical adapters, and the composition
root; it is not yet implemented. See
[Applications](architecture/applications.md#accepted-initial-boundary).

### Boundary Map

One workspace's explicit deny-by-default declaration of its package namespace,
allowed workspace dependencies, responsibility-module edges, and
composition-file permissions.

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

### Global Docs

Canonical repository-wide Markdown under `docs/`, routed through the root and
area `_index.md` files.

### Indexed Docs System

The documentation model separating [global docs](#global-docs) from optional
[co-located docs](#co-located-docs) and routing global docs through structured
indexes.

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
