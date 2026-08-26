# Booking System Product Specification

This area is the authoritative, implementation-agnostic product specification
for a deliberately simple course and module booking system. It defines the
domain, business rules, permissions, lifecycle, edge cases, and exclusions
without choosing a technology or implementation architecture.

## Product Goal

The system manages [Courses](../DICTIONARY.md#course) whose
[Participants](../DICTIONARY.md#participant) decide independently whether and
how to participate in each non-recurring [Module](../DICTIONARY.md#module).

A person may register as a Participant without a Course Invite. After
authenticating in participant context, a new person completes mandatory
[Participant onboarding](../DICTIONARY.md#participant-onboarding) with a
booking-system name and email. Successful onboarding creates an Active
Participant, initially with zero Course memberships. Active Participants may
join eligible Courses, access Courses to which they are assigned, maintain
their profile, and manage eligible Module Selections. Disabled is the
reversible global Participant access state.

[Admin Users](../DICTIONARY.md#admin-user) administer Courses, Groups, Modules,
Participants, Course Assignments, Course Invites, other Admin Users and Admin
Invites within their authority, and the accepted Admin-assisted booking
actions. The first successfully bootstrap-created Admin User is a Super Admin;
Active Super Admins may promote Active ordinary Admin Users so multiple Super
Admins may coexist.

Participant and Admin User are separate domain identities with separate state
and history. The same
[external authentication identity](../DICTIONARY.md#external-authentication-identity)
MAY back both independently, but neither identity implies or merges into the
other.

## Core Mental Model

[Course Assignment](../DICTIONARY.md#course-assignment) and
[Module Selection](../DICTIONARY.md#module-selection) answer different
questions:

- Course Assignment: is this Participant a member of this Course?
- Module Selection: does this Participant intend to attend this Module, and
  with which Group?

Course membership never books a Participant into a Module. A missing Module
Selection means non-participation, not an unanswered response. A Group is a
Course-wide attendance choice, while the Participant's choice of Group is made
separately for each Module.

Participant Course access requires both an Active Participant and an Active
Course Assignment. Participant state is global access control; Course
Assignment state is Course-specific membership. An Active Course permits
eligible booking changes, while an Archived Course permits only the accepted
read-only historical access.

## Conceptual Relationships

```text
External authentication identity -> Participant
External authentication identity -> Admin User
Participant <- Course Assignment -> Course
Course -> Groups
Course -> Modules
Participant + Module -> selected Group
Course -> shared Course Invite
Admin Invite -> ordinary Admin User
Super Admin authority -> promotion of ordinary Admin User
```

Every Module Selection links a Participant, Module, and Group through the same
Course. A Participant needs Active global state and an Active Course Assignment
when creating or changing their own Selection. [Admin-assisted
booking](../DICTIONARY.md#admin-assisted-booking) may establish or reactivate
the existing Active Participant's Course Assignment as part of one successful,
otherwise normally eligible Module-and-Group assignment. Course membership and
Module participation remain distinct regardless of which accepted path
established the membership. The complete cross-concept rules are defined in
[the domain model](domain-model.md).

## Specification Composition

The product model is composed from distinct responsibilities:

- [Domain model](domain-model.md) owns vocabulary, relationships, invariants,
  identity, and the minimal state model.
- [Admin access](admin-access.md) owns Admin User identity, Super Admin
  authority, Admin User lifecycle, first Admin bootstrap, Admin Invites,
  onboarding, and Admin User/Admin Invite administration views.
- [Course access](course-access.md) owns Participant registration, profile and
  global access policy, Course Assignments, Course Invites, membership,
  permissions, and visibility.
- [Course structure and lifecycle](course-structure.md) owns Course archival
  and Course, Group, and Module structure, scheduling, editing, deletion, and
  cancellation rules.
- [Module participation](module-participation.md) owns Participant and
  Admin-assisted Module Selection actions and their time-dependent rules.
- [Non-goals](non-goals.md) establishes the deliberate product boundary.
- [Representative scenarios](representative-scenarios.md) demonstrates how the
  rules compose without defining a separate implementation test suite.

Normative words such as MUST, MUST NOT, MAY, and SHOULD distinguish required
behavior from recommendations. No document in this area defines database,
API, frontend, infrastructure, framework, or provider-product design.
