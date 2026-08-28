# Product

Product docs define the accepted, implementation-agnostic booking-system
domain and behavior.

## Documents

### Product Overview
- Path: `docs/product/README.md`
- Summary: Human entrypoint for the booking-system product area and the mental
  model that composes its responsibilities.
- Read when: You need to understand the product goal or how the focused product
  specifications fit together.
- Tags: product, overview, booking, mental-model

### Product Status
- Path: `docs/product/_status.md`
- Summary: Closed first-release product-contract state, explicit v1 scope
  boundaries, implemented Admin-bootstrap, Course/Group/future-Module creation,
  Participant onboarding, Course Assignment creation/lifecycle, and assigned
  Active-Course access plus Participant profile/lifecycle maintenance and
  Module Selection subsets, and the remaining product implementation gap.
- Read when: You need to distinguish accepted first-release behavior and
  non-goals from implementation state.
- Tags: product, status, current-state, v1, implementation

### Product Decisions
- Path: `docs/product/_decisions.md`
- Summary: Rationale for Participant and Admin identity/profile policy,
  authorization, invitations, data contracts, scheduling, archival, retained
  history, and authoritative-current-state rules.
- Read when: You need rationale for identity, onboarding, membership,
  visibility, Super Admin authority, invitations, scheduling, lifecycle,
  participation history, stale actions, or excluded workflows.
- Tags: product, decisions, identity, admin, invitations, scheduling,
  lifecycle, concurrency, simplicity, rationale

### Domain Model
- Path: `docs/product/domain-model.md`
- Summary: Canonical vocabulary, profile and identity rules, relationships,
  hard invariants, valid empty states, and minimal lifecycles.
- Read when: A task depends on domain terms, profile properties,
  cross-concept validity, identity, cardinality, state, or lifecycle
  definitions.
- Tags: product, domain, invariants, identity, profile, lifecycle

### Admin Access
- Path: `docs/product/admin-access.md`
- Summary: Admin User identity and lifecycle, multi-Super-Admin authorization
  and promotion, first Admin bootstrap, Admin Invites, onboarding, and required
  administration views.
- Read when: A task affects Admin User authentication or identity, Super Admin
  authority or promotion, Admin User mutation or deletion, Admin bootstrap,
  Admin Invites, Admin onboarding, or Admin User/Invite administration views.
- Tags: product, admin, identity, authorization, promotion, onboarding, invite,
  ui

### Course Access
- Path: `docs/product/course-access.md`
- Summary: Participant registration, profile and global access state, Course
  Assignments, shared Course Invites, administration, permissions, and
  visibility.
- Read when: A task affects Participant onboarding, profile, status,
  administration, Course access, joining, Assignment, membership, revocation,
  Course Invite visibility, or archived read-only access.
- Tags: product, access, participant, onboarding, profile, assignment,
  course-invite, permissions

### Course Structure And Lifecycle
- Path: `docs/product/course-structure.md`
- Summary: Minimal Course/Group/Module data, IANA timezone semantics, Group and
  Module lifecycle, retained-reference deletion, scheduling, cancellation, and
  structurally read-only Course archival.
- Read when: A task affects Courses, Groups, Modules, fields, timezones, DST,
  scheduling, names, deletion, cancellation, archival, or retained references.
- Tags: product, course, group, module, timezone, scheduling, lifecycle

### Module Participation
- Path: `docs/product/module-participation.md`
- Summary: Participant and Admin-assisted Module Selection actions, their
  shared modification deadline, lifecycle retention/removal, concurrency, and
  exact live-versus-historical meaning.
- Read when: A task affects booking eligibility, selected Groups, Participant or
  Admin-assisted changes, Participant Disable or Assignment revocation effects,
  `startsAt` locking, concurrency, or historical meaning.
- Tags: product, booking, participation, selection, history, concurrency

### Non-Goals
- Path: `docs/product/non-goals.md`
- Summary: Explicitly excluded product and implementation concerns that keep
  the initial booking domain small.
- Read when: A proposal might add identity merge/transfer, lifecycle or audit
  workflows, invitation variants, capacities, recurrence, attendance,
  notifications, or technology choices.
- Tags: product, scope, non-goals, simplicity

### Representative Scenarios
- Path: `docs/product/representative-scenarios.md`
- Summary: Concise examples showing how onboarding, identity, authority,
  membership, invitations, selections, timing, lifecycle, history, and stale
  actions compose.
- Read when: You need examples of expected behavior across several product
  responsibilities.
- Tags: product, scenarios, examples, behavior
