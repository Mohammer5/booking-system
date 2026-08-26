# Explicit Non-Goals

The following concerns are excluded from the initial product to preserve
conceptual and behavioral simplicity. They MAY be reconsidered only when a
concrete requirement emerges; their exclusion MUST NOT be interpreted as an
implicit future design.

## Invitations And Accounts

- person-specific invitations;
- email-specific invitation claiming;
- pending or unregistered Participant records;
- pre-created Course Assignments for unknown users;
- automatic Course Invite expiration;
- multiple concurrently active, independently managed Course Invites;
- automatic account merging;
- complex account-linking behavior; and
- Participant self-service departure from a Course.

## Module And Group Modeling

- recurring Modules;
- Group capacity;
- waiting lists;
- overbooking logic;
- per-Module Group availability;
- Module-specific Group logistical properties;
- Module-specific meeting links tied to a Group;
- moving Groups between Courses; and
- moving Modules between Courses.

## Booking Workflows

- approval workflows;
- pending booking requests;
- an explicit declined RSVP state;
- a distinction between unanswered and declined;
- configurable booking deadlines other than Module start;
- automatic Group assignment;
- default or preferred Groups;
- automatic reuse of a Participant's previous Group;
- automatic restoration of future Module Selections after Course Assignment
  reactivation;
- Admin-created Module Selections on behalf of Participants;
- complete booking change or audit history as part of the booking model; and
- complex Course lifecycle or status workflows.

## Adjacent Product Concerns

- automatic scheduling-conflict prevention;
- attendance or check-in;
- certification based on attendance;
- Participant-visible Course rosters;
- Participant-visible choices made by other Participants; and
- notifications as part of booking correctness.

## Implementation And Technology

- implementation architecture;
- database design;
- API design;
- frontend design;
- infrastructure; and
- technology or framework selection.
