# Domain Model

## Responsibility

This document owns the booking system's canonical vocabulary, conceptual
relationships, cross-concept invariants, identity rules, minimal lifecycle
states, and valid empty states.

## Not Responsible For

This document does not define authentication and access flows, Course content
lifecycle operations, Participant booking actions, implementation architecture,
or technology.

## Inputs

- an authenticated external principal used in participant or administration
  context;
- Admin User and Participant actions governed by the focused product rules;
- Course-local Module intervals resolved through the Course timezone to
  definite instants; and
- authoritative current Participant, Admin User, Course, Group, Module,
  Assignment, Invite, and Selection state.

## Outputs

- one consistent interpretation of every domain term;
- validity constraints for relationships and state changes; and
- the smallest accepted lifecycle state set.

## Adjacent Parts

The model composes with [Admin access](admin-access.md),
[Course access](course-access.md), [Course structure and
lifecycle](course-structure.md), and [Module
participation](module-participation.md).

## Canonical Vocabulary

### External Authentication Identity

An [external authentication
identity](../DICTIONARY.md#external-authentication-identity) is the stable
external principal presented by the chosen authentication layer. The booking
system trusts that principal to establish which booking-system domain identity
is acting without prescribing an authentication vendor or provider-specific
principal representation.

Several sign-in methods that the authentication layer resolves to the same
stable principal represent the same external authentication identity. Two
different external principals remain different external identities, even when
their names, email addresses, or other personal data match. The booking system
MUST NOT automatically merge them or attempt to determine whether they belong
to the same real-world human.

One external authentication identity MAY independently back one Participant,
one Admin User, or both. Participant and Admin User remain separate domain
entities with independent state and history. The product remains compatible
with authentication-layer provider linking behind one stable principal, but
does not provide principal linking, merging, recovery, or transfer in v1.

### Participant

A [Participant](../DICTIONARY.md#participant) is the domain identity for a
fully registered person in participant-facing booking. A Participant has:

- one required human-readable `name`;
- one required `email`, unique among registered Participants after normal
  trimming/normalization and case-insensitive comparison; and
- Active or Disabled global access state.

Required profile text MUST be non-blank after trimming, and `email` MUST be a
valid email address. Neither name nor email is Participant identity or evidence
that two external principals belong to the same person. A Participant may
belong to zero, one, or multiple Courses and may have Module Selections. Course
Assignments, Selections, profile values, and global state remain independent
of any Admin User backed by the same external authentication identity.

### Participant Onboarding

[Participant onboarding](../DICTIONARY.md#participant-onboarding) is the
mandatory registration step after a new external principal authenticates in
participant context. The Participant becomes a fully registered Active domain
identity only after valid name and email are supplied. Incomplete onboarding
is not an additional Participant lifecycle state and creates no Course
Assignment, Module Selection, or other booking-domain record.

### Admin User

An [Admin User](../DICTIONARY.md#admin-user) is the distinct domain identity
for a person authorized to operate the administration side. It has a stable
identity, one required human-readable `name`, Active or Disabled administrative
access state, and ordinary Admin or Super Admin authority. Required name is a
booking-system property and MUST be non-blank after trimming. Admin access MUST
NOT be modeled as a property on Participant, and neither entity's existence,
state, or history implies the other's.

### Super Admin

A [Super Admin](../DICTIONARY.md#super-admin) is an Admin User with broader
authorization over Admin Users. The first successfully bootstrap-created Admin
User receives this authority automatically. An Active Super Admin MAY promote
an Active ordinary Admin User, so multiple Super Admins may coexist. Promotion
preserves Admin User identity and is one-way in v1. Admin Invites always create
ordinary Admin Users.

### Course

A [Course](../DICTIONARY.md#course) is the primary container. It has:

- one required non-blank `name`;
- one optional `description`;
- one required IANA/TZDB timezone, defaulting to `Europe/Berlin`;
- zero or more Groups;
- zero or more Modules;
- zero or more Course Assignments;
- at most one current shared Course Invite; and
- Active or permanently Archived state.

Course names need not be unique and are not identity. A new Course is Active
and creates no Group, Module, Assignment, or Invite implicitly.

### Group

A [Group](../DICTIONARY.md#group) is one Course-wide attendance option within
exactly one Course. It has one required non-blank `name`, one optional
free-text `details` value, and Active or Archived state. It has no structured
room, location, URL, meeting-provider, physical/remote/hybrid, or access-data
subobjects.

Group identity and details are permanently Course-owned rather than
Module-specific. Active Group names MUST be unique within one Course after
trimming and case-insensitive comparison. Archived Groups may share names with
Active Groups; reactivation must restore the Active-name invariant.

### Module

A [Module](../DICTIONARY.md#module) is one non-recurring occurrence within
exactly one Course. It has one required non-blank `title`, optional
`description`, optional `instructions`, and required `startsAt` and `endsAt`
definite instants with `endsAt > startsAt`. Module titles need not be unique and
are not identity.

A Module is Scheduled or Cancelled. Upcoming, in-progress, and ended are
derived temporal descriptions. At exact `startsAt` it has started; at exact
`endsAt` it has ended. Modules have no separate business timezone.

### Course Assignment

A [Course Assignment](../DICTIONARY.md#course-assignment) represents:

> Participant belongs to Course.

A Participant has at most one Assignment for a given Course. The Assignment is
Active or Revoked. Course-specific membership is distinct from Participant
global state: participant-facing Course access requires both an Active
Participant and an Active Assignment. The Course lifecycle then determines
whether access is mutable Active-Course access or read-only Archived-Course
access.

Direct administrative assignment, Invite joining, and membership established
or reactivated through Admin-assisted booking produce the same Assignment
concept. Origin creates no invited, manual, booking-created, or self-enrolled
state.

### Module Selection

A [Module Selection](../DICTIONARY.md#module-selection) represents:

> Participant P intends to participate in Module M using Group G.

For one Participant and Module, at most one Selection may exist. Absence means
non-participation. A Selection records booking intent, not attendance, and has
no RSVP or cancelled-booking lifecycle.

A retained Selection is live only when all of these are true:

- Participant is Active;
- Course is Active;
- Course Assignment is Active;
- Module is Scheduled; and
- `now < endsAt`.

Within live state, `now < startsAt` is upcoming and
`startsAt <= now < endsAt` is in progress. Otherwise the retained Selection is
historical. Live/historical is derived from authoritative surrounding state,
not a separate Selection status.

### Course Invite

A [Course Invite](../DICTIONARY.md#course-invite) is a Course-specific,
person-independent shared invitation. A Course has at most one current Invite.
The current Invite may be enabled or disabled; replacement permanently
invalidates its predecessor. An enabled current Invite authorizes an Active
Participant to attempt explicit Join, subject to authoritative Course,
Assignment, Invite, and Participant state.

A recognized token that can still be associated with a Course may reveal only
that Course's name even when it is disabled, replaced, or attached to an
Archived Course. An unknown token reveals no Course data.

### Admin Invite

An [Admin Invite](../DICTIONARY.md#admin-invite) is a non-Course-specific,
one-time path toward creating one ordinary Active Admin User. Multiple Active
Invites may coexist. It remains Active until successfully Claimed or manually
Revoked and does not expire automatically. Claimed and Revoked are terminal.

## Conceptual Relationships

```text
External authentication identity -> Participant
External authentication identity -> Admin User
Participant <- Course Assignment -> Course
Course -> Groups
Course -> Modules
Participant + Module -> selected Group
Course -> current shared Course Invite
Admin Invite -> ordinary Admin User
Super Admin authority -> promotion of ordinary Admin User
```

A Module Selection is valid only when its Participant, Module, and Group
resolve through the same Course according to the invariants below.

## Hard Invariants

### Identity And Profile

1. Participant and Admin User MUST remain distinct domain entities with
   independent state and history, even when one external authentication
   identity backs both.
2. Matching names, Participant emails, or other personal data MUST NOT merge
   domain identities or distinct external principals.
3. Every registered Participant MUST have valid required name and email, and
   Participant email MUST be unique by the accepted comparison rule.
4. Every Admin User MUST have one valid required name.
5. Profile edits MUST preserve domain identity and every existing relationship.

### Structure And Membership

6. A Group and a Module MUST each belong permanently to exactly one Course.
7. Active Group names MUST be unique within one Course after trimming and
   case-insensitive comparison.
8. A Participant MUST have at most one Course Assignment to a given Course.
9. A new Course Assignment MUST NOT be created for an Archived Course by any
   path, and a Revoked Assignment MUST NOT be reactivated there.
10. An Active Assignment alone MUST NOT grant participant-facing Course access;
    the Participant MUST also be Active.
11. Course membership MUST NOT automatically create a Module Selection.
12. Revoking an already-Revoked Assignment and assigning or reactivating an
    already-Active Assignment MUST be successful no-ops.

### Selection Validity And History

13. A Participant MUST have at most one Module Selection for a given Module.
14. Every Selection MUST reference one Participant, one Module, and one Group,
    and the Group and Module MUST belong to the same Course.
15. Participant-created Selection creation or change requires an Active
    Participant, Active Assignment, Active Course, Active Group, and Scheduled
    Module where `now < startsAt`.
16. Admin-assisted creation or replacement requires an Active Admin User and
    an existing Active Participant, plus the same Course, Group, Module, and
    deadline validity. It MAY establish or reactivate the ordinary Assignment
    only as part of the same successful outcome.
17. A refused Admin-assisted set-Selection MUST NOT leave a newly created or
    reactivated Assignment.
18. Setting the already-selected Group MUST be idempotent; setting another
    eligible Group MUST replace the current Selection.
19. Successful pre-start removal produces no Selection and no cancellation or
    audit record. Removed or replaced values do not remain merely as change
    history.
20. Assignment revocation and Participant Disable MUST remove Selections for
    Scheduled Modules where `now < startsAt`, retain Scheduled-Module
    Selections where `startsAt <= now`, and retain Cancelled-Module Selections.
21. Cancellation MUST retain existing Module Selections as historical records.
22. Re-enabling a Participant or reactivating an Assignment MUST NOT restore
    removed future Selections. A legitimately retained in-progress Selection
    MAY become live again when every live predicate becomes true.

### Time And Lifecycle

23. Module schedule input in the Course timezone MUST resolve to definite
    instants. Nonexistent local times are invalid and ambiguous local times
    require explicit disambiguation.
24. Every Module MUST satisfy `endsAt > startsAt`; creation also requires
    `startsAt > now`.
25. A Scheduled Module may be rescheduled only before its current `startsAt`,
    and the result MUST satisfy `newStartsAt > now` and
    `newEndsAt > newStartsAt`.
26. At or after `startsAt`, a Scheduled Module's interval is immutable. A
    Cancelled Module's interval is always immutable.
27. A Scheduled Module may be Cancelled only in an Active Course while
    `now < endsAt`. Cancellation is terminal.
28. A Course timezone may change only while the Active Course has no Modules.
29. A Course MUST NOT be Archived while it contains a Scheduled Module where
    `now < endsAt`. Archival MUST NOT cancel Modules or mutate Selections.
30. An Archived Course MUST remain Archived and MUST NOT be hard-deleted.
31. An Archived Course is structurally read-only. Assignment revocation is the
    only accepted remaining Course-specific access mutation; no Assignment may
    be added or reactivated and no Selection may be mutated.
32. A Group may move Active to Archived only when its Course is Active and no
    retained Selection references it for a Scheduled Module where
    `now < startsAt`. It may reactivate only in an Active Course and subject to
    Active-name uniqueness.
33. A Group or Module may be hard-deleted only in an Active Course when no
    currently retained Module Selection references it.

### Administration And Invitations

34. A Disabled Participant MUST have no normal participant-facing access and
    MUST NOT mutate their profile, join, or mutate Selections.
35. A Disabled Admin User MUST have no administrative access.
36. Authentication alone MUST NOT create an Admin User after bootstrap has
    completed; a new Admin User then requires an Active Admin Invite.
37. Only the first successfully bootstrap-created Admin User receives Super
    Admin authority automatically.
38. Only an Active Super Admin may promote an Active ordinary Admin User.
    Promotion preserves identity and Super Admin demotion is unsupported.
39. An Admin User MUST NOT disable or delete themselves or alter their own
    authority. Ordinary Admin Users MUST NOT mutate Super Admins.
40. No accepted Admin User mutation may leave zero Active Super Admins.
41. A current Admin User's attempted Admin Invite claim MUST be refused without
    creating or re-enabling an Admin User or consuming the Invite.
42. A deleted Admin User's former external principal may create a new ordinary
    Active Admin User only through a new Active Admin Invite; the old Admin
    identity, state, and authority are not restored.
43. Successful Admin User creation MUST permanently transition its Active
    Invite to Claimed. Manual Revocation MUST transition Active to terminal
    Revoked.
44. Disabling or deleting an Admin User MUST NOT cascade into booking-domain
    content or previously created Invites.
45. A recognized but unusable Course Invite MAY reveal only its Course name;
    an unknown Invite MUST reveal no Course information.

### Authoritative Acceptance

46. Every state-changing operation MUST be authorized and validated against
    authoritative current state when accepted, including actor state and
    authority, lifecycle state, Invite state, Assignment state, temporal
    deadlines, and invariants.

## Minimal State Model

| Concept | Complete state model |
| --- | --- |
| Participant registration | No Participant until mandatory onboarding succeeds; incomplete onboarding is not a Participant lifecycle state |
| Participant | Active or Disabled; hard deletion is unsupported |
| Course | Active or permanently Archived |
| Group | Active or Archived while its Course is Active; Archived Course freezes state |
| Module | Scheduled or terminal Cancelled |
| Course Assignment | Active or Revoked |
| Module Selection | Exists with one selected Group or does not exist; live/historical meaning is derived |
| Course Invite | No current Invite, or current enabled/disabled Invite; replacement invalidates the predecessor |
| Admin User | Existing as Active or Disabled, or legitimately deleted under Admin User rules |
| Admin User authority | Ordinary Admin or Super Admin; Active ordinary Admin may be promoted, and no demotion exists |
| Admin Invite | Active, Claimed, or Revoked; Claimed and Revoked are terminal |

Further lifecycle states MUST NOT be introduced without an explicit
requirement.

## Identity And Naming

Name, title, and Participant email are properties rather than domain identity.
Changing one preserves the same object and all relationships. Similar names do
not imply duplicate identity:

- Participants MAY share a name;
- Courses and Modules MAY share names or titles;
- Archived Groups MAY share a name with an Active Group; and
- Active Groups in one Course MUST have distinct normalized names.

Participant email uniqueness prevents two registered profiles from holding the
same normalized address, but MUST NOT be used to merge identities. A refused
duplicate-email edit leaves the existing Participant data unchanged.

## Normal Empty And Partial States

All of the following are valid and MUST NOT require placeholder data:

- a newly created Active Course with `Europe/Berlin` timezone and zero Groups,
  Modules, Assignments, or Invite;
- an Active Participant with zero Course Assignments;
- an installation with Participants but no Admin User ever created;
- an Active Course with zero Participants, Modules, or Groups;
- a Participant assigned to a Course with zero Module Selections;
- a Module with zero Participants;
- a Group with zero retained Selections;
- a new future Module added after earlier Course Modules have occurred;
- a Participant joining after some Course Modules have reached `startsAt`; and
- multiple independently Active Admin Invites.

If an Active Course has no Active Groups, no valid Module Selection can be
created until at least one Active Group exists.
