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
Admin may reactivate the assignment.

## Exclude Workflow-Heavy Booking Features

Capacity, waiting lists, approvals, per-Module Group availability, and
recurring scheduling are deliberately excluded. Each would introduce new
states, relationships, or conflict rules beyond the initial product need.

## Separate Current Booking From Adjacent Concerns

Module Selection is authoritative current booking intent, not proof of
attendance. Complete audit history, actual attendance, and notifications are
separate concerns and are not required for booking correctness.
