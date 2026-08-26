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

- an authenticated Participant or Admin User identity;
- Admin User and Participant actions governed by the focused product rules;
- Course-local Module intervals interpreted in the Course timezone; and
- current Course, Group, Module, Course Assignment, Course Invite, Admin Invite,
  and Module Selection state.

## Outputs

- one consistent interpretation of every domain term;
- validity constraints for relationships and state changes; and
- the smallest accepted lifecycle state set.

## Adjacent Parts

The model composes with [Admin access](admin-access.md),
[Course access](course-access.md), [Course structure and lifecycle](course-structure.md),
and [Module participation](module-participation.md).

## Canonical Vocabulary

### External Authentication Identity

An [external authentication identity](../DICTIONARY.md#external-authentication-identity)
is a provider-managed identity used to establish which booking-system domain
identity is acting. The system MUST support external identities including
Google, Apple, Microsoft, and Facebook without prescribing an authentication
product.

An external authentication identity may establish access to a Participant, an
Admin User, or both independently. The same provider identity MAY
simultaneously back one Participant and one Admin User, but MUST NOT merge them
into one domain entity. The surrounding participant or administration context
determines which identity and authority is being used.

The relationship MUST remain compatible with a Participant or Admin User
having multiple external authentication identities in the future. The initial
product does not require self-service identity linking and MUST NOT
automatically merge domain identities merely because email, display name, or
other personal data matches.

### Participant

A [Participant](../DICTIONARY.md#participant) is the domain identity for a
person in participant-facing booking. A Participant may belong to zero, one,
or multiple Courses and make Module Selections. Participant Course membership,
Course Assignments, Module Selections, and Course access remain independent of
any Admin User identity backed by the same external authentication identity.

### Admin User

An [Admin User](../DICTIONARY.md#admin-user) is the distinct domain identity
for a person authorized to operate the administration side of the booking
system. It has a stable identity, required real name, current administrative
access state, and ordinary Admin or Super Admin authority. Admin access MUST
NOT be modeled as a property on Participant, and neither entity's existence
MUST imply the other's.

### Super Admin

A [Super Admin](../DICTIONARY.md#super-admin) is the first bootstrap-created
Admin User with broader authorization over Admin Users. Super Admin is an
authority classification, not a separate identity entity. Admin Invites create
ordinary Admin Users and MUST NOT grant Super Admin authority by default.

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
within exactly one Course. Its schedule is the interval from `startsAt` to
`endsAt`, both interpreted in the Course timezone, and `endsAt` MUST be later
than `startsAt`. A Module is either Scheduled or Cancelled. Upcoming, started,
and ended descriptions are derived from the interval rather than lifecycle
states. At the exact `startsAt` instant, the Module has started; at the exact
`endsAt` instant, it has ended. A Module belongs permanently to its Course.

### Course Assignment

A [Course Assignment](../DICTIONARY.md#course-assignment) represents:

> Participant belongs to Course.

A Participant has at most one Course Assignment for a given Course. The
Assignment is Active or Revoked. Active grants Course access and permits
otherwise eligible Module Selections; Revoked prevents access and participation
under the access rules.

Direct administrative assignment, invite-based joining, and membership created
or reactivated through Admin-assisted booking MUST produce the same Course
Assignment concept. Origin MUST NOT create behavioral states such as invited,
manually assigned, booking-created, or self-enrolled. Origin MAY later be audit
metadata, but it MUST NOT affect Participant behavior.

### Module Selection

A [Module Selection](../DICTIONARY.md#module-selection) represents:

> Participant P intends to participate in Module M using Group G.

For one Participant and Module, at most one Module Selection may exist. Absence
means the Participant is not participating. A Module Selection records booking
intent, not proof of attendance. Whether an existing Selection is an active
booking or a historical record is derived from the surrounding Course, Module,
and Course Assignment state. The Selection has no unanswered, declined,
requested, pending, approved, waitlisted, or cancelled-booking state.

### Course Invite

A [Course Invite](../DICTIONARY.md#course-invite) is a Course-specific,
person-independent shared invitation. A Course has at most one current Invite.
Possession authorizes a person to attempt to join, subject to authentication,
explicit confirmation, Course state, Invite state, and prior revocation. One
Invite may intentionally be used by multiple people.

### Admin Invite

An [Admin Invite](../DICTIONARY.md#admin-invite) is a non-Course-specific,
one-time path toward creating an ordinary Admin User. Multiple Active Admin
Invites may coexist independently. It is Active until successfully Claimed or
manually Revoked and does not expire automatically.

## Conceptual Relationships

```text
Participant ← Course Assignment → Course
Course → Groups
Course → Modules
Participant + Module → selected Group
Course → shared Invite
External authentication identity → Participant
External authentication identity → Admin User
Admin Invite → ordinary Admin User
Admin User → administration actions
```

A Module Selection is valid only when its Participant, Module, and Group all
resolve through the same Course according to the invariants below.

## Hard Invariants

1. A Group MUST belong to exactly one Course.
2. A Module MUST belong to exactly one Course.
3. A Participant MUST have at most one Course Assignment to a given Course.
4. A new Course Assignment MUST NOT be created for an Archived Course, whether
   by direct administration, a shared Course Invite, or Admin-assisted booking.
5. A Revoked Course Assignment MUST NOT be reactivated while its Course is
   Archived.
6. A Participant MUST have at most one Module Selection for a given Module.
7. Every Module Selection MUST reference exactly one Participant, one Module,
   and one Group.
8. A Module Selection's Group and Module MUST belong to the same Course.
9. A Participant MUST have an Active Course Assignment to that Course when
   creating or changing their own Module Selection.
10. An Admin-assisted set-Selection operation MUST target an existing
    Participant. It MAY create or reactivate that Participant's Active Course
    Assignment only as part of the same successful product operation that sets
    the Module Selection; an already-Active Assignment MUST remain Active and
    no duplicate Assignment may be created.
11. Any Participant-created or Admin-assisted creation or replacement of a
    Module Selection MUST require an Active Course, a Scheduled Module whose
    `startsAt` is still in the future, and an Active Group in that Module's
    Course.
12. A refused Admin-assisted set-Selection operation MUST NOT leave behind a
    newly created or reactivated Course Assignment.
13. Setting the selected Group to the already-selected Group MUST be
    idempotent. Setting another eligible Group MUST replace the existing
    Selection rather than create a second Selection.
14. Admin-assisted removal MUST require an Active Course and a Scheduled
    Module whose `startsAt` is still in the future. Successful removal MUST
    result in no Module Selection and MUST NOT create an Admin-specific
    cancellation state.
15. Course membership MUST NOT automatically assign a Participant to a Module
    or Group.
16. No Module Selection MUST mean non-participation in that Module.
17. Group choice MUST be per Module. A Participant MAY use different Groups for
    different Modules in the same Course.
18. Group identity and details MUST be Course-wide, not Module-specific.
19. Human-readable Course, Group, and Module names MUST NOT be their domain
    identity. Renaming MUST preserve existing relationships.
20. Every Module MUST satisfy `endsAt > startsAt`.
21. Before `startsAt`, an Active Admin User MAY change a Module's `startsAt` or
    `endsAt` only while the resulting interval remains valid. At or after
    `startsAt`, neither value may change.
22. A Course timezone MAY change only while the Course has no Modules. Once the
    first Module exists, the Course timezone MUST NOT change.
23. A Course MUST NOT transition from Active to Archived while it contains a
    Scheduled Module whose `endsAt` is in the future. This includes upcoming
    and in-progress Scheduled Modules; at the exact `endsAt` instant, the
    Module has ended and no longer blocks archival on temporal grounds.
24. A Cancelled Module MUST NOT block Course archival merely because its
    original `endsAt` is in the future. Course archival MUST NOT itself Cancel
    a Module or mutate Module Selections.
25. A Course MUST NOT be hard-deleted or transition from Archived back to
    Active.
26. Cancelling a Module MUST preserve its existing Module Selections as
    historical records, but those Selections MUST NOT remain active bookings.
27. Participant and Admin User MUST remain distinct domain entities with
    independent responsibilities and lifecycles.
28. Being a Participant MUST NOT automatically make a person an Admin User,
    and being an Admin User MUST NOT automatically make a person a Participant.
29. One external authentication identity MAY back both one Participant and one
    Admin User without merging them.
30. A Disabled Admin User MUST NOT have administrative access.
31. Only the first-ever successfully created Admin User MUST receive the
    initial Super Admin authority through bootstrap.
32. An Active Admin Invite MUST transition permanently to Claimed only after
    successful Admin User creation, or to Revoked after manual Revocation.
33. A Claimed or Revoked Admin Invite MUST NOT become usable again.

## Minimal State Model

| Concept | Complete state model |
| --- | --- |
| Course | Active or Archived |
| Group | Active or Archived |
| Module | Scheduled or Cancelled |
| Course Assignment | Active or Revoked |
| Module Selection | Exists with exactly one selected Group, or does not exist; when it exists, live or historical meaning is derived from surrounding state |
| Course Invite | When present, current and enabled, or disabled and non-usable; replacement invalidates the predecessor |
| Admin User | Exists as Active or Disabled; an ordinary Admin User may instead be deleted, which is distinct from Disabled |
| Admin User authority | Ordinary Admin or Super Admin; no promotion, transfer, replacement, or additional Super Admin lifecycle is currently defined |
| Admin Invite | Active, Claimed, or Revoked; Claimed and Revoked are terminal |

For a Scheduled Module, upcoming, started or in-progress, and ended descriptions
are derived from `startsAt` and `endsAt`; the Module is ended at the exact
`endsAt` instant. A Course MAY have no Course Invite. Further lifecycle states
MUST NOT be introduced without an explicit requirement.

## Identity And Naming

Renaming a Course, Group, or Module MUST preserve the same domain object and
all existing relationships. Similar names do not imply duplicate identity:

- two Courses MAY have the same or similar name;
- two Modules MAY have the same or similar name, `startsAt`, `endsAt`, or
  description;
  and
- active Group choices in one Course MUST remain distinguishable, so Group
  names SHOULD be unique within that Course.

Sophisticated duplicate detection is not a domain invariant. A future
administration experience MAY warn about suspicious duplicates without
changing identity rules.

## Normal Empty And Partial States

All of the following are valid and MUST NOT require placeholder data:

- an Active Course with zero Participants;
- an installation with Participants but no Admin User ever created;
- an Active Course with zero Modules;
- an Active Course with zero Groups;
- a Participant assigned to a Course with zero Module Selections;
- a Module with zero Participants;
- a Group with zero selections;
- a new Module added after a Course has already started;
- a Participant joining after some Course Modules are in the past; and
- multiple independently Active Admin Invites.

If an Active Course has no Active Groups, no valid Module Selection can be
created until at least one Active Group exists.
