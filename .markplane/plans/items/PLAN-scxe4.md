---
id: PLAN-scxe4
title: Implementation plan for Delete unreferenced Groups
status: done
implements:
- TASK-vyj7r
related: []
created: 2026-08-28
updated: 2026-08-29
---

# Unreferenced Group Deletion Implementation Plan

## Overview

Complete the existing `course-structure` Group responsibility with one hard-
deletion action for Active or Archived Groups in an Active Course. The only
reference decision is whether a Module Selection row currently references the
Group. Every retained Selection blocks regardless of Module state or time;
removed or replaced pre-start values leave no row and therefore do not block.

The booking domain will perform a visible current-reference precheck. One D1
`delete` statement will recheck the current Active Admin/Course, same-Course
Group existence, and absence of any Selection, while the existing restrictive
Selection foreign key remains the final integrity guard. No audit table,
cascade, lifecycle rewrite, or migration is required.

The stable Admin Group card will add a separate destructive action and German
confirmation Dialog. Deletion success belongs to the parent Group section so
the notification remains present and focusable after the deleted card unmounts.
Participant Course detail caches are invalidated because an unreferenced Active
Group disappears from future choice lists.

## Ground Truth

- `.markplane/backlog/items/TASK-vyj7r.md` — exact deletion eligibility,
  retained-reference matrix, non-cascade, stale-state, UI, evidence, and
  non-goal boundaries.
- `docs/product/course-structure.md#hard-deletion` — Active-Course-only Group
  deletion and the any-currently-retained-Selection blocker.
- `docs/product/domain-model.md#time-and-lifecycle` — a Group or Module is
  deletable only without a current Selection reference.
- `docs/product/representative-scenarios.md#u-group-deletion` — removed past
  values do not block while retained history does.
- `docs/product/module-participation.md#history-attendance-and-notifications` —
  no complete change log is required for removed or replaced values.
- `apps/booking-system-web/migrations/0003_groups_and_modules.sql` — stable
  same-Course Group ownership and Active/Archived state.
- `apps/booking-system-web/migrations/0006_module_selections.sql` — restrictive
  same-Course Group foreign key and no deletion cascade.
- `packages/booking/src/course-structure/createArchiveGroup.js` — focused Group
  operation, server-loaded reference context, and persistence-outcome pattern.
- `apps/booking-system-web/src/worker/course-structure/createGroupLifecyclePersistence.js`
  — authoritative Active Admin/Course/Group/reference classification patterns.
- `apps/booking-system-web/src/worker/course-structure/createGroupManagementHttp.js`
  and `courseHttpContract.js` — exact same-Course Group lookup, narrow outcome
  mapping, current-state re-resolution, and existing stable item path.
- `apps/booking-system-web/src/browser/course-structure/GroupManagementCard.jsx`,
  `GroupLifecycleDialog.jsx`, `useGroupManagement.js`, and `useCourses.js` —
  stable Group-card ownership, mutation reconciliation, German Dialog focus,
  and result patterns.
- `apps/booking-system-web/test/e2e/groupLifecycle.spec.js` and
  `moduleSelection.spec.js` — real Group card, Participant Selection removal,
  refresh, focus, responsive, and axe patterns.
- `docs/architecture/persistence.md`, `docs/architecture/applications.md`,
  `docs/architecture/browser-conventions.md`, and
  `docs/process/verification.md` — D1 safety, same-origin resource, stable-
  detail interaction, and layered evidence ownership.

No relevant adjacent `*.docs.md` file exists for the concrete source,
configuration, migration, and test files inspected for this plan.

## Approach

1. Add one focused booking-domain deletion operation:
   - accept only a current Active Admin, Active Course, and same-Course Active
     or Archived Group;
   - accept the narrow server-loaded current Selection contexts;
   - refuse `group-deletion-blocked` when that array contains any item,
     without consulting Module state, time, liveness, or past-reference data;
   - pass only Admin/Course/Group identity to guarded persistence; and
   - return `{ outcome: "deleted", group }` only after authoritative success,
     otherwise propagate the exact persistence refusal.
2. Extend Group persistence without a migration:
   - add a focused deletion persistence capability rather than overgrowing the
     existing lifecycle implementation;
   - execute one `delete from groups` guarded by current Active Admin, current
     Active parent Course, exact same-Course Group, and `not exists` for every
     `module_selections` row with that Course/Group identity;
   - classify missing Group, stale Admin/Course, any retained Selection, and an
     otherwise failed delete into language-neutral outcomes;
   - let the existing restrictive foreign key reject a concurrent Selection
     whose insert loses after deletion; and
   - never mutate Course, Module, Participant, Assignment, Invite, Selection,
     unrelated Group, or permanent Course scheduling history.
3. Reuse the existing nested Group HTTP item:
   - add `DELETE /api/admin/courses/:courseId/groups/:groupId` alongside `PUT`;
   - accept no request body and derive Admin, Course, Group, ownership, and
     current Selection references server-side;
   - return `200 { outcome: "deleted", group }` for the narrow successful
     identity, `404` for unknown/mismatched Course or Group, `409` for retained
     reference or stale current state, exact actor `403`, and sanitized `500`;
   - expose no Participant, Module, Selection, count, or private reference
     detail in a blocker response; and
   - keep the stable Admin Course detail as the only browser route.
4. Add stable-detail deletion interaction:
   - keep the existing state lifecycle action and add a distinct destructive
     Delete control to every Active or Archived Group card;
   - use a focused MUI Dialog naming the Group, stating permanence, and warning
     that any retained participation reference blocks deletion;
   - focus Cancel when opened, trap Dialog focus, restore Delete focus on
     cancellation, and focus blocker/stale/technical results in the Dialog;
   - after success, remove the card through authoritative query refresh and
     focus a parent-section success notification naming the deleted Group;
   - invalidate both Admin and Participant Course detail caches so future
     Active choices are current; and
   - retain desktop/360px layout, keyboard operation, non-color-only meaning,
     direct refresh, and axe-clean semantics.
5. Keep evidence and scope exact:
   - domain tests cover Active/Archived deletion, every retained Module state/
     time shape blocking identically, and an empty current-reference array
     after removal/replacement allowing deletion;
   - Worker/D1 tests use real rows for the complete matrix, foreign-key
     protection, one-winner delete/Selection races, stale actor/Course state,
     failed-delete rollback, and non-cascade state preservation;
   - HTTP tests prove authorization, privacy, cross-Course identity, stale
     reference insertion, and sanitization;
   - Playwright uses a real Selection then real pre-start removal for allowed
     deletion, and bounded blocker responses for named historical/Cancelled
     Group cards because no current public API can create past/cancelled Module
     fixtures; the real blocker matrix remains Worker-owned; and
   - canonical status, application/HTTP, persistence, package/module/browser/
     boundary, verification, dictionary, and index docs update after evidence.

## Non-Goals / Out Of Scope

- Group archival/reactivation semantics already delivered by `TASK-kmm36`.
- Module deletion (`TASK-3zcmt`) or any Module edit/cancellation behavior.
- Course hard deletion, Course archival, or Archived-Course structure changes.
- Selection removal as a deletion side effect, cascading deletes, soft-delete
  tombstones, undo, revision/audit history, or a past-reference ledger.
- A migration, new browser route, test-only endpoint, package, first-level
  module, dependency, boundary permission, or architecture checker.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Block on any current Selection row | Product deletion ignores liveness, time, and Module state while protecting all retained relationships. |
| Reuse `DELETE` on the Group item path | Deletion targets the stable Group resource and needs no action subresource or input body. |
| Guard once in SQL plus restrictive FK | The accepting statement owns stale reference truth and the existing constraint protects the opposite concurrent winner. |
| Keep deletion separate from reversible lifecycle state | Hard deletion removes identity permanently and has different UI/result ownership from archive/reactivate. |
| Render success at the parent Group section | The deleted card unmounts after authoritative refresh, so card-local feedback would disappear. |
| Bound only historical/Cancelled browser blockers | Worker/D1 proves real reference semantics without inventing a test-only past/cancellation API. |

## Phases

### Phase 1: Domain Policy And Guarded Persistence

- [x] Add the delete factory, exports, and domain retained-reference matrix.
- [x] Add guarded D1 delete and exact current-state/reference classification.
- [x] Prove Active/Archived success, every retained blocker, no past-reference
      rule, foreign-key concurrency, rollback, and complete non-cascade state.

**Checkpoint**: Only one unreferenced Group row can disappear, and any current
Selection or stale actor/Course state wins without partial mutation.

### Phase 2: HTTP Contract And Privacy

- [x] Add DELETE dispatch on the existing same-Course Group item resource.
- [x] Cover auth, cross-Course/not-found, Active/Archived, blocker privacy,
      stale reference/actor/Course state, malformed trust, and technical error.
- [x] Prove narrow success and unchanged related/unrelated representations.

**Checkpoint**: The API derives every decision server-side and reveals no
Participant or retained-reference detail.

### Phase 3: German Destructive Interaction

- [x] Add the deletion mutation, focused Dialog, and parent-section success.
- [x] Cover cancel restoration, blocker/error/result focus, current cache
      refresh, responsive layout, non-color meaning, and keyboard operation.
- [x] Add real removal-then-delete plus bounded historical/Cancelled blocker
      Playwright journeys, direct refresh, and axe scans.

**Checkpoint**: Admins can distinguish permanent deletion from archival and
understand a safe private blocker without losing focus or stale choice state.

### Phase 4: Documentation, Verification, And Completion

- [x] Update affected canonical docs, dictionary coverage, and index routing.
- [x] Run focused domain, Worker/D1, HTTP, and Playwright suites plus final
      `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-vyj7r`.

**Checkpoint**: Product behavior, implementation, evidence, documentation,
tracking, and commit history all express the same narrow deletion rule.

## Testing Strategy

- Booking-domain Vitest owns eligible states, any-retained-reference blocking,
  absence of a past-reference rule, same-Course identity, and persistence
  refusal propagation.
- Worker/D1 Vitest owns guarded deletion, restrictive FK behavior, complete
  reference matrix, concurrency, current authorization/Course state, rollback,
  and preservation of all related/unrelated rows and Course history.
- Worker HTTP integration owns exact method/path, auth, privacy, narrow status/
  body mapping, stale reference races, and production composition.
- Playwright owns German permanence/blocker presentation, real allowed deletion
  after removal, bounded historical/Cancelled blockers, refresh, responsive
  layout, keyboard/Dialog/result focus, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced. A Group
deleted while the feature is in use cannot be recreated with the same identity,
which is the explicitly confirmed product meaning of hard deletion.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan stays focused on one Group deletion task

## References

- `TASK-vyj7r`
- `docs/product/course-structure.md`
- `docs/product/domain-model.md`
- `docs/product/module-participation.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/process/verification.md`

## Implementation Evidence

- The domain matrix proves 14 deletion-policy cases, including Active and
  Archived success, all retained timing/state blockers, no past-reference
  lookup, invalid ownership/state, and persistence refusal propagation.
- Real D1 and Worker HTTP evidence covers guarded/non-cascading deletion,
  restrictive foreign keys, concurrent Selection creation, rollback, current
  authorization/Course state, privacy, cross-Course identity, and sanitization.
- Playwright proves real Selection removal followed by deletion, keyboard
  confirmation/cancellation, parent success focus, direct refresh, bounded
  historical/Cancelled blockers, mobile/desktop layout, and axe scans.
- Full `pnpm check` passed on 2026-08-29 with 286 domain, 217 Worker/D1, and 38
  Chromium tests plus lint, boundary enforcement, and production builds.
