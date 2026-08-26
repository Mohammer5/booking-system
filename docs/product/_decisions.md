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

A revoked Course Assignment is retained so an Active Admin User's removal
remains effective even while the Course's generic shared invite is usable.
Only an Active Admin User may reactivate the assignment, and only while the
Course is Active.

## Keep Course Visibility Private By Default

The product has no public Course catalogue. Current Admin User access, Active
Course membership, or possession of a valid active Invite is required to
discover a Course. A valid Invite may expose the Course name as minimal
join-flow context without exposing rosters, Selections, access instructions,
or administrative information.

## Freeze The Course Timezone Once Scheduling Begins

A Course timezone may change while the Course has no Modules. The first Module
makes the timezone immutable so every Module interval retains one stable
interpretation without timezone migration, reinterpretation, or automatic
rescheduling rules.

## Represent Module Scheduling As An Interval

Each Module has `startsAt` and `endsAt`, interpreted in the Course timezone,
with `endsAt > startsAt`. Participant and Admin-assisted Module Selection
modification closes at `startsAt`, and schedule changes are allowed only before
that instant. The end time adds useful schedule meaning without adding a
duration concept or lifecycle states.

## Block Course Archival Until Scheduled Modules End

A Scheduled Module remains unresolved for Course archival while its `endsAt`
is in the future, whether the Module is upcoming or already in progress. At
the exact `endsAt` instant, it has ended and no longer blocks archival merely
because it exists. Explicit cancellation may resolve a not-yet-ended Module
under the normal Module lifecycle rules while preserving its Selections as
history and ending their live-booking meaning. Archival never implicitly
cancels Modules or mutates Selections, and no additional Module or Course state
is needed to express these temporal facts.

## Preserve Courses Through Permanent Archival

Courses are never hard-deleted, even when unused or created accidentally.
Active and Archived are the complete lifecycle: archival preserves the Course
and its history, remains administratively manageable, and cannot be reversed.

## Separate Participant And Admin User Identities

Participant and Admin User are distinct booking-system domain entities because
Course membership and Module participation have different responsibilities and
lifecycles from administrative access. Neither identity implies the other, and
Admin access is not a capability or `isAdmin` property on Participant.

## Keep External Identities Separate From Domain Identities

An authentication-provider identity may establish access to a Participant, an
Admin User, or both independently, but it is neither domain identity. Allowing
the same provider identity to back both preserves a person's convenient access
without merging Participant membership with Admin authorization. Automatic
personal-data merging and a current self-service linking workflow remain
excluded.

## Bootstrap Only The First-Ever Admin User

The administration entry point exposes `Register admin` until the first Admin
User has ever been created, regardless of whether Participants exist. The
first successful registrant supplies a real name and becomes the Super Admin.
Tying bootstrap to Admin User creation history keeps Participant onboarding
independent and prevents bootstrap from reopening after later Admin User
disabling or deletion.

## Distinguish Super Admin By Authority

Super Admin is broader authorization on the first Admin User, not another
identity entity. Ordinary Admin Users may administer other ordinary Admin
Users but cannot mutate the Super Admin; the Super Admin may administer Admin
Users subject to explicit self-protection. This encodes the required protection
without inventing a general role-promotion system.

## Keep Admin User Disabling And Deletion Distinct

A Disabled Admin User remains identifiable but has no administrative access.
Deletion of an ordinary Admin User is a separate accepted operation, not a
synonym for Disabled and not a decision about Participant deletion. Keeping
the concepts separate avoids inventing audit retention or cross-identity
lifecycle coupling.

## Use Separate One-Time Admin Invites

Course Invites and Admin Invites grant access to different responsibilities.
Course Invites remain Course-specific and reusable, while independently
created Admin Invites create ordinary Admin Users and become terminal when
Claimed or Revoked. Admin Invites do not expire automatically, so manual
Revocation is the only way to invalidate an unused Invite.

## Require Explicit Admin User Onboarding

Every Admin User supplies one real-name field during bootstrap or invited
onboarding. Provider profile data may assist the UI but is not authoritative.
An Admin Invite is consumed only after Admin User creation succeeds so opening
an Invite, starting authentication, or abandoning onboarding cannot waste it.

## Use One Module Selection For Assisted Booking

An Active Admin User may set an existing Participant's Module Selection to an
eligible Group or remove the Selection under the normal booking modification
deadline and lifecycle rules. The Participant need not already have a Course
Assignment: a successful set-Selection operation creates an Active Assignment,
leaves an existing Active Assignment unchanged, or reactivates a Revoked
Assignment while the Course is Active. Booking eligibility is validated before
that membership and Selection outcome is accepted, so refusal leaves no newly
created or reactivated membership behind.

The operation uses the same Module Selection as Participant booking. Setting
the selected Group to its current value is idempotent, and setting another
eligible Group replaces the current Selection because only one Selection may
exist for a Participant and Module. Admin-assisted booking grants no deadline,
Course, Module, or Group lifecycle override and introduces no parallel
Admin-booking entity, assisted-membership state, or first-class change
workflow. Direct Course Assignment administration remains available and uses
the same membership semantics.

## Require Focused Admin User And Admin Invite Views

Admin Users and Admin Invites each need a data-table list view because their
accepted states and actions must be administrable. Specifying the required
information and operations preserves the product behavior without selecting a
component library, pagination model, API, persistence schema, or Invite-secret
representation.

## Exclude Workflow-Heavy Booking Features

Capacity, waiting lists, approvals, per-Module Group availability, and
recurring scheduling are deliberately excluded. Each would introduce new
states, relationships, or conflict rules beyond the initial product need.

## Separate Current Booking From Adjacent Concerns

Module Selection records booking intent, not proof of attendance. Its live or
historical meaning is derived from surrounding state, allowing cancellation to
retain the Selection without inventing a cancelled-booking workflow. Complete
audit history, actual attendance, and notifications remain separate concerns.
