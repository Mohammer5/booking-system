# Module Participation

## Responsibility

This document owns Participant-controlled Module Selection creation,
replacement, and revocation; the Module-start deadline; current-state meaning;
and concurrent-selection behavior.

## Not Responsible For

This document does not grant Course membership, manage Course, Group, or
Module lifecycle, prove actual attendance, deliver notifications, maintain a
complete audit history, or define an Admin booking workflow.

## Inputs

- an authenticated Participant with current Course access;
- the Participant's explicit choice to select, replace, or remove a Group;
- current Course Assignment, Course, Module, and Group state; and
- the Module's current start time in the Course timezone.

## Outputs

- exactly one current Group selection for a Participant and Module; or
- no Module Selection, meaning non-participation in that Module.

## Adjacent Parts

Participation applies the [domain invariants](domain-model.md#hard-invariants),
depends on [Course access](course-access.md), and reacts to
[Course, Group, and Module lifecycle](course-structure.md).

## Participation State

For each Participant and Module, exactly one of two conceptual states applies:

1. no [Module Selection](../DICTIONARY.md#module-selection), meaning the
   Participant is not participating; or
2. one Module Selection to exactly one Group, meaning the Participant intends
   to participate using that Group.

There is no separate booking workflow or RSVP lifecycle. Course membership
does not require participation in every Module: an assigned Participant MAY
select all, some, or no Modules.

## Eligibility

A Participant MAY create a Module Selection only when all of the following are
true:

- the Participant has an Active Course Assignment to the Course;
- the Course is Active;
- the Module is Scheduled and has not started;
- the selected Group is Active; and
- the selected Group and Module belong to that same Course.

An Active Group in the Course is available to every otherwise eligible future
Scheduled Module. There is no per-Module Group availability or capacity rule.

Creating the Selection is the Participant's explicit statement:

> I intend to participate in this Module using this Group.

The system MUST NOT choose a Group automatically from a previous selection,
the first available Group, a preferred or default Group, or Course membership.
Each Module Selection results from an explicit Participant choice. Admin-created
Module Selections are outside the initial scope.

## Changing The Selected Group

Before the Module starts, an eligible Participant MAY replace the selected
Group with another eligible Group in the same Course. Replacement MUST remove
the previous current choice; two simultaneous Group selections for the same
Participant and Module MUST NOT exist.

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

Before the Module starts, a Participant with current Course access MAY remove
their Module Selection. Removal makes the current booking state "no selection"
and therefore non-participation. It MUST NOT create a Participant-visible
cancelled-booking state.

## Start-Time Deadline

A Participant MAY create, change, or revoke a Module Selection only until the
Module starts. At the exact start time, all normal Participant modification
becomes unavailable.

The product MUST NOT introduce a configurable earlier deadline, registration
close date, fixed advance window, or lock window.

If a Participant joins after some Modules have started or finished, those
Modules MUST NOT be selectable, while otherwise eligible future Modules remain
selectable. If no Selection exists when a Module starts, the Participant is
not participating.

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

If an Admin revokes the Participant's Course Assignment concurrently with a
Participant change, the Assignment invariant takes precedence. A future active
Module Selection MUST NOT remain valid without an Active Course Assignment.

## Current State, History, And Attendance

The initial booking model requires authoritative current state only. Revoking a
future Selection produces no Selection. A complete change history or
Participant-visible cancelled state is not required.

Lifecycle rules still preserve historically meaningful participation when an
object has or had Selections. A future operational or legal audit history MAY
be added separately without changing the meaning of current booking state.

A Module Selection means intended or booked participation. It MUST NOT be
treated as proof of actual attendance. Attendance, check-in, and attendance-
based certification are separate future concerns.

## Notifications Do Not Define Correctness

An Admin change, addition, or cancellation becomes authoritative according to
the product rules regardless of whether a notification exists or succeeds.
Email, push notifications, SMS, calendar invitations, and delivery tracking are
not required for booking correctness and MAY be added only as separate
communication concerns.
