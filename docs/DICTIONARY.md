# Dictionary

This file is the canonical terminology source for the repository. Use one term
for one concept and update this file when stable terminology changes.

## Repository Concepts

The product concepts below are accepted specification truth but are not yet
implemented.

### Admin

The same booking-system Participant identity with Admin capability enabled. The
capability defaults to false and permits user administration, Course access and
structure management, and accepted assisted-booking actions without defining a
separate Admin identity or prescribing authorization technology. See
[Course access](product/course-access.md).

### Admin-Assisted Booking

The Admin capability to add an existing booking-system user to a Module and
Group or remove that user's Module Selection. It uses the same Module Selection
as Participant booking, while its deadline, Course Assignment prerequisite,
replacement behavior, and explicit change action remain unresolved. See
[Module participation](product/module-participation.md#admin-assisted-booking).

### Course

The primary booking-system container for Groups, Modules, Course Assignments,
one Course timezone, and at most one current shared Course Invite. A Course is
Active or permanently Archived; it is never hard-deleted or restored. See
[the domain model](product/domain-model.md#course).

### Course Assignment

The Active or Revoked relationship stating that one Participant belongs to one
Course. It governs Course access independently of Module participation. A
Revoked Assignment may be reactivated only while its Course is Active. See
[Course access](product/course-access.md#administrative-assignment).

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

A provider-managed identity used to establish which Participant is acting. It
is not the booking-system Participant identity; the relationship remains
compatible with one Participant having multiple external authentication
identities in the future. See
[authentication and Participant identity](product/course-access.md#authentication-and-participant-identity).

### First-User Admin Bootstrap

The empty-installation flow that offers `Register admin` only while no
booking-system Participant exists. The first successful registration creates
the first Participant with Admin capability, after which the flow closes. A
later absence of Admin capability does not reopen it. See
[Course access](product/course-access.md#first-user-admin-bootstrap).

### Group

A permanently Course-owned, Active or Archived attendance option whose
identity and logistical details apply Course-wide rather than per Module. See
[Groups](product/course-structure.md#groups).

### Module

One non-recurring Scheduled or Cancelled occurrence in exactly one Course. Its
schedule is `startsAt` and `endsAt`, both interpreted in the Course timezone,
with `endsAt > startsAt`. See [Modules](product/course-structure.md#modules).

### Module Selection

The relationship recording that one Participant intends to attend one Module
using one Group. It may be created by the Participant or through Admin-assisted
booking. Its absence means non-participation; its live or historical meaning is
derived from surrounding state, and it does not prove actual attendance. See
[Module participation](product/module-participation.md).

### Participant

A booking-system user identity that may belong to Courses, make Module
Selections, and have Admin capability. It is conceptually separate from the
external identities used to authenticate and may support more than one such
identity in the future. See
[authentication and identity](product/course-access.md#authentication-and-participant-identity).

## Meta And Internal Terms

### Application

An independently runnable or served workspace that composes conceptual
behavior with private technical implementations at an explicit runtime edge.

### Booking Package

The planned conceptual domain package at `packages/booking`. It owns booking
language, rules, and contracts through distinct `course-structure`,
`course-access`, and `module-participation` responsibility modules; it is not
yet implemented. See
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

One application or conceptual package directory with its own package manifest
and [boundary map](#boundary-map).
