# Product Status

The booking-system product specification is accepted repository truth. It
defines the accepted initial domain scope for Courses, Groups, Modules,
Participants, Course Assignments, Module Selections, Course Invites, Admin
Users, Super Admin authority, and Admin Invites while identifying the remaining
policy questions below. Participant and Admin User are separate domain
identities, and ordinary Admin User deletion is accepted under the documented
authorization rules.

This product area contains specifications only. The repository has no product
implementation or application workspace. Accepted technology, persistence,
API, frontend, and infrastructure direction remains outside the product
specification and does not alter its implementation-agnostic behavior.

## Deliberately Unspecified Details

The accepted requirements do not define:

- whether a Course may be Archived while a Scheduled Module is between its
  `startsAt` and `endsAt`;
- whether an Admin User may add, change, or remove a Module Selection at or
  after `startsAt`;
- whether Admin-assisted booking requires the Participant to already have an
  Active Course Assignment;
- whether an Admin User add operation replaces an existing Selection for
  another Group in the same Module or is refused;
- whether an Admin User may explicitly change an existing Selection to another
  Group as a first-class action;
- whether Participants, including Participants with Course or Module history,
  may be hard-deleted and what happens to their historical Course Assignments
  and Module Selections;
- whether the Super Admin may hard-delete themselves;
- any Super Admin promotion, transfer, replacement, or additional Super Admin
  workflow;
- whether a deleted Admin User may later be recreated through a new Admin
  Invite using the same external authentication identity;
- what happens when an external authentication identity already associated
  with an Admin User attempts to claim another Admin Invite;
- complete audit/history requirements for Admin User mutations; or
- any current Admin User external-identity linking workflow.

No product behavior for these details should be inferred. A concrete future
requirement must resolve them before an implementation depends on them.
