# Product Status

The booking-system product specification is accepted repository truth. It
defines the complete initial domain scope for Courses, Groups, Modules,
Participants, Course Assignments, Module Selections, Course Invites, and Admin
capabilities.

The repository currently contains product specifications only. It has no
product implementation, application workspace, technology selection, database
design, API design, frontend design, or infrastructure design.

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
