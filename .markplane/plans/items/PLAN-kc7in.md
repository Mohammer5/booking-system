---
id: PLAN-kc7in
title: Implement Admin-assisted Module Selections
status: done
implements:
- TASK-2nh3b
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Implement Admin-assisted Module Selections Implementation Plan

## Overview

Add Admin-assisted set/remove operations to the ordinary Module Selection
model. A set composes Assignment creation/reactivation and Selection upsert as
one D1 batch whose statements share the same current-state guards. Removal is a
separate guarded delete and never writes membership. Extend the existing
administrative participation slice with a Participant-target detail read so an
Admin can open an Active Participant who has no Assignment, then expose the
operations through the German MUI participation view.

## Ground Truth

- `.instructions/instructions-00015.md` — selects `TASK-2nh3b` after
  `TASK-49if4` and requires completion in that order.
- `.markplane/backlog/items/TASK-2nh3b.md` — exact acceptance, UI, evidence,
  and out-of-scope requirements.
- `docs/product/module-participation.md` — ordinary Selection meaning, shared
  strict pre-start deadline, Admin set/remove policy, and coherent refusal.
- `docs/product/course-access.md` — the three Assignment outcomes composed by
  Admin-assisted set and the prohibition on membership mutation during remove.
- `docs/product/representative-scenarios.md` — the no-Assignment success and
  stale-current-state examples.
- `packages/booking/src/module-participation/` — existing Participant policy,
  operation factories, availability, and presentation patterns.
- `apps/booking-system-web/src/worker/module-participation/` — existing guarded
  D1 Selection statements and Participant HTTP contract/handler conventions.
- `apps/booking-system-web/src/worker/course-access/createAdministrativeParticipationPersistence.js`
  — current Admin-guarded normalized read model.
- `apps/booking-system-web/src/browser/course-access/` — current Admin
  participation routes, MUI states, query hooks, and dialog focus patterns.
- `docs/process/verification.md` — layer ownership and uninterrupted `pnpm
  check` gate.

## Approach

- Add pure Admin-assisted domain operations that validate Active actor/target,
  Active Course, same-Course Scheduled Module, strict `now < startsAt`, and an
  Active same-Course Group for set. The set operation supplies stable candidate
  IDs for missing Assignment/Selection rows; existing rows retain identity.
- Extend the existing Module Selection persistence capability with Admin set
  and remove methods. Admin set executes Assignment insert/reactivation and
  Selection upsert in one D1 batch. Both SQL statements independently repeat
  all final authoritative guards so a zero-change guard or statement failure
  cannot leave membership behind. Classify a zero-change batch from a fresh
  read before returning an idempotent result.
- Admin removal performs only one current-state-guarded Selection delete. A
  valid absent Selection is idempotent; invalid lifecycle/actor/target state is
  a refusal even when no row exists.
- Add an Admin-target participation detail read guarded on every D1 statement.
  It returns an existing fully registered Participant with nullable Assignment,
  their retained Selections, Course structure, and server-derived per-Module
  Admin mutation availability. Keep the overview normalized and Course-scoped.
- Add narrow Admin `GET`, `PUT`, and `DELETE` routes. The handler resolves the
  current Admin, derives trusted entities from persistence, calls the pure
  operation, and maps domain/current-state refusals to language-neutral
  no-store responses. No body field can override Participant, Course, Module,
  time, Assignment, or Selection identity.
- Add an overview Participant picker backed by the existing private Admin
  directory, plus a detail-page Group control and removal confirmation. The UI
  explains the exact Assignment consequence, distinguishes membership from
  participation, renders Disabled/lifecycle locks, and manages initial,
  refusal, success, cancellation, and opener focus.
- Update canonical product/verification docs and only update adjacent docs if
  an existing `*.docs.md` is affected. No new adjacent docs are created.

## Non-Goals / Out of Scope

- No parallel Admin booking entity, Assignment origin, Participant creation,
  late-booking override, capacity, approval, conflict warning, attendance,
  notification, or complete audit history.
- No database migration: existing Assignment and Selection uniqueness and
  ownership constraints already model the result.
- No architecture boundary change or separate enforcement surface.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Compose set in one D1 batch | D1 batch failure is atomic, while identical guards on both statements prevent a partial accepted state. |
| Keep removal independent of Assignment state | The specification says remove never creates/reactivates membership and only names actor, target, Course, Module, and deadline eligibility. |
| Add a Participant-target detail read | The overview is Assignment-derived, but assisted set must reach Active Participants with no Assignment without exposing the whole global directory in Course data. |
| Derive availability on the server | The browser must not decide authorization or deadline truth; persistence still revalidates at mutation time. |
| Reuse ordinary Assignment and Selection rows | This preserves canonical identity, uniqueness, meaning, and downstream Participant access behavior. |

## Phases

### Phase 1: Domain Contract

- [x] Add Admin set/remove eligibility and operation factories.
- [x] Export domain operations and server presentation availability.
- [x] Add focused Vitest coverage for all lifecycle/deadline/ownership,
  composition, identity, idempotence, replacement/removal, and overlap cases.

**Checkpoint**: Domain tests prove the complete operation contract without D1
or HTTP.

### Phase 2: D1 And HTTP Composition

- [x] Add atomic guarded set and guarded membership-free remove persistence.
- [x] Add target detail persistence and normalized response contract.
- [x] Add/admin-wire read and mutation handlers in production composition.
- [x] Add Worker/D1 tests for exact outcomes, rollback, current-state guards,
  failure injection, uniqueness, and representative concurrency races.

**Checkpoint**: Real D1 and HTTP tests prove no refusal can leave a new or
reactivated Assignment or changed Selection.

### Phase 3: German Admin Experience

- [x] Add query/mutation hooks and precise invalidation.
- [x] Add accessible Active-Participant navigation from the overview.
- [x] Render nullable Assignment, eligible Groups, Assignment consequence,
  mutation states, and removal confirmation on stable detail routes.
- [x] Add Playwright journeys and bounded refusal state evidence at desktop and
  360px, including refresh, keyboard/focus, privacy, and axe.

**Checkpoint**: A keyboard user can discover an existing Active Participant,
set/replace/remove a Selection, understand membership consequences, and see
authoritative refusal states without a misleading override.

### Phase 4: Repository Truth And Gate

- [x] Update module participation, course access/scenarios if needed, and the
  verification ownership section; review dictionary and architecture impact.
- [x] Complete task/plan tracking, sync, and check Markplane.
- [x] Run one uninterrupted `pnpm check`, then create one semantic task commit.

**Checkpoint**: Canonical docs, tracking, implementation, evidence, and commit
all describe the same completed behavior.

## Testing Strategy

- Booking Vitest: actor/target, lifecycle, ownership, exact deadline, missing/
  Active/Revoked Assignment, missing/same/other Selection, remove, stable IDs,
  persistence refusal, and overlapping Modules.
- Worker/D1 Vitest: real migration schema; atomic batch success/rollback;
  current Admin/Participant/Course/Module/Group guards; no partial effects;
  idempotence, unique pair, injected failure, and set/remove/lifecycle races;
  exact private no-store HTTP contracts and production routing.
- Playwright: real no/Active/Revoked membership set, repeat/replace/remove,
  refresh, Disabled and structural/deadline refusals, no-partial evidence,
  desktop/360px, direct routes, keyboard/Dialog/result focus, overflow, privacy,
  and axe scans.
- Finish with the repository's uninterrupted `pnpm check`.

## Rollback Plan

Revert the single task commit. No schema migration or persisted model variant
is introduced; existing ordinary Assignments and Selections remain valid.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `TASK-2nh3b`
- `TASK-49if4`
