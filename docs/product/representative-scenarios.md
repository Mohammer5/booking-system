# Representative Scenarios

These scenarios demonstrate how the normative product rules compose. They do
not define an implementation test suite or add behavior beyond the focused
specifications.

## A. Participant Onboarding Without An Invite

A new person authenticates in participant context without a Course Invite.
They must supply valid name and unique email before normal application access.
Until onboarding succeeds they can only authenticate, continue onboarding, or
sign out; they cannot access or Join a Course or mutate a Selection. Successful
completion creates one Active Participant with zero Course Assignments.

## B. Course Invite Continues Through Onboarding

A new person opens a Course Invite, authenticates, and completes mandatory
Participant onboarding. The Invite is then resumed, but no Assignment exists
yet. The Invite, Course, Participant, and Assignment are revalidated, and the
new Active Participant must still explicitly confirm Join.

## C. Participant Profile Editing

An Active Participant changes their own name and email. Later an Active Admin
User edits both fields. Participant identity, state, Assignments, Selections,
and history remain unchanged. An attempted email change to an address held by
another Participant is refused and leaves the existing profile unchanged.

## D. External Authentication Principals

Several sign-in methods resolved by the authentication layer to the same
stable principal reach the same current Participant or Admin User. A different
external principal remains different and is not merged merely because name or
email matches. The same principal may independently reach one Participant in
participant context and one Admin User in administration context.

## E. Normal Participation

An Active Participant with an Active Assignment chooses Group A for Module 1,
Remote for Module 2, and no Selection for Module 3. Before Module 2's
`startsAt`, they replace Remote with Group B. Group B is the sole current
Selection; no prior-choice history is retained merely for audit.

## F. Participant Disable

An Active Participant has Selections for a future Scheduled Module, an
in-progress Scheduled Module, an ended Module, and a Cancelled Module. An
Active Admin User Disables them. The future Selection is removed; the
in-progress, ended, and Cancelled Selections remain but are historical. Every
Assignment retains its Active or Revoked state, and participant-facing access
and actions are refused globally.

## G. Participant Re-enable

The same Participant is Re-enabled. Removed future Selections do not return.
Active Assignments grant access again. If the retained in-progress Selection's
Course and Assignment are Active and its Module remains Scheduled before
`endsAt`, that Selection becomes live again.

## H. Shared Invite And Minimal Visibility

Alice and Bob receive the same enabled current Course Invite. It may show the
Course name but no roster, Participant profile, Selection, private access
detail, or administration information. Each Active Participant explicitly
confirms Join and receives an independent Active Assignment. Reuse and
forwarding are expected.

## I. Recognized Unusable Course Invite

An old Invite is Disabled, replaced, or belongs to an Archived Course. Because
the token remains recognizable and associated with its Course, the unavailable
result may show that Course's name only. Join is refused and no private Course
data is exposed. A malformed token with no Course association reveals no Course
name.

## J. Repeated And Revoked Invite Use

An Active Participant who already has an Active Assignment follows the current
Invite again; the outcome is a successful no-op with no duplicate Assignment.
A Participant whose Assignment is Revoked follows the same Invite and cannot
self-reactivate. Only an Active Admin User may reactivate the Assignment while
the Course is Active.

## K. Assignment Revocation

Alice's Active Assignment has a future Scheduled Selection, an in-progress
Scheduled Selection, and a Cancelled-Module Selection. Revocation removes the
future Selection and retains the in-progress and Cancelled Selections as
history. Revoking the already-Revoked Assignment again is a successful no-op.

## L. Assignment Reactivation In Progress

While the Course is Active and Alice is Active, an Admin User reactivates her
Revoked Assignment before a retained in-progress Module reaches `endsAt`. The
retained Selection becomes live again. Removed future Selections do not return.

## M. New Course

An Admin User creates a Course without selecting a timezone. It is Active,
uses `Europe/Berlin`, and has zero Groups, Modules, Assignments, and Course
Invite. No other business object is created implicitly.

## N. Course Timezone And DST

Before a Course has a Module, an Admin User may replace its valid IANA timezone.
After the first Module exists, the timezone is immutable. A nonexistent
`Europe/Berlin` local time during the spring-forward transition is rejected. An
ambiguous fall-back local time requires the Admin User to choose the intended
occurrence before it becomes a definite instant.

## O. Backdated Module Refusal

Creating a Module with `startsAt <= now` is refused even if
`endsAt > startsAt`. Before an existing Scheduled Module starts, a reschedule
whose `newStartsAt <= now` is also refused. A valid creation or reschedule
requires a future start and a later end.

## P. Module Deadline And Schedule Immutability

Alice has selected a Module. At exact `startsAt`, Participant and Admin-assisted
Selection creation, replacement, and removal are refused. The Module's schedule
also becomes immutable. Descriptive edits may still be accepted while the
Course is Active.

## Q. Module Cancellation Boundary

An Active Admin User may Cancel an upcoming or in-progress Scheduled Module in
an Active Course while `now < endsAt`. At exact `endsAt`, cancellation is
refused. Cancellation is terminal and preserves every retained Selection as
history.

## R. Module Deletion

A future Module whose pre-start Selections were all removed and an ended Module
with zero retained Selections may be eligible for deletion in an Active Course.
A Module with any retained Selection, including a historical Selection or one
for a Cancelled Module, cannot be deleted.

## S. Group Archival During An In-Progress Module

A retained Selection references Group A for a Scheduled Module where
`startsAt <= now < endsAt`. That Selection does not block Group archival. It
continues identifying Group A and may remain live when every other live
predicate holds, while Group A becomes unavailable for new future choices.

## T. Group Reactivation And Name Conflict

An Archived Group may reactivate while its Course is Active. If its normalized
name conflicts with an Active Group name, reactivation is refused. An Admin
User may rename the Archived Group and retry; successful reactivation preserves
identity and does not restore removed Selections.

## U. Group Deletion

An Active-Course Group with no retained Selection may be deleted even if a
pre-start Selection once referenced it but was removed. A retained historical
Selection blocks deletion. No complete past-reference log is consulted.

## V. Archived Course Is Read-Only

After all not-yet-ended Scheduled Modules are resolved, an Admin User Archives
a Course. Course, Invite, Group, Module, Assignment-addition/reactivation, and
Selection structure is frozen. An Active Participant with an Active Assignment
retains read-only access to Course information and their history. An Admin User
may later revoke that Assignment to remove access, but it cannot reactivate in
the Archived Course.

## W. Live And Historical Selection Transitions

With Active Participant, Course, and Assignment and a Scheduled Module, a
retained Selection is live while upcoming and while in progress. It becomes
historical at exact `endsAt`. It also becomes historical immediately if the
Module is Cancelled, Assignment is Revoked, Participant is Disabled, or Course
is Archived. These are derived meanings, not stored Selection states.

## X. First Admin Bootstrap

Participants may already exist while no Admin User has ever existed. The
administration entry still offers `Register admin`. The first successfully
accepted registrant supplies a required name and becomes an Active Super Admin.
Authentication alone cannot create later Admin Users.

## Y. Super Admin Promotion

The bootstrap Super Admin promotes an Active ordinary Admin User. Both remain
the same domain identities and now have Super Admin authority. An ordinary
Admin cannot promote anyone, and a Disabled ordinary Admin must be Re-enabled
before promotion.

## Z. Super Admin Protection

A Super Admin's attempt to Disable or delete themselves is refused. A mutation
that would leave zero Active Super Admins is refused. When two Active Super
Admins exist, one may validly edit, Disable, or delete the other as long as one
Active Super Admin remains. No demotion action exists.

## AA. Admin Invite Claim

An Active Admin User creates an Admin Invite. Bob opens it, sees only that an
Admin registration invitation is available, authenticates, supplies a required
name, and completes onboarding. Bob becomes an ordinary Active Admin User and
the Invite becomes terminal Claimed.

## AB. Existing Admin Claims Another Invite

An external principal already backing an Active Admin User attempts to claim an
Active Invite; the claim is refused and the Invite remains Active. The same is
true for a Disabled Admin User, who is not Re-enabled by the attempt.

## AC. Deleted Admin Returns

A legitimately deleted Admin User's former external principal later uses a new
Active Admin Invite. Successful onboarding creates a new ordinary Active Admin
User identity with a newly supplied name. Deleted identity, state, and Super
Admin authority are not restored.

## AD. Admin Invite URL Loss

The complete Admin Invite URL is shown and copied at creation. The later Invite
list shows creation time and state but cannot reveal the URL. If the URL is
lost while Active, an authorized Admin User Revokes the Invite and creates a
new one.

## AE. Concurrent Admin Invite Claim

Two people begin onboarding through one Active Admin Invite. The first valid
Admin User creation accepted against current state succeeds and makes the
Invite Claimed. The second completion is refused and leaves no partial Admin
User, despite having started earlier.

## AF. Admin Disable Or Deletion Does Not Cascade

An authorized actor Disables or deletes an Admin User. Courses, Groups,
Modules, Participants, Assignments, Selections, Course Invites, and Admin
Invites created by that Admin User remain unchanged. Previously accepted
actions remain authoritative.

## AG. Admin-Assisted Booking

Alice is an existing Active Participant without an Assignment. Before a future
Scheduled Module's `startsAt`, an Active Admin User selects an Active Group in
the same Active Course. One ordinary Active Assignment and one Selection are
created. Repeating the Group is idempotent; choosing another replaces it. At or
after `startsAt`, or while Alice is Disabled, the action is refused without a
membership side effect.

## AH. Stale Actions Lose To Current State

Alice opens an enabled Course Invite, but it is replaced before Join; her stale
confirmation cannot create membership. Separately, Alice opens a booking form
before `startsAt`, but the Module reaches `startsAt` or her Assignment is
Revoked before acceptance; the change is refused. An Admin mutation opened by
an Active Admin User is likewise refused if that actor becomes Disabled before
acceptance.

## AI. Overlapping Modules

An Active eligible Participant selects two Modules whose definite intervals
overlap. Both Selections are valid because the core domain performs no
automatic scheduling-conflict prevention.
