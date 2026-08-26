# Domain Model

## Responsibility

This document owns the booking system's canonical vocabulary, conceptual
relationships, cross-concept invariants, identity rules, minimal lifecycle
states, and valid empty states.

## Not Responsible For

This document does not define authentication and access flows, Course content
lifecycle operations, participant booking actions, implementation
architecture, or technology.

## Inputs

- an authenticated booking-system Participant identity;
- Admin and Participant actions governed by the focused product rules;
- Course-local Module times interpreted in the Course timezone; and
- current Course, Group, Module, Assignment, Invite, and Selection state.

## Outputs

- one consistent interpretation of every domain term;
- validity constraints for relationships and state changes; and
- the smallest accepted lifecycle state set.

## Adjacent Parts

The model composes with [Course access](course-access.md),
[Course structure and lifecycle](course-structure.md), and
[Module participation](module-participation.md).

## Canonical Vocabulary

### Participant

A [Participant](../DICTIONARY.md#participant) is a booking-system user who may
belong to zero, one, or multiple Courses and make Module Selections.
Authentication establishes which Participant is acting. The Participant
identity is conceptually separate from any external identity provider used to
authenticate.

### Admin

An [Admin](../DICTIONARY.md#admin) is a role or capability that manages Courses,
Groups, Modules, Course Assignments, Course access, Participants' membership,
and Course Invites. This role does not prescribe an authorization mechanism.

### Course

A [Course](../DICTIONARY.md#course) is the primary container. It has:

- zero or more Groups;
- zero or more Modules;
- zero or more Course Assignments;
- at most one current shared Course Invite;
- exactly one Course timezone; and
- either Active or Archived state.

A Participant may be assigned to multiple Courses. Course names do not need to
be globally unique.

### Group

A [Group](../DICTIONARY.md#group) is one attendance option within exactly one
Course. It may have a human-readable name and Course-wide logistical details,
such as a physical location, room, meeting link, or access instructions. It has
no special physical, remote, hybrid, provider, or platform type.

A Group belongs permanently to one Course and is either Active or Archived.
Active Groups in one Course MUST be distinguishable to Participants; their
names SHOULD therefore be unique within that Course. Groups are Course-wide,
not Module-specific.

### Module

A [Module](../DICTIONARY.md#module) is one non-recurring scheduled occurrence
within exactly one Course. It occurs at a specific date and time interpreted in
the Course timezone and is either Scheduled or Cancelled. Upcoming, starting,
and past are derived from that date and time rather than lifecycle states. A
Module belongs permanently to its Course.

### Course Assignment

A [Course Assignment](../DICTIONARY.md#course-assignment) represents:

> Participant belongs to Course.

A Participant has at most one Course Assignment for a given Course. The
Assignment is Active or Revoked. Active grants Course access and permits
otherwise eligible Module Selections; Revoked prevents access and participation
under the access rules.

Admin assignment and invite-based joining MUST produce the same Course
Assignment concept. Origin MUST NOT create behavioral states such as invited,
manually assigned, or self-enrolled. Origin MAY later be audit metadata, but it
MUST NOT affect Participant behavior.

### Module Selection

A [Module Selection](../DICTIONARY.md#module-selection) represents:

> Participant P intends to participate in Module M using Group G.

For one Participant and Module, at most one Module Selection may exist. Absence
means the Participant is not participating. A Module Selection is authoritative
current booking intent, not proof of attendance, and has no unanswered,
declined, requested, pending, approved, waitlisted, or cancelled-booking state.

### Course Invite

A [Course Invite](../DICTIONARY.md#course-invite) is a Course-specific,
person-independent shared invitation. A Course has at most one current Invite.
Possession authorizes a person to attempt to join, subject to authentication,
explicit confirmation, Course state, Invite state, and prior revocation. One
Invite may intentionally be used by multiple people.

## Conceptual Relationships

```text
Participant ← Course Assignment → Course
Course → Groups
Course → Modules
Participant + Module → selected Group
Course → shared Invite
```

A Module Selection is valid only when its Participant, Module, and Group all
resolve through the same Course according to the invariants below.

## Hard Invariants

1. A Group MUST belong to exactly one Course.
2. A Module MUST belong to exactly one Course.
3. A Participant MUST have at most one Course Assignment to a given Course.
4. A Participant MUST have at most one Module Selection for a given Module.
5. Every Module Selection MUST reference exactly one Participant, one Module,
   and one Group.
6. A Module Selection's Group and Module MUST belong to the same Course.
7. A Participant MUST have an Active Course Assignment to that Course when
   creating or changing a Module Selection.
8. A Participant MUST NOT create or change a Module Selection at or after the
   Module's start time.
9. A Participant MUST NOT select an Archived Group.
10. A Participant MUST NOT select a Cancelled Module.
11. Course membership MUST NOT automatically assign a Participant to a Module
    or Group.
12. No Module Selection MUST mean non-participation in that Module.
13. Group choice MUST be per Module. A Participant MAY use different Groups for
    different Modules in the same Course.
14. Group identity and details MUST be Course-wide, not Module-specific.
15. Human-readable Course, Group, and Module names MUST NOT be their domain
    identity. Renaming MUST preserve existing relationships.

## Minimal State Model

| Concept | Complete state model |
| --- | --- |
| Course | Active or Archived |
| Group | Active or Archived |
| Module | Scheduled or Cancelled |
| Course Assignment | Active or Revoked |
| Module Selection | Exists with exactly one selected Group, or does not exist |
| Course Invite | When present, current and enabled, or disabled and non-usable; replacement invalidates the predecessor |

For a Scheduled Module, past and future are derived from its date and time.
A Course MAY have no Course Invite. Further lifecycle states MUST NOT be
introduced without an explicit requirement.

## Identity And Naming

Renaming a Course, Group, or Module MUST preserve the same domain object and
all existing relationships. Similar names do not imply duplicate identity:

- two Courses MAY have the same or similar name;
- two Modules MAY have the same or similar name, date and time, or description;
  and
- active Group choices in one Course MUST remain distinguishable, so Group
  names SHOULD be unique within that Course.

Sophisticated duplicate detection is not a domain invariant. A future Admin
experience MAY warn about suspicious duplicates without changing identity
rules.

## Normal Empty And Partial States

All of the following are valid and MUST NOT require placeholder data:

- an Active Course with zero Participants;
- an Active Course with zero Modules;
- an Active Course with zero Groups;
- a Participant assigned to a Course with zero Module Selections;
- a Module with zero Participants;
- a Group with zero selections;
- a new Module added after a Course has already started; and
- a Participant joining after some Course Modules are in the past.

If an Active Course has no Active Groups, no valid Module Selection can be
created until at least one Active Group exists.
