# Module Participation

## Responsibility

This document owns Participant Module Selection creation, replacement, and
removal; Admin-assisted set-Selection and removal; the shared `startsAt`
modification deadline; live and historical meaning; lifecycle-driven Selection
retention/removal; and concurrent Participant changes.

## Not Responsible For

This document does not own Course membership outside the Course Assignment
composition used by Admin-assisted booking, define Participant or structural
lifecycle, prove attendance, deliver notifications, or maintain complete change
history.

## Inputs

- an authenticated Active Participant or Active Admin User;
- an Active target Participant for Admin-assisted creation or replacement;
- the Participant's explicit Group choice or removal action, or the Admin
  User's accepted assisted-booking action;
- authoritative Participant, Assignment, Course, Module, Group, and Selection
  state; and
- the current definite instant and Module's definite `startsAt` and `endsAt`.

## Outputs

- exactly one Group Selection for a Participant and Module; or
- no Module Selection, meaning non-participation in that Module; and
- retained or removed Selection state after the accepted lifecycle actions.

## Adjacent Parts

Participation applies the [domain invariants](domain-model.md#hard-invariants),
depends on [Course access](course-access.md), receives administrative authority
from [Admin access](admin-access.md), and reacts to [Course, Group, and Module
lifecycle](course-structure.md).

## Participation State

For each Participant and Module, exactly one of two Selection states applies:

1. no [Module Selection](../DICTIONARY.md#module-selection), meaning the
   Participant is not participating; or
2. one Module Selection to exactly one Group, recording intended participation
   using that Group.

There is no RSVP, requested, approved, waitlisted, declined, or
cancelled-booking lifecycle. Course membership does not create participation:
an assigned Participant may select all, some, or no Modules.

## Exact Live And Historical Meaning

A retained Selection represents live/current participation only when all of
the following are true:

- Participant is Active;
- Course is Active;
- Participant's Course Assignment is Active;
- Module is Scheduled; and
- `now < endsAt`.

Otherwise the retained Selection is historical. Within live state:

- `now < startsAt` means an upcoming booking; and
- `startsAt <= now < endsAt` means current in-progress participation.

At `now >= endsAt`, the Selection is historical. A Cancelled Module, Disabled
Participant, Archived Course, or Revoked Assignment also makes a retained
Selection historical. The Group's later archival does not rewrite an already
retained in-progress or historical Selection; it still identifies that Group.

Live/historical meaning is derived from surrounding authoritative state, not a
persisted Module Selection status. A Selection records intent, not proof of
attendance.

## Participant Booking Eligibility

An Active Participant MAY create a Module Selection only when:

- they have an Active Course Assignment to the Course;
- the Course is Active;
- the Module is Scheduled;
- the definite current instant satisfies `now < startsAt`;
- the selected Group is Active; and
- the selected Group and Module belong to that Course.

An Active Group is available to every otherwise eligible future Scheduled
Module in its Course. There is no per-Module Group availability or capacity
rule.

The Participant MUST choose the Group explicitly. The product MUST NOT choose
one from a previous Selection, first available Group, preferred/default Group,
or Course membership.

## Changing The Selected Group

Before `startsAt`, an eligible Participant MAY replace the selected Group with
another eligible Group in the same Course. Replacement leaves only the new
current Selection. Selecting the already-selected Group is a successful no-op.

Before `startsAt`, the replaced Group value does not remain in the product
model merely as change history. One Participant may independently choose a
different Group for each Module.

## Removing Participation

Before `startsAt`, an eligible Participant MAY remove their Selection. Removal
leaves no Selection and therefore means non-participation. It creates no
cancelled-booking state and preserves no removed value merely for audit.

Lifecycle rules that deliberately retain the current Selection, such as
Module cancellation or a Selection that has reached `startsAt`, are separate
from voluntary pre-start removal.

## `startsAt` Deadline

Participant creation, replacement, and removal are available only while the
definite comparison `now < startsAt` is true. At exact `startsAt`, the Module
has started and all normal Participant modification is refused.

The product has no configurable earlier deadline, registration-close date,
fixed advance window, or lock window. A Participant joining after some Modules
have reached `startsAt` cannot select them but may select otherwise eligible
future Modules. No Selection at `startsAt` means non-participation.

## Admin-Assisted Booking

An Active Admin User MAY set an existing Active Participant's Selection for one
Module to a chosen Group and MAY remove an existing Selection. These actions
use the same Module Selection and absence semantics as Participant booking;
there is no parallel Admin booking entity, state, or workflow.

### Existing Active Participant And Membership

The target MUST already be a fully registered Active Participant. The action
MUST NOT create a Participant, pending Participant, or Participant identity for
an Admin User. A Disabled Participant must first be Re-enabled through the
separate Participant administration action.

The Active Participant need not have an Active Assignment before a
set-Selection operation. A successful operation ensures one Active Assignment:

- no Assignment becomes one Active Assignment;
- an Active Assignment remains Active as a successful no-op; and
- a Revoked Assignment is reactivated while the Course is Active.

The Assignment is the ordinary Course-specific membership defined in [Course
access](course-access.md#course-assignment-through-admin-assisted-booking).
Origin adds no assisted or booking-created membership state.

Private Course-scoped administration may therefore open any fully registered
Participant as a target even when no Assignment exists. The Course Participant
collection remains Assignment-based, while separate bounded target discovery
may include eligible Participants without an Assignment. Neither surface is
exposed to Participants.

### Eligibility And Deadline

Apart from not requiring Active membership before the operation begins, an
Admin-assisted set-Selection has the same validity rules as Participant
creation. It requires:

- an Active target Participant;
- an Active Course;
- a Scheduled Module;
- `now < startsAt` using definite instants;
- an Active Group; and
- matching Group and Module Course ownership.

An Admin User has no late-booking, Archived-Course, Cancelled-Module, Disabled
Participant, or Archived-Group override. Capacity, conflict prevention, and
approval rules remain absent.

### Set Selected Group Semantics

The action produces:

```text
no Selection -> selected Group G
Group G      -> Group G
Group A      -> Group B
```

The same Group is idempotent. Another eligible Group replaces the old choice
and leaves one Selection. The old value is not retained as product-level change
history.

### Removal

An Active Admin User MAY remove an existing Selection only while the Course is
Active, Module is Scheduled, and `now < startsAt`. At or after `startsAt`, or
for an Archived Course or Cancelled Module, removal is refused. Successful
removal leaves no Selection and does not create or reactivate an Assignment.
Removal does not require an Active Assignment: a retained Revoked Assignment
remains Revoked, and absent membership remains absent.

### Coherent Refusal

Participant, Course, Module, Group, deadline, and membership outcome MUST be
validated against authoritative current state before the operation is
accepted. Refusal MUST NOT leave a newly created or reactivated Assignment or a
partial Selection. This is an atomic product outcome, not a prescribed
persistence mechanism.

## Lifecycle Effects On Selections

### Course Assignment Revocation

When an Active Course Assignment is Revoked:

- remove Selections for Scheduled Modules where `now < startsAt`;
- retain Selections for Scheduled Modules where `startsAt <= now`; and
- retain every Selection for a Cancelled Module.

Retained Selections are historical while the Assignment is Revoked. A future
Selection removed by revocation is not restored by reactivation.

### Participant Disable

When a Participant becomes Disabled, apply the same boundary across all their
Courses:

- remove Selections for Scheduled Modules where `now < startsAt`;
- retain Selections for Scheduled Modules where `startsAt <= now`; and
- retain every Selection for a Cancelled Module.

All retained Selections are historical while the Participant is Disabled. A
future Selection removed by Disable is not restored by Re-enable.

### Module Cancellation And Course Archival

Module cancellation retains every current Selection but makes it historical.
Course archival also makes retained Selections historical without deleting or
rewriting them. Neither lifecycle action creates a separate Selection state.

### Assignment Reactivation In Progress

If an in-progress Selection was retained during Assignment revocation,
reactivating that Assignment makes the Selection live again when the
Participant and Course are Active, the Module is Scheduled, and
`now < endsAt`. This is not late booking because the Selection already existed
and was legitimately retained.

### Participant Re-enable In Progress

If an in-progress Selection was retained during Participant Disable,
Re-enabling the Participant makes it live again when the Course and Assignment
are Active, the Module is Scheduled, and `now < endsAt`.

## Scheduling Conflicts

The core booking domain permits overlapping Modules within or across Courses
and a Participant selecting overlapping Modules. Conflict prevention or
warnings require a separate future requirement.

## Concurrent And Stale Changes

Every Selection mutation is authorized and validated against authoritative
current state when accepted. Booking loses at exact `startsAt`; a newly
Disabled Participant, Disabled Admin User, Archived Course, Cancelled Module,
Archived Group, or Revoked Assignment blocks a stale action even if a form was
opened earlier.

For concurrent valid changes to one Selection, the latest successfully
accepted state MAY win. The product has no user-facing merge or conflict
workflow. Group capacity is absent, so no cross-Participant reservation lock is
required.

## History, Attendance, And Notifications

The product retains current Selections where lifecycle rules require current
or historical meaning. Replaced or removed pre-start values do not require a
complete change log. A future operational or legal audit model is a separate
concern.

A Selection means intended participation and MUST NOT prove attendance.
Attendance, check-in, certification, and Participant-visible attendance
history are outside v1.

Booking state becomes authoritative regardless of whether any email, push,
SMS, calendar invitation, or other notification exists or succeeds.
Notification delivery and Participant email verification are not part of
booking correctness.
