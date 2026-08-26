# Representative Scenarios

These scenarios demonstrate how the normative product rules compose. They do
not define an implementation test suite or add behavior beyond the focused
specifications.

## A. Normal Participation

A Course has Group A, Group B, Remote, Module 1, Module 2, and Module 3. An
assigned Participant chooses:

- Module 1 → Group A;
- Module 2 → Remote; and
- Module 3 → no selection.

Before Module 2 starts, the Participant changes its Selection to Group B. The
result is one Selection for Group B; the previous Remote choice is replaced.
This is valid.

## B. Shared Invite

Alice and Bob receive the same valid Course Invite. Each authenticates as a
separate Participant and explicitly confirms joining. Each receives an
independent Active Course Assignment. Reuse of the shared Invite is expected.

## C. Repeated Invite

Alice already has an Active Course Assignment and follows the same Invite
again. No duplicate Assignment is created, and she may proceed to the Course.

## D. Revoked Participant

An Admin removes Alice. Her Course Assignment becomes Revoked, and her future
Module Selections are removed from current booking state. Alice follows the
still-valid shared Invite but cannot reactivate herself. An Admin must
reactivate her Assignment, and reactivation does not restore the removed
Selections.

## E. Module Starts

Alice has selected Module 1 → Remote. At Module 1's start time, she can no
longer change or revoke that Selection through normal Participant booking
behavior.

## F. Module Is Rescheduled

Alice has selected Module 2 → Room A. An Admin changes Module 2's date and
time. Alice remains selected for Room A on the same Module. Her ability to
modify the Selection follows the Module's edited start time.

## G. New Module Is Added

Participants already belong to a Course when an Admin adds Module 4. Nobody is
automatically selected. Each eligible Participant may explicitly select an
Active Group for Module 4 before it starts.

## H. Historically Used Group

Room A has historical Module Selections. It must not be hard-deleted in a way
that destroys those references. It should be Archived when its other lifecycle
conditions permit.

## I. Group With Future Use

Remote has active future Module Selections. An Admin cannot Archive it while
those Selections still reference it, and the Participants cannot be silently
moved to another Group.

## J. Overlapping Modules

A Participant selects two Modules whose scheduled times overlap. The core
booking domain allows both Selections and performs no automatic conflict
prevention.

## K. Participant Joins Late

Alice joins a Course after Modules 1 and 2 have started or finished. She cannot
select Modules 1 or 2. She may select an Active Group for future Scheduled
Module 3 when all other eligibility rules are satisfied.

## L. Admin Assignment To Archived Course

Course A is Archived, and Alice has never had a Course Assignment to it. An
Admin attempts to assign Alice to Course A. The assignment is refused because
new Course Assignments cannot be created for an Archived Course.

## M. Archival Blocked By Future Module

Course A is Active and contains a Scheduled Module next week. An Admin attempts
to Archive Course A. Archival is refused because the unresolved future Module
remains. After the Module is resolved under the existing Module lifecycle rules
and no active future Module Selections remain, the Course may be Archived.

## N. Archival Blocked By Future Selection

Alice has an active Module Selection for a future Module in Course A. An Admin
attempts to Archive the Course without resolving that future participation.
Archival is refused. The Course may be Archived only after the future Module
and Selection state is resolved under the existing rules.
