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

A person without current Admin User access, Active membership, or a valid
active Invite cannot otherwise discover the Course; no public Course catalogue
exists.

## C. Repeated Invite

Alice already has an Active Course Assignment and follows the same Invite
again. No duplicate Assignment is created, and she may proceed to the Course.

## D. Revoked Participant

An Active Admin User removes Alice. Her Course Assignment becomes Revoked, and
her future Module Selections are removed from live booking state. Alice follows
the still-valid shared Invite but cannot reactivate herself. While the Course
is Active, an Active Admin User may reactivate her Assignment, but reactivation
does not restore the removed Selections.

## E. Module Interval And Participant Deadline

Module 1 has `startsAt` Monday 10:00 and `endsAt` Monday 11:30 in the Course
timezone, so its interval is valid. Alice has selected Module 1 → Remote. At
exactly Monday 10:00 the Module has started and she can no longer create,
change, or revoke a Selection through normal Participant booking behavior.

## F. Pre-Start Module Rescheduling

Alice has selected Module 2 → Room A. Before Module 2's `startsAt`, an Active
Admin User changes both `startsAt` and `endsAt`, preserving `endsAt > startsAt`.
Alice remains selected for Room A on the same Module, and her Participant
deadline follows the edited `startsAt`.

## G. Started Module Schedule Is Immutable

Module 2 reaches its `startsAt`. An Active Admin User then attempts to change
either `startsAt` or `endsAt`, including an attempt to move the Module into the
future. The schedule change is refused. A descriptive edit may still be
accepted where the product rules otherwise permit it.

## H. Course Timezone Becomes Immutable

An Active Admin User may change a newly created Course's timezone while it has
no Modules. After the first Module is created, a timezone change is refused;
the system does not reinterpret Module intervals or automatically reschedule
them.

## I. New Module Is Added

Participants already belong to a Course when an Active Admin User adds Module
4 with a valid `startsAt` and `endsAt`. Nobody is automatically selected. Each
eligible Participant may explicitly select an Active Group before Module 4's
`startsAt`.

## J. Cancelled Module Retains Selections

Alice and Bob have Module Selections for a future Module. An Active Admin User
Cancels the Module. The Module remains identifiable as Cancelled and both
Selections remain historically recorded, but neither is a live booking. The
Module accepts no new Selections, and normal Participant modification is
unavailable. No separate cancelled-booking state is created.

## K. Historically Used Group

Room A has historical Module Selections. It must not be hard-deleted in a way
that destroys those references. It should be Archived when its other lifecycle
conditions permit.

## L. Group With Future Use

Remote has active future Module Selections. An Active Admin User cannot Archive
it while those Selections still reference it, and the Participants cannot be
silently moved to another Group.

## M. Overlapping Module Intervals

A Participant selects two Modules whose `startsAt`/`endsAt` intervals overlap.
The core booking domain allows both Selections and performs no automatic
conflict prevention.

## N. Participant Joins Late

Alice joins a Course after Modules 1 and 2 have reached `startsAt`. She cannot
select Modules 1 or 2. She may select an Active Group for future Scheduled
Module 3 when all other eligibility rules are satisfied.

## O. Archived Course Rejects Assignment Reactivation

Course A is Archived. An Active Admin User cannot create a new Course Assignment
for Alice and cannot reactivate Alice's existing Revoked Assignment. The Course
therefore gains neither new nor reactivated membership.

## P. Course Archival Is Permanent

An unused Course created accidentally is not hard-deleted. Once its archival
preconditions are satisfied, an Active Admin User Archives it. The Course
remains visible and manageable in the administration experience, preserves its
history, and cannot be restored, unarchived, or reactivated.

## Q. Archival Blocked By Future Work

Course A is Active and contains an upcoming Scheduled Module whose `startsAt`
and `endsAt` are next week, with Alice selected into Room A. Archival is
refused while the not-yet-ended Scheduled Module remains. Cancelling the Module
retains Alice's Selection historically while ending its live-booking meaning;
after all archival preconditions are satisfied, the Course may be Archived.

## R. Participant Exists Before First Admin

A Participant already exists, but no Admin User has ever existed. The
administration authentication entry point still offers `Register admin`. A
person completes bootstrap and becomes the first Admin User and Super Admin
without creating, changing, or merging the existing Participant.

## S. Same External Identity, Two Domain Identities

Alice's Google identity authenticates her existing Participant identity. The
same Google identity also authenticates a separate Admin User identity in the
administration context. Her Participant Course membership and Module
Selections remain independent of her Admin User authority and lifecycle.

## T. Super Admin Bootstrap

No Admin User has ever existed. The first successful Admin registration
authenticates through the accepted external mechanism, enters a required real
name, and creates the first Admin User with Super Admin authority. Later
disabling or deletion of ordinary Admin Users does not reopen bootstrap.

## U. Admin Invite Claim

An Active Admin User creates an Admin Invite. Bob opens it, authenticates,
enters his real name, and completes onboarding. Bob becomes an ordinary Active
Admin User and the Invite becomes Claimed. Following the same Invite again
cannot create another Admin User.

## V. Abandoned Onboarding Does Not Consume Invite

A recipient opens an Active Admin Invite and starts onboarding but leaves
before Admin User creation succeeds. The Invite remains Active and available
for one successful claim.

## W. Admin Invite Revocation

Active Admin User A creates an Admin Invite. Active Admin User B Revokes it. The
Invite becomes Revoked and cannot be claimed, re-enabled, or reactivated.

## X. Ordinary Admin User Administration

Admin User A and Admin User B are ordinary Active Admin Users. Admin User A may
edit Admin User B's real name, Disable or Re-enable Admin User B, or delete
Admin User B.

## Y. Super Admin Protection

An ordinary Active Admin User attempts to edit, disable, or delete the Super
Admin. Each operation is refused, and the ordinary Admin User cannot alter
Super Admin authority.

## Z. Super Admin Authority

The Super Admin administers an ordinary Admin User regardless of which Admin
User created that account or its Admin Invite. The Super Admin may edit their
own real name but cannot disable themselves.

## AA. No Automatic Admin Invite Expiry

An unused Admin Invite remains Active until it is Claimed or manually Revoked.
Elapsed time alone does not make it unusable.

## AB. Admin-Assisted Booking Without Prior Membership

Alice is an existing Participant with no Course Assignment. An Active Admin
User assigns her to Module 3 and Room A while the Course is Active, the Module
is Scheduled and before `startsAt`, and Room A is an Active Group in the same
Course:

```text
Alice -> Module 3 -> Room A
```

Alice receives one Active Course Assignment and one Module Selection. The
Assignment and Selection are the ordinary product concepts; no assisted
membership or Admin booking state is created.

## AC. Admin-Assisted Booking After Revocation

Alice's Course Assignment is Revoked. The Course is Active, the Module is
Scheduled and has not reached `startsAt`, and the selected Group is Active in
the same Course. When an Active Admin User assigns Alice to that Module and
Group, her Assignment becomes Active and the Module Selection is created. No
other previously removed Selection is restored.

## AD. Admin-Assisted Booking After The Deadline

At or after a Module's `startsAt`, an Active Admin User attempts the same
assignment for Alice. The operation is refused. If Alice had no Course
Assignment or a Revoked Assignment, it remains respectively absent or Revoked;
the failed booking attempt does not leave new or reactivated membership behind.

## AE. Admin Changes The Selected Group

Alice currently has:

```text
Alice -> Module -> Room A
```

Before `startsAt`, an Active Admin User assigns her to Remote for the same
Module. When the Course, Module, and Group remain eligible, the result is:

```text
Alice -> Module -> Remote
```

Remote is the sole current Selection. There is no second Selection and no
separate first-class change-booking state.

## AF. In-Progress Module Blocks Course Archival

An Active Course contains a Scheduled Module where:

```text
startsAt <= now < endsAt
```

The Module is in progress, so Course archival is refused. At the exact
`endsAt` instant, the Module has ended and no longer blocks archival on
temporal grounds, assuming every other archival precondition is satisfied.

## AG. Explicit Cancellation Resolves The Archival Blocker

An Active Admin User explicitly Cancels an upcoming or in-progress Scheduled
Module under the normal cancellation rules. Its Module Selections remain as
historical records but are no longer live bookings. The Cancelled Module no
longer blocks Course archival merely because its original `endsAt` has not
arrived; archival itself did not Cancel the Module or mutate its Selections.
