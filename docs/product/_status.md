# Product Status

The booking-system product specification is accepted repository truth. It
defines the complete initial domain scope for Courses, Groups, Modules,
Participants, Course Assignments, Module Selections, Course Invites, and Admin
capabilities.

This product area contains specifications only. The repository has no product
implementation or application workspace. Accepted technology, persistence,
API, frontend, and infrastructure direction remains outside the product
specification and does not alter its implementation-agnostic behavior.

## Deliberately Unspecified Details

The accepted requirements do not define:

- whether or how an existing Course's timezone may change after Modules exist;
- a more precise test for whether Course history is "meaningful" beyond the
  explicit protections for historical Module Selections;
- whether an existing Revoked Course Assignment may be reactivated while its
  Course is Archived; or
- whether Course names are non-sensitive and may therefore appear before an
  invite recipient authenticates and joins.

No product behavior for these details should be inferred. A concrete future
requirement must resolve them before an implementation depends on them.
