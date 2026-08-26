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
- Summary: Current specification state, intentionally absent implementation,
  and the remaining archival, Admin-assisted-booking, Participant-deletion,
  and Admin User policy questions.
- Read when: You need to know what product truth is accepted, implemented, or
  still unspecified.
- Tags: product, status, current-state, gaps

### Product Decisions
- Path: `docs/product/_decisions.md`
- Summary: Rationale for separate Participant/Admin User identity, Admin
  onboarding and authorization, and the booking model's access, scheduling,
  lifecycle, participation, and simplicity boundaries.
- Read when: You need rationale for identity, membership, visibility,
  Admin bootstrap and invitations, scheduling, Course archival, participation
  history, or excluded workflows.
- Tags: product, decisions, identity, admin, invitations, scheduling,
  lifecycle, simplicity, rationale

### Domain Model
- Path: `docs/product/domain-model.md`
- Summary: Canonical vocabulary, conceptual relationships, hard invariants,
  identity rules, valid empty states, and minimal lifecycles.
- Read when: A task depends on domain terms, cross-concept validity, identity,
  cardinality, or state definitions.
- Tags: product, domain, invariants, identity, lifecycle

### Admin Access
- Path: `docs/product/admin-access.md`
- Summary: Admin User identity and lifecycle, Super Admin authorization, first
  Admin bootstrap, Admin Invites, onboarding, and required administration
  views.
- Read when: A task affects Admin User authentication or identity, Super Admin
  authority, Admin User mutation or deletion, Admin bootstrap, Admin Invites,
  Admin onboarding, or Admin User/Invite administration views.
- Tags: product, admin, identity, authorization, onboarding, invite, ui

### Course Access
- Path: `docs/product/course-access.md`
- Summary: Participant authentication identity as relevant to Course access,
  Course Assignments, shared Course Invites, permissions, and visibility.
- Read when: A task affects Participant Course access, joining, assignment,
  membership, revocation, Course authorization, or Course information access.
- Tags: product, access, participant, assignment, course-invite, permissions

### Course Structure And Lifecycle
- Path: `docs/product/course-structure.md`
- Summary: Course containment, timezones, Group semantics, Module scheduling,
  editing, Group/Module deletion, cancellation, and permanent Course archival.
- Read when: A task affects Courses, Groups, Modules, scheduling, names,
  deletion, cancellation, archival, or historical references.
- Tags: product, course, group, module, scheduling, lifecycle

### Module Participation
- Path: `docs/product/module-participation.md`
- Summary: Participant and Admin-assisted Module Selection actions, Participant
  deadlines, concurrency, and live-versus-historical meaning.
- Read when: A task affects booking eligibility, selected Groups, Participant or
  Admin-assisted changes, `startsAt` locking, concurrency, or attendance
  meaning.
- Tags: product, booking, participation, selection, concurrency

### Non-Goals
- Path: `docs/product/non-goals.md`
- Summary: Explicitly excluded product and implementation concerns that keep
  the initial booking domain small.
- Read when: A proposal might add invitation variants, booking workflows,
  capacities, recurrence, attendance, notifications, or technology choices.
- Tags: product, scope, non-goals, simplicity

### Representative Scenarios
- Path: `docs/product/representative-scenarios.md`
- Summary: Concise examples showing how membership, invitations, selections,
  timing, lifecycle, and overlap rules compose.
- Read when: You need examples of expected behavior across several product
  responsibilities.
- Tags: product, scenarios, examples, behavior
