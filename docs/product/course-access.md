# Course Access

## Responsibility

This document owns authentication identity rules, Course membership through
Course Assignments, shared Course Invite behavior, assignment revocation and
reactivation, role responsibilities, and Course information visibility.

## Not Responsible For

This document does not define Module Selection behavior after access is
granted, Course content lifecycle, authentication technology, authorization
mechanisms, or user-interface layout.

## Inputs

- an identity established through a supported external provider;
- an Admin assignment, revocation, reactivation, or Invite-management action;
- a Participant's explicit join confirmation; and
- current Participant, Course, Course Assignment, and Course Invite state.

## Outputs

- the acting Participant identity;
- an unchanged, Active, or Revoked Course Assignment;
- authorization or refusal to join or access a Course; and
- the Course information visible to the actor.

## Adjacent Parts

Access applies the [domain model](domain-model.md), gates
[Module participation](module-participation.md), and respects
[Course lifecycle](course-structure.md#course-lifecycle).

## Authentication And Participant Identity

The system MUST support external authentication identities including:

- Google;
- Apple;
- Microsoft; and
- Facebook.

No particular authentication product is prescribed. An external provider
proves which [Participant](../DICTIONARY.md#participant) is acting; it does not
grant Course access.

Course membership attaches to the booking-system Participant identity, not to
one provider. A provider-visible display name, email address, or other profile
change MUST NOT automatically remove Course membership.

The system MUST NOT automatically merge authenticated identities because they
have the same or similar email address, display name, or personal information.
If the system cannot reliably establish that two external identities represent
one Participant, it MUST treat them as separate Participant identities. Account
linking and merging are outside the initial booking domain.

## Responsibility Boundary

An [Admin](../DICTIONARY.md#admin) controls:

- Courses;
- Groups;
- Modules;
- Course Invites;
- Course Assignments; and
- Course membership and revocation.

A Participant controls only their own Module Selections and their selected
Group for each Module. The initial product MUST NOT require an Admin to create a
Module Selection or choose a Group on a Participant's behalf. This avoids
precedence or conflict rules between Admin and Participant choices.

## Administrative Assignment

When an existing registered Participant has no Course Assignment to a Course,
an Admin MAY directly assign them only if the target Course is Active. The
result is an Active [Course Assignment](../DICTIONARY.md#course-assignment). A
new Course Assignment MUST NOT be created for an Archived Course.

- Assigning a Participant who already has an Active Assignment MUST be
  idempotent and MUST NOT create a duplicate.
- For an Active Course, assigning a Participant whose Assignment is Revoked
  MUST reactivate that Assignment. Whether reactivation is permitted while the
  Course is Archived is deliberately unspecified in
  [Product status](_status.md#deliberately-unspecified-details).
- Reactivation MUST NOT automatically restore previously removed future Module
  Selections. The Participant chooses eligible future Modules and Groups again.
- An Admin MUST NOT create a pending Participant or pre-created Course
  Assignment for an unknown or unregistered person. The shared Invite is the
  onboarding mechanism for that person.

Admin assignment and Invite-based joining MUST have identical membership
meaning. Assignment origin MUST NOT create a separate access state.

## Shared Course Invite

### One Current Invite

Each Course has at most one current shared
[Course Invite](../DICTIONARY.md#course-invite). An Admin MAY make it available
for sharing, disable it, or regenerate and replace it. Replacement MUST
invalidate the previous Invite. The product MUST NOT support multiple
independently managed, concurrently active Invites for one Course.

An Invite does not expire automatically. It remains usable until disabled,
replaced, or made unusable by Course lifecycle changes.

### Reuse And Forwarding

The Invite is Course-specific and intentionally not person-specific. Multiple
Participants MAY use the same valid Invite. A recipient MAY forward it, and the
new recipient MAY also join when otherwise eligible.

This is an explicit product and security tradeoff: shared onboarding is simpler
than fine-grained invitation control, but possession of the link is not
restricted to the intended first recipient.

### Join Flow

Joining through an Invite MUST follow this conceptual sequence:

1. The person opens the Course Invite.
2. The person authenticates if necessary.
3. The authenticated Participant receives an explicit action to join.
4. On confirmation, an Active Course Assignment is created if joining is
   allowed.
5. The Participant may then access the Course.

Opening the URL alone MUST NOT create Course membership. Explicit confirmation
is required.

An unregistered recipient MUST NOT cause a pending Participant or pre-created
Course Assignment. They authenticate or register, become a Participant,
continue or return to the Invite flow, and explicitly join. An existing
Participant follows the same explicit join rule.

### Idempotent Repeat Use

If the Participant already has an Active Course Assignment, using the Invite
again MUST NOT create a duplicate. The outcome is equivalent to "already
belongs to this Course," after which the Participant MAY proceed to the Course.

### Refused Join Attempts

An Invite MUST NOT create a Course Assignment when it is disabled, replaced,
unknown, otherwise invalid, or associated with an Archived Course.

A Participant with a Revoked Course Assignment MUST NOT reactivate themselves
through the generic Invite, even when that Invite remains valid for other
people. Only an Admin may reactivate that Participant's Assignment.

### Information Before Joining

Possession of an unauthenticated Invite URL MUST NOT expose Course-private
information, including:

- the Participant roster;
- Participants' Module Selections;
- private meeting links;
- sensitive room or access instructions; or
- administrative information.

A minimal Course title or invitation label MAY be shown only if Course names
are established as non-sensitive. Whether Course names are non-sensitive is not
defined by the current product requirements.

## Revocation And Reactivation

An Admin MAY revoke an Active Course Assignment. Revocation MUST:

- change the Assignment to Revoked;
- prevent the Participant from accessing and participating in that Course;
- prevent creation or change of Module Selections in that Course;
- prevent self-reactivation through the shared Invite;
- remove the Participant's future Module Selections from authoritative current
  booking state; and
- preserve historically meaningful participation information.

The system MUST NOT retain a future active booking for a Participant who lacks
an Active Course Assignment. When an Admin reactivates the Assignment where
reactivation is permitted, future Module Selections MUST NOT be restored
automatically.

Participants do not have a self-service leave-Course capability in the initial
scope. A Participant may remain assigned while having no Module Selections.

## Visibility

### Participant Visibility

A Participant with an Active Course Assignment MAY see the information needed
to participate, including:

- their assigned Courses;
- the Course's Modules;
- available Groups;
- their own Module Selections; and
- Course, Module, and Group details relevant to participation.

Course access MUST NOT automatically expose the full Participant roster, other
Participants' Module Selections or personal information, or administrative
data. Participant-visible rosters and Group counts are outside the initial
scope.

### Admin Visibility

An Admin MAY view the information needed to administer a Course, including:

- Course Participants;
- Course Assignment state;
- Modules;
- Groups; and
- Participants' Module Selections.

This permission rule does not prescribe any user-interface layout.

## Multiple Courses

A Participant MAY have independent Course Assignments to multiple Courses.
Revocation from one Course MUST NOT affect another Course. A Course Invite
applies only to its Course, and Module Selections MUST NOT span Courses.
