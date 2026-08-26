# Booking System Product Specification

This area is the authoritative, implementation-agnostic product specification
for a deliberately simple course and module booking system. It defines the
domain, business rules, permissions, lifecycle, edge cases, and exclusions
without choosing a technology or implementation architecture.

## Product Goal

The system manages [Courses](../DICTIONARY.md#course) whose
[Participants](../DICTIONARY.md#participant) decide independently whether and
how to participate in each non-recurring [Module](../DICTIONARY.md#module).

Admins MUST be able to manage booking-system users and Admin capability,
Courses, Groups, Modules, Course Assignments, Course access, shared Course
Invites, and the accepted assisted-booking actions. Participants MUST be able
to authenticate, join eligible Courses, access Courses to which they are
assigned, and manage their own eligible Module Selections before each Module's
`startsAt`.

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

## Conceptual Relationships

```text
Participant ← Course Assignment → Course
Course → Groups
Course → Modules
Participant + Module → selected Group
Course → shared Invite
```

Every Module Selection links a Participant, Module, and Group through the same
Course. A Participant needs an Active Course Assignment when creating or
changing their own Selection; whether Admin-assisted booking has the same
prerequisite remains deliberately unspecified. The complete cross-concept rules
are defined in [the domain model](domain-model.md).

## Specification Composition

The product model is composed from distinct responsibilities:

- [Domain model](domain-model.md) owns vocabulary, relationships, invariants,
  identity, and the minimal state model.
- [Course access](course-access.md) owns authentication identity, first-user
  Admin bootstrap, user administration, Course Assignments, Course Invites,
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
