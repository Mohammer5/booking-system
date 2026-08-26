# Module Participation

## Responsibility

This document owns Participant Module Selection creation, replacement, and
removal; Admin-assisted set-Selection and removal; the shared `startsAt`
modification deadline; live and historical meaning; and concurrent Participant
changes.

## Not Responsible For

This document does not own Course membership outside the Course Assignment
composition explicitly used by Admin-assisted booking, manage Course, Group,
Module, Participant, or Admin User lifecycle, prove actual attendance, deliver
notifications, or maintain a complete audit history.

## Inputs

- an authenticated Participant or Active Admin User;
- the Participant's explicit choice to select, replace, or remove a Group, or
  an Admin User's accepted assisted-booking action;
- current Course Assignment, Course, Module, and Group state; and
- the Module's current `startsAt` in the Course timezone.

## Outputs

- exactly one Group selection for a Participant and Module; or
- no Module Selection, meaning non-participation in that Module.

## Adjacent Parts

Participation applies the [domain invariants](domain-model.md#hard-invariants),
depends on [Course access](course-access.md), receives administrative authority
from [Admin access](admin-access.md), and reacts to [Course, Group, and Module
lifecycle](course-structure.md).

## Participation State

For each Participant and Module, exactly one of two Selection states applies:

1. no [Module Selection](../DICTIONARY.md#module-selection), meaning the
   Participant is not participating; or
2. one Module Selection to exactly one Group, recording that the Participant
   intended to participate using that Group.

There is no separate booking workflow or RSVP lifecycle. Course membership
does not require participation in every Module: an assigned Participant MAY
select all, some, or no Modules.

An existing Selection may be a live booking or a historical record according to
the surrounding Course, Module, Assignment, and temporal state. In particular,
if the Module is Cancelled, the Selection remains historically recorded but is
no longer live. That distinction is derived rather than represented by a
cancelled-booking state.

## Participant Booking Eligibility

A Participant MAY create a Module Selection only when all of the following are
true:

- the Participant has an Active Course Assignment to the Course;
- the Course is Active;
- the Module is Scheduled and the current instant is before `startsAt`;
- the selected Group is Active; and
- the selected Group and Module belong to that same Course.

An Active Group in the Course is available to every otherwise eligible future
Scheduled Module. There is no per-Module Group availability or capacity rule.

Creating the Selection is the Participant's explicit statement:

> I intend to participate in this Module using this Group.

The system MUST NOT choose a Group automatically from a previous selection,
the first available Group, a preferred or default Group, or Course membership.
Each Participant-created Module Selection results from an explicit Participant
choice. An Active Admin User may also create the same Module Selection through
the accepted assisted-booking capability.

## Changing The Selected Group

Before `startsAt`, an eligible Participant MAY replace the selected Group with
another eligible Group in the same Course. Replacement MUST remove the previous
current choice; two simultaneous Group selections for the same Participant and
Module MUST NOT exist.

For example, changing `Remote` to `Room A` means `Room A` is the sole current
choice. Selecting the already-selected Group MUST be idempotent and MUST NOT
create another state or record.

A Participant MAY choose a different Group for every Module in one Course. For
example, all of the following may coexist:

- Module 1 → Room A;
- Module 2 → Remote;
- Module 3 → Room B; and
- Module 4 → no participation.

## Revoking Participation

Before `startsAt`, a Participant with current Course access MAY remove their
Module Selection. Removal makes the current booking state "no selection" and
therefore non-participation. It MUST NOT create a Participant-visible
cancelled-booking state.

## `startsAt` Deadline

A Participant MAY create, change, or revoke a Module Selection only until the
Module's `startsAt`. At the exact `startsAt` instant, the Module has started and
all normal Participant modification becomes unavailable.

The product MUST NOT introduce a configurable earlier deadline, registration
close date, fixed advance window, or lock window.

If a Participant joins after some Modules have reached `startsAt`, those Modules
MUST NOT be selectable, while otherwise eligible future Modules remain
selectable. If no Selection exists at `startsAt`, the Participant is not
participating.

## Admin-Assisted Booking

Through [Admin-assisted booking](../DICTIONARY.md#admin-assisted-booking), an
Active Admin User MAY set an existing Participant's Module Selection for one
Module to a chosen Group and MAY remove an existing Selection. These operations
use the same Module Selection and absence semantics as Participant booking;
there is no parallel Admin booking entity, state, or workflow.

### Existing Participant And Course Membership

The target MUST already be a Participant. An Admin User who has no Participant
identity MUST NOT automatically become one, and an attempted assignment MUST
NOT create a Participant, pending Participant, or pre-created record for an
unknown or unregistered person.

The existing Participant need not have an Active Course Assignment before an
Admin-assisted set-Selection operation begins. A successful operation MUST
ensure an Active Course Assignment to the Module's Course:

- if no Assignment exists, create one as Active;
- if an Active Assignment exists, leave it Active; and
- if a Revoked Assignment exists, reactivate it.

The operation MUST NOT create a duplicate Assignment. Reactivation remains
permitted only for an Active Course. The resulting Assignment is the ordinary
Course Assignment described in [Course access](course-access.md#course-assignment-through-admin-assisted-booking),
with no assisted, temporary, booking-created, or Admin-assigned membership
state. Course membership and Module participation remain distinct even though
this operation may establish both in one successful outcome.

### Eligibility And Deadline

Apart from not requiring an Active Course Assignment before the operation
begins, an Admin-assisted set-Selection MUST satisfy the same booking validity
rules as a Participant-created Selection. It may succeed only when:

- the Course is Active;
- the Module is Scheduled;
- the current instant is strictly before the Module's `startsAt`;
- the selected Group is Active;
- the selected Group and Module belong to the same Course; and
- every other structural invariant for a Module Selection holds.

At the exact `startsAt` instant, Admin-assisted creation or replacement is no
longer permitted. An Admin User has no late-booking, Archived-Course,
Cancelled-Module, or Archived-Group override. Capacity, waiting lists,
scheduling-conflict prevention, and approval rules remain absent; the product
introduces no additional Admin-only eligibility rule.

### Set Selected Group Semantics

The Admin-assisted action sets the Participant's one current selected Group for
the Module:

```text
no Selection -> selected Group G
Group G      -> Group G
Group A      -> Group B
```

With no existing Selection, the operation creates one. Setting the same Group
is idempotent and MUST NOT create a duplicate. Setting another eligible Group
replaces the previous Group, leaving only the new Selection. The replacement
has the same meaning as a Participant self-service Group change; a separate
first-class Admin change action or workflow-heavy change-booking state is not
part of the product model.

### Removal

An Active Admin User MAY remove an existing Module Selection only while the
Course is Active, the Module is Scheduled, and the current instant is strictly
before `startsAt`. At or after `startsAt`, normal Admin-assisted removal is
refused. An Archived Course and a Cancelled Module permit no Admin-assisted
Selection mutation, and a Cancelled Module's retained historical Selections
MUST NOT be removed merely to rewrite history.

Successful removal produces no Module Selection, meaning non-participation. It
MUST NOT create an Admin-cancelled-booking state and does not create or
reactivate a Course Assignment.

### Coherent Refusal

The requested Module Selection MUST be validated before a Course Assignment
and Selection outcome is accepted. If any booking rule fails, including because
the Course is Archived, the Module is Cancelled or has reached `startsAt`, the
Group is Archived, or the Group and Module belong to different Courses, the
entire assisted set-Selection operation MUST be refused. Refusal MUST NOT leave
behind a newly created or reactivated Course Assignment. This is an atomic
product-level outcome and does not prescribe a database transaction mechanism.

## Scheduling Conflicts

The core booking domain MAY permit overlapping Modules in one Course,
overlapping Modules across Courses, and a Participant selecting Modules whose
times overlap. Conflict prevention is not a hard business rule; detection or
warnings require a separate future requirement.

## Concurrent Changes

Groups have no capacity, so the business rules require no cross-Participant
reservation locking.

When one Participant changes the same Module Selection from multiple sessions
or devices, the latest successfully accepted valid state MAY win. For example,
if one device changes `Remote` to `Room A` and another changes `Remote` to
`Room B`, whichever valid change is accepted last defines the current state.
The product has no user-facing merge or conflict workflow.

If an Admin User revokes the Participant's Course Assignment concurrently with
a Participant change, revocation blocks that Participant change and removes
the future Selection under the Course-access rules.

## Current State, History, And Attendance

The initial booking model requires authoritative current live state plus the
historical Selection references required by lifecycle rules. Revoking a future
Selection produces no Selection. Cancelling a Module preserves its existing
Selections, but they cease to be live bookings. A complete change history or
Participant-visible cancelled-booking state is not required.

Lifecycle rules still preserve historically meaningful participation when an
object has or had Selections. A future operational or legal audit history MAY
be added separately without changing the meaning of current booking state.

A Module Selection means intended or booked participation. It MUST NOT be
treated as proof of actual attendance. Attendance, check-in, and attendance-
based certification are separate future concerns.

## Notifications Do Not Define Correctness

An Admin User change, addition, or cancellation becomes authoritative according
to the product rules regardless of whether a notification exists or succeeds.
Email, push notifications, SMS, calendar invitations, and delivery tracking
are not required for booking correctness and MAY be added only as separate
communication concerns.
