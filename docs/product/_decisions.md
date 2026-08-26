# Product Decisions

## Separate Membership From Module Participation

A Course Assignment answers whether a Participant belongs to a Course. A
Module Selection answers whether that Participant intends to attend one Module
and which Group they chose. Keeping these concepts separate allows Course
membership with all, some, or no Modules selected and prevents membership from
silently creating bookings.

## Absence Means Non-Participation

A missing Module Selection means the Participant is not participating in the
Module. The model does not distinguish unanswered from declined and does not
add an RSVP lifecycle around a simple current choice.

## Keep Groups Course-Wide

Groups are deliberately simple Course-wide attendance choices. Their identity
and logistical details do not vary by Module. Per-Module Group availability or
details would add another relationship and are excluded until a concrete need
justifies that complexity.

## Use One Shared Reusable Course Invite

A shared Course Invite intentionally trades fine-grained invitation control
for simple onboarding. Anyone possessing a valid invite may attempt to join,
and the link may be forwarded and reused. Authentication, explicit join
confirmation, Course state, invite state, and prior revocation still govern
whether joining succeeds.

## Retain Revoked Course Assignments

A revoked Course Assignment is retained so an Admin's removal remains
effective even while the Course's generic shared invite is usable. Only an
Admin may reactivate the assignment, and only while the Course is Active.

## Keep Course Visibility Private By Default

The product has no public Course catalogue. Admin authority, Active Course
membership, or possession of a valid active Invite is required to discover a
Course. A valid Invite may expose the Course name as minimal join-flow context
without exposing rosters, Selections, access instructions, or administrative
information.

## Freeze The Course Timezone Once Scheduling Begins

A Course timezone may change while the Course has no Modules. The first Module
makes the timezone immutable so every Module interval retains one stable
interpretation without timezone migration, reinterpretation, or automatic
rescheduling rules.

## Represent Module Scheduling As An Interval

Each Module has `startsAt` and `endsAt`, interpreted in the Course timezone,
with `endsAt > startsAt`. Participant booking closes at `startsAt`, and schedule
changes are allowed only before that instant. The end time adds useful schedule
meaning without adding a duration concept or lifecycle states.

## Preserve Courses Through Permanent Archival

Courses are never hard-deleted, even when unused or created accidentally.
Active and Archived are the complete lifecycle: archival preserves the Course
and its history, remains administratively manageable, and cannot be reversed.

## Keep One Booking-System Identity

Participant is the booking-system user identity. Admin is an additional
capability on that same identity, defaulting to false, rather than a separate
account type. This keeps Course membership, booking participation, and
administrative authority attached to one user model.

## Bootstrap Only The First Booking-System User

An empty installation exposes `Register admin` at the Admin authentication
entry point. Only the first successfully registered booking-system user gains
Admin capability through bootstrap; the flow closes once any user exists and
does not reopen merely because no Admin remains.

## Keep External Identities Separate

Authentication-provider identities establish access to a booking-system user
but are not that user. The relationship remains compatible with multiple
external identities for one user in the future while automatic personal-data
merging and a current self-service linking workflow remain excluded.

## Use One Module Selection For Assisted Booking

An Admin may add an existing user to a Module and Group or remove an existing
Selection. The action uses the same Module Selection as Participant booking,
avoiding a parallel Admin-booking entity while the remaining deadline,
eligibility, replacement, and change-action policies stay explicitly open.

## Require User Administration Without Inventing Deletion

Admins need to inspect and manage booking-system users and Admin capability.
That requirement does not imply hard deletion, complete CRUD, historical
reference handling, or last-Admin demotion rules before those policies are
accepted.

## Exclude Workflow-Heavy Booking Features

Capacity, waiting lists, approvals, per-Module Group availability, and
recurring scheduling are deliberately excluded. Each would introduce new
states, relationships, or conflict rules beyond the initial product need.

## Separate Current Booking From Adjacent Concerns

Module Selection records booking intent, not proof of attendance. Its live or
historical meaning is derived from surrounding state, allowing cancellation to
retain the Selection without inventing a cancelled-booking workflow. Complete
audit history, actual attendance, and notifications remain separate concerns.
