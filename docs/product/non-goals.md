# Explicit V1 Non-Goals

The following concerns are accepted omissions from the first-release product
contract. They are out of scope rather than unresolved behavior and may be
reconsidered only through a concrete future requirement.

## Identity, Participant, And Admin Lifecycle

- Participant hard deletion;
- Participant self-disable or self-Re-enable;
- Participant self-service departure from a Course;
- automatic account or domain-identity merging;
- product-level matching of real-world humans across different external
  authentication principals;
- current Participant external-principal linking;
- current Admin User external-principal linking;
- identity transfer, recovery, or account merge workflows;
- provider-specific account-linking behavior as booking-domain policy;
- complete Participant profile or lifecycle change audit history;
- complete Admin User mutation audit history;
- Super Admin demotion;
- a dedicated Super Admin transfer or succession workflow; and
- a password-based local identity system.

Explicit Super Admin promotion and multiple Super Admins are supported and are
therefore not non-goals.

## Invitations And Accounts

- person-specific or email-specific Course Invites and Admin Invites;
- pending or unregistered Participant records created by a Course Invite;
- pending Admin User records created merely by an Admin Invite;
- pre-created Course Assignments for unknown people;
- automatic Course Invite or Admin Invite expiration;
- multiple concurrently active, independently managed Course Invites for one
  Course;
- reuse or reactivation of Claimed or Revoked Admin Invites;
- Admin Invite deletion; and
- recoverability of the complete Admin Invite URL after creation.

## Module And Group Modeling

- recurring Modules;
- Group capacity, waiting lists, or overbooking logic;
- per-Module Group availability;
- structured Group room, location, URL, meeting-provider,
  physical/remote/hybrid, or access-instruction subobjects;
- Module-specific Group logistical properties;
- moving Groups between Courses; and
- moving Modules between Courses.

## Booking Workflows And History

- approval or pending-booking workflows;
- an explicit declined RSVP state or unanswered/declined distinction;
- configurable booking deadlines other than Module `startsAt`;
- automatic, default, preferred, or previously used Group assignment;
- automatic restoration of future Selections after Assignment reactivation or
  Participant Re-enable;
- assisted, temporary, booking-created, or Admin-assigned membership states;
- a parallel Admin booking entity or Admin-specific Selection state;
- Admin-only late-booking or lifecycle overrides;
- a workflow-heavy booking-change state machine;
- complete booking change or audit history; and
- a general stale-state merge or user-facing conflict-resolution workflow.

## Adjacent Product Concerns

- automatic scheduling-conflict prevention;
- attendance, check-in, or attendance-based certification;
- Participant-visible Course rosters, profiles, email addresses, choices, or
  Group counts for other Participants;
- notifications as part of booking correctness;
- email delivery or Participant email verification as part of booking
  correctness.

Technical or operational logging may exist separately, but it is not a
product-facing history model.

## Implementation And Technology

- implementation architecture;
- database design;
- API design;
- frontend design;
- authentication-vendor, provider-linking, or session design;
- invite-token, secret-storage, or URL-format design;
- infrastructure; and
- technology or framework selection.
