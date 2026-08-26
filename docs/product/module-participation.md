# Module Participation

## Responsibility

This document owns Participant Module Selection creation, replacement, and
removal; Admin-assisted creation and removal; the Participant `startsAt`
deadline; live and historical meaning; and concurrent Participant changes.

## Not Responsible For

This document does not grant Course membership, manage Course, Group, Module,
Participant, or Admin User lifecycle, prove actual attendance, deliver
notifications, maintain a complete audit history, or decide the unresolved
Admin-assisted-booking policies.

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

## Eligibility

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
Active Admin User MAY add an existing Participant to a Module and Group and MAY
remove an existing Module Selection for a Participant. A booking created by an
Admin User is the same Module Selection concept used by Participants; there is
no parallel administrative booking entity or state.

The accepted capability does not yet decide:

- whether an Admin User may add, change, or remove a Selection at or after
  `startsAt`;
- whether the Participant must already have an Active Course Assignment;
- whether adding a Selection when another Group is already selected for that
  Participant and Module replaces the Selection or is refused; or
- whether an Admin User may explicitly change an existing Selection to another
  Group as a first-class action.

Participant eligibility and deadline rules MUST NOT be assumed to govern Admin
User actions, and Admin User override powers MUST NOT be inferred. These policy
questions are tracked in [Product
status](_status.md#deliberately-unspecified-details).

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
the future Selection under the Course-access rules. This does not decide
whether a later Admin-assisted action requires an Active Course Assignment.

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
