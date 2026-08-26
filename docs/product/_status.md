# Product Status

The booking-system product specification is accepted repository truth. It
defines the accepted initial domain scope for Courses, Groups, Modules,
Participants, Course Assignments, Module Selections, Course Invites, and Admin
capabilities while identifying the remaining policy questions below.

This product area contains specifications only. The repository has no product
implementation or application workspace. Accepted technology, persistence,
API, frontend, and infrastructure direction remains outside the product
specification and does not alter its implementation-agnostic behavior.

## Deliberately Unspecified Details

The accepted requirements do not define:

- whether a Course may be Archived while a Scheduled Module is between its
  `startsAt` and `endsAt`;
- whether an Admin may add, change, or remove a Module Selection at or after
  `startsAt`;
- whether Admin-assisted booking requires the user to already have an Active
  Course Assignment;
- whether an Admin add operation replaces an existing Selection for another
  Group in the same Module or is refused;
- whether an Admin may explicitly change an existing Selection to another
  Group as a first-class action;
- whether booking-system users, including users with Course or Module history,
  may be hard-deleted;
- if user deletion is allowed, what happens to historical Course Assignments
  and Module Selections;
- whether the last remaining Admin may remove their own Admin capability; or
- whether another Admin may demote the last remaining Admin.

No product behavior for these details should be inferred. A concrete future
requirement must resolve them before an implementation depends on them.
