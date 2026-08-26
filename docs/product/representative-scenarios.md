# Representative Scenarios

These scenarios demonstrate how the normative product rules compose. They do
not define an implementation test suite or add behavior beyond the focused
specifications.

## A. Normal Participation

A Course has Group A, Group B, Remote, and three Modules with valid `startsAt`
and `endsAt` intervals. An assigned Participant chooses:

- Module 1 → Group A;
- Module 2 → Remote; and
- Module 3 → no selection.

Before Module 2's `startsAt`, the Participant changes its Selection to Group B.
The result is one Selection for Group B; the previous Remote choice is
replaced. This is valid.

## B. Shared Invite And Minimal Visibility

Alice and Bob receive the same valid active Course Invite. Before joining, the
Invite may show the Course name so each person can identify the target, but it
does not expose the roster, Module Selections, private access instructions, or
administrative information. Each authenticates as a separate Participant and
explicitly confirms joining. Each receives an independent Active Course
Assignment. Reuse of the shared Invite is expected.

A person without Admin capability, Active membership, or a valid active Invite
cannot otherwise discover the Course; no public Course catalogue exists.

## C. Repeated Invite

Alice already has an Active Course Assignment and follows the same Invite
again. No duplicate Assignment is created, and she may proceed to the Course.

## D. Revoked Participant

An Admin removes Alice. Her Course Assignment becomes Revoked, and her future
Module Selections are removed from live booking state. Alice follows the
still-valid shared Invite but cannot reactivate herself. While the Course is
Active, an Admin may reactivate her Assignment, but reactivation does not
restore the removed Selections.

## E. Module Interval And Participant Deadline

Module 1 has `startsAt` Monday 10:00 and `endsAt` Monday 11:30 in the Course
timezone, so its interval is valid. Alice has selected Module 1 → Remote. At
exactly Monday 10:00 the Module has started and she can no longer create,
change, or revoke a Selection through normal Participant booking behavior.

## F. Pre-Start Module Rescheduling

Alice has selected Module 2 → Room A. Before Module 2's `startsAt`, an Admin
changes both `startsAt` and `endsAt`, preserving `endsAt > startsAt`. Alice
remains selected for Room A on the same Module, and her Participant deadline
follows the edited `startsAt`.

## G. Started Module Schedule Is Immutable

Module 2 reaches its `startsAt`. An Admin then attempts to change either
`startsAt` or `endsAt`, including an attempt to move the Module into the future.
The schedule change is refused. A descriptive edit may still be accepted where
the product rules otherwise permit it.

## H. Course Timezone Becomes Immutable

An Admin may change a newly created Course's timezone while it has no Modules.
After the first Module is created, a timezone change is refused; the system
does not reinterpret Module intervals or automatically reschedule them.

## I. New Module Is Added

Participants already belong to a Course when an Admin adds Module 4 with a
valid `startsAt` and `endsAt`. Nobody is automatically selected. Each eligible
Participant may explicitly select an Active Group before Module 4's `startsAt`.

## J. Cancelled Module Retains Selections

Alice and Bob have Module Selections for a future Module. An Admin Cancels the
Module. The Module remains identifiable as Cancelled and both Selections remain
historically recorded, but neither is a live booking. The Module accepts no new
Selections, and normal Participant modification is unavailable. No separate
cancelled-booking state is created.

## K. Historically Used Group

Room A has historical Module Selections. It must not be hard-deleted in a way
that destroys those references. It should be Archived when its other lifecycle
conditions permit.

## L. Group With Future Use

Remote has active future Module Selections. An Admin cannot Archive it while
those Selections still reference it, and the Participants cannot be silently
moved to another Group.

## M. Overlapping Module Intervals

A Participant selects two Modules whose `startsAt`/`endsAt` intervals overlap.
The core booking domain allows both Selections and performs no automatic
conflict prevention.

## N. Participant Joins Late

Alice joins a Course after Modules 1 and 2 have reached `startsAt`. She cannot
select Modules 1 or 2. She may select an Active Group for future Scheduled
Module 3 when all other eligibility rules are satisfied.

## O. Archived Course Rejects Assignment Reactivation

Course A is Archived. An Admin cannot create a new Course Assignment for Alice
and cannot reactivate Alice's existing Revoked Assignment. The Course therefore
gains neither new nor reactivated membership.

## P. Course Archival Is Permanent

An unused Course created accidentally is not hard-deleted. Once its archival
preconditions are satisfied, an Admin Archives it. The Course remains visible
and manageable in the Admin experience, preserves its history, and cannot be
restored, unarchived, or reactivated.

## Q. Archival Blocked By Future Work

Course A is Active and contains a Scheduled Module whose `startsAt` is next
week, with Alice selected into Room A. Archival is refused while the unresolved
future Module and live future Selection remain. Cancelling the Module retains
Alice's Selection historically while ending its live-booking meaning; after all
archival preconditions are satisfied, the Course may be Archived.

## R. First-User Admin Bootstrap

No booking-system user exists. The Admin authentication entry point offers
`Register admin`; the first person to complete registration becomes the first
Participant with Admin capability. The bootstrap then closes because a user
exists. It does not reopen merely because the installation later has zero
Admins.

## S. Admin-Assisted Booking

An existing user cannot conveniently book a Module. An Admin adds that user to
the Module and Room A, creating the same Module Selection concept used by a
Participant. The Admin may later remove the Selection. This scenario does not
decide the Admin deadline, Course Assignment prerequisite, replacement behavior
when another Group is already selected, or whether changing Group is a
first-class Admin action.
