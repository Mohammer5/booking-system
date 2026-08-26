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
  and unresolved product details.
- Read when: You need to know what product truth is accepted, implemented, or
  still unspecified.
- Tags: product, status, current-state, gaps

### Product Decisions
- Path: `docs/product/_decisions.md`
- Summary: Rationale for the booking model's central simplicity boundaries.
- Read when: You need to understand why membership, participation, Groups,
  invites, history, and excluded workflows are modeled separately.
- Tags: product, decisions, simplicity, rationale

### Domain Model
- Path: `docs/product/domain-model.md`
- Summary: Canonical vocabulary, conceptual relationships, hard invariants,
  identity rules, valid empty states, and minimal lifecycles.
- Read when: A task depends on domain terms, cross-concept validity, identity,
  cardinality, or state definitions.
- Tags: product, domain, invariants, identity, lifecycle

### Course Access
- Path: `docs/product/course-access.md`
- Summary: Authentication, Course Assignments, shared Course Invites,
  revocation, permissions, and visibility.
- Read when: A task affects identity, joining, assignment, membership,
  revocation, authorization, or Course information access.
- Tags: product, access, authentication, assignment, invite, permissions

### Course Structure And Lifecycle
- Path: `docs/product/course-structure.md`
- Summary: Course containment, timezones, Group semantics, Module scheduling,
  editing, deletion, cancellation, and archival behavior.
- Read when: A task affects Courses, Groups, Modules, scheduling, names,
  deletion, cancellation, archival, or historical references.
- Tags: product, course, group, module, scheduling, lifecycle

### Module Participation
- Path: `docs/product/module-participation.md`
- Summary: Participant-controlled Module Selection creation, replacement,
  revocation, deadlines, concurrency, and current-state meaning.
- Read when: A task affects booking eligibility, selected Groups, participant
  changes, start-time locking, concurrency, or attendance meaning.
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
