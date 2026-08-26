# Dictionary

This file is the canonical terminology source for the repository. Use one term
for one concept and update this file when stable terminology changes.

## Repository Concepts

The product concepts below are accepted specification truth but are not yet
implemented.

### Admin

A role or capability that manages Courses, Groups, Modules, Course Assignments,
Course access, and shared Course Invites without prescribing an authorization
technology. See [Course access](product/course-access.md).

### Course

The primary booking-system container for Groups, Modules, Course Assignments,
one Course timezone, and at most one current shared Course Invite. A Course is
Active or Archived. See [the domain model](product/domain-model.md#course).

### Course Assignment

The Active or Revoked relationship stating that one Participant belongs to one
Course. It governs Course access independently of Module participation. See
[Course access](product/course-access.md#administrative-assignment).

### Course Invite

The Course-specific, person-independent shared invitation through which an
authenticated Participant may explicitly attempt to join a Course. A Course
has at most one current Invite. See
[shared Course Invite](product/course-access.md#shared-course-invite).

### Group

A permanently Course-owned, Active or Archived attendance option whose
identity and logistical details apply Course-wide rather than per Module. See
[Groups](product/course-structure.md#groups).

### Module

One non-recurring Scheduled or Cancelled occurrence in exactly one Course,
with a date and time interpreted in that Course's timezone. See
[Modules](product/course-structure.md#modules).

### Module Selection

The current-state relationship stating that one Participant intends to attend
one Module using one Group. Its absence means non-participation, and it does not
prove actual attendance. See
[Module participation](product/module-participation.md).

### Participant

A booking-system identity that may belong to Courses and make Module
Selections. It is conceptually separate from the external provider used to
authenticate. See
[authentication and identity](product/course-access.md#authentication-and-participant-identity).

## Meta And Internal Terms

### Application

An independently runnable or served workspace that composes conceptual
behavior with private technical implementations at an explicit runtime edge.

### Boundary Map

One workspace's explicit deny-by-default declaration of its package namespace,
allowed workspace dependencies, responsibility-module edges, and
composition-file permissions.

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

### Public Interface

The explicit named exports a source directory or conceptual package permits
other owners to use. It contains no hidden implementation access.

### Responsibility Module

A first-level `src/` module named for one conceptual responsibility or explicit
application role and governed by its workspace's [boundary map](#boundary-map).

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
