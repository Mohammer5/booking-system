---
id: PLAN-qeb8a
title: Implementation plan for Edit, archive, and reactivate Groups
status: done
implements:
- TASK-kmm36
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Group Editing And Reversible Lifecycle Implementation Plan

## Overview

Complete the existing `course-structure` Group responsibility without changing
the schema. Active and Archived Groups remain one retained identity. Complete
name/details editing is allowed in either state while the parent Course is
Active; Active-name comparison keeps the existing trimmed, case-insensitive
Course-local invariant.

Archival and reactivation will be explicit state-transition operations.
Archival receives an injected definite instant and refuses only a retained
Selection whose Module is Scheduled with `now < startsAt`. It never deletes or
rewrites a Selection. Reactivation preserves the row and re-establishes Active-
name uniqueness without reconstructing removed Selections.

The application will perform useful domain prechecks from server-loaded
Course Groups or narrow retained-Selection/Module contexts, then recheck every
actor, Course, Group, name, time, and reference predicate in the accepting D1
statement. This closes races with concurrent Selection creation/replacement,
Group edits/reactivation, and Course/Admin lifecycle changes.

Stable Admin Course detail will render each Group as Active or Archived with
an inline German edit form and explicit lifecycle Dialog. Participant Course
detail will continue listing only Active Groups for new choices while its
already-existing Selection join retains an Archived selected Group's identity,
details, state, and derived live/history meaning.

## Ground Truth

- `.markplane/backlog/items/TASK-kmm36.md` — exact fields, lifecycle, blocker,
  current-state, UI, evidence, and non-goal boundaries.
- `docs/product/course-structure.md#editing-and-active-name-uniqueness` and
  `#active-and-archived-lifecycle` — editability, normalized uniqueness,
  transition graph, exact blocker, retention, and Course-state rules.
- `docs/product/module-participation.md#exact-live-and-historical-meaning` — an
  Archived Group does not rewrite a retained Selection or determine its
  live/history meaning.
- `docs/product/domain-model.md#time-and-lifecycle` and
  `docs/product/representative-scenarios.md#s-group-archival-during-an-in-progress-module`
  — exact temporal matrix and selected-Group retention.
- `docs/product/representative-scenarios.md#t-group-reactivation-and-name-conflict`
  — retained identity, conflict, rename, and successful reactivation flow.
- `packages/booking/src/course-structure/createCreateGroup.js` — current field
  validation and stable normalized-name algorithm.
- `packages/booking/src/course-access/createDisableParticipant.js` and
  `createReenableParticipant.js` — focused lifecycle factory and retained-
  object result patterns.
- `apps/booking-system-web/migrations/0003_groups_and_modules.sql` — existing
  Active/Archived state, permanent ownership, and partial Active-name unique
  index; no migration is required.
- `apps/booking-system-web/migrations/0006_module_selections.sql` — restrictive
  retained Group references and same-Course Selection ownership.
- `apps/booking-system-web/src/worker/course-structure/createGroupPersistence.js`
  — current Group mapping, ordering, normalized uniqueness, and D1 owner.
- `apps/booking-system-web/src/worker/module-participation/createModuleSelectionPersistence.js`
  — guarded Selection acceptance that already requires a current Active Group.
- `apps/booking-system-web/src/worker/course-access/createParticipantCoursePersistence.js`
  — Active Group list plus separate selected-Group join that already retains
  Archived Group fields for Participant presentation.
- `apps/booking-system-web/src/worker/course-structure/createCourseHttpHandler.js`
  and `courseHttpContract.js` — fresh Admin authorization, nested resource
  matching, current-state re-resolution, response narrowing, and sanitization.
- `apps/booking-system-web/src/browser/course-structure/GroupCreationSection.jsx`
  and `useCourses.js` — stable detail Group ownership, React Hook Form,
  TanStack reconciliation, localized outcomes, and predictable focus.
- `apps/booking-system-web/src/browser/course-access/CourseAssignmentLifecycleDialog.jsx`
  — existing responsive MUI lifecycle Dialog and focus-restoration pattern.
- `apps/booking-system-web/test/e2e/courseStructure.spec.js` and
  `moduleSelection.spec.js` — real Admin/Participant journeys, fixed fixture
  sessions, scoped cards, refresh, responsive layout, focus, and axe patterns.
- `docs/architecture/persistence.md`, `docs/architecture/applications.md`, and
  `docs/process/verification.md` — persistence reuse, same-origin surface, and
  layer-specific evidence ownership.

No relevant adjacent `*.docs.md` file exists for the concrete source,
configuration, migration, and test files inspected for this plan.

## Approach

1. Add three focused booking-domain Group operations:
   - `createUpdateGroup` accepts current Active Admin, Active Course, same-
     Course Active/Archived Group, complete required name and optional
     string/null details, plus the server-loaded Course Group collection;
   - update derives `normalizedName` with the existing function, refuses an
     Active target whose desired normalized name belongs to another current
     Active Group, and preserves identity, Course ownership, state, and every
     relationship;
   - `createArchiveGroup` accepts current state, server-loaded retained
     Selection/Module contexts, and injected `now`; it refuses exactly a
     Scheduled context whose definite `startsAt` is later than `now`;
   - exact `startsAt`, in-progress, ended, and Cancelled contexts do not block;
   - `createReactivateGroup` preserves identity/details and refuses a current
     Active-name conflict without restoring any removed relationship; and
   - all factories propagate authoritative persistence refusals rather than
     manufacturing an accepted result.
2. Extend narrow Group persistence without a migration:
   - add a same-Course `findGroupById` and a minimal retained Selection/Module
     context read containing no Participant identity or profile;
   - update all editable Group fields in one guarded SQL statement while the
     Admin and Course remain Active and current target state determines whether
     Active-name uniqueness applies;
   - archive only the exact current Active Group when no retained Selection
     joins a Scheduled Module with `starts_at > nowEpoch`;
   - reactivate only the exact current Archived Group when no other Active
     same-Course Group has its normalized name;
   - use the existing partial unique index as the final concurrent-name arbiter
     and classify its conflict into one language-neutral outcome;
   - never delete or update `module_selections`; and
   - prove failed statements and injected trigger failures leave name, details,
     state, and every Selection unchanged.
3. Preserve both sides of concurrent acceptance:
   - existing Selection set/change SQL continues requiring `g.state =
     'active'`, so a Selection that loses to archival is refused;
   - archival's `not exists` retained-future guard means an archival that loses
     to Selection acceptance is refused;
   - concurrent Active edits/reactivations rely on guarded predicates plus the
     partial unique index so only one conflicting Active name wins; and
   - stale prechecks remain advisory while the accepting statement is
     authoritative.
4. Extend the existing nested Group HTTP resource:
   - add `PUT /api/admin/courses/:courseId/groups/:groupId` with complete
     `{ name, details }` fields;
   - add `POST .../groups/:groupId/archival` and
     `POST .../groups/:groupId/reactivation` action resources;
   - derive Admin, Course, Group, current Course Groups, exact instant, retained
     references, identity, ownership, and lifecycle server-side, ignoring
     browser trust fields;
   - return narrow updated Group on edit `200`, and narrow
     `{ outcome, group }` lifecycle successes on `200`;
   - map fields to `422`, name/reference/state conflicts to `409`, current
     Admin refusal to exact `403`, unknown/mismatched Group or Course to `404`,
     and technical exceptions to sanitized `500`; and
   - keep stable Course detail as the only browser route.
5. Add stable-detail Group management:
   - replace passive Group cards with slice-owned cards containing a lifecycle
     Chip, complete inline React Hook Form, and one current action;
   - keep Active and Archived Groups visible to Admins, with archived details
     editable before a reactivation retry;
   - use a confirmation Dialog for archival and reactivation, with accurate
     copy that archival removes future eligibility but never retained intent,
     and a specific blocker result when future retained intent exists;
   - associate edit/reactivation name conflicts with the Group name input,
     focus field/result/error feedback, trap Dialog focus, and restore the
     invoking action's focus on cancel;
   - invalidate Admin Course detail and Participant Course detail caches on
     success so future choices and retained selected-Group presentation are
     refreshed; and
   - preserve direct refresh, desktop/360px layout, keyboard operation,
     non-color-only state, and axe-clean semantics.
6. Keep verification and scope explicit:
   - use real Worker/D1 state for the blocker matrix, atomic races, retained
     Selection identity/details, and Participant HTTP response;
   - use real browser requests for edit, archive allowed/blocked, name conflict,
     rename, reactivation, refresh, and Admin retained details;
   - use one bounded Participant Course-detail browser response for an
     Archived selected Group in historical presentation, because the current
     public API cannot create an in-progress/ended fixture on demand and no
     test-only product endpoint should be introduced; and
   - update canonical status, application/HTTP, persistence, package/module/
     browser/boundary, verification, dictionary, and index docs after evidence
     is green.

## Non-Goals / Out Of Scope

- Group hard deletion (`TASK-vyj7r`).
- Module editing, rescheduling, cancellation, or deletion (`TASK-2u7z6`,
  `TASK-vwciv`, `TASK-3zcmt`).
- Course archival or Archived-Course access (`TASK-fzniz`).
- Per-Module Group availability, capacities, reservations, waiting lists, or
  structured location/access fields.
- Selection deletion or restoration as a Group lifecycle side effect.
- A migration, revision/audit log, new browser route, test-only endpoint,
  package, first-level module, dependency, or boundary permission.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse Group `state` and the partial unique index | The schema already encodes reversible lifecycle and the final concurrent Active-name invariant. |
| Keep three domain operations | Editing, archival eligibility, and reactivation uniqueness are distinct decisions with distinct inputs. |
| Precheck narrowly, guard authoritatively | Domain tests own visible rules while one D1 statement decides stale/concurrent acceptance. |
| Never mutate Selections | Product semantics retain current/history and derive meaning from surrounding state. |
| Keep actions on stable Course detail | Group editing and state actions are incidental Course structure, not new navigation. |
| Bound only the historical browser fixture | Worker/D1 proves the real state; bounded UI data avoids a test-only time/state API. |

## Phases

### Phase 1: Domain Policy And Guarded Persistence

- [x] Add update/archive/reactivate factories, exports, and focused domain
      tests for fields, ownership, normalized conflicts, exact time/state
      blocker matrix, retained identity, and refusal propagation.
- [x] Add same-Course Group/current-reference reads and guarded edit/lifecycle
      D1 statements with exact refusal classification.
- [x] Prove Active/Archived edit behavior, same/different-Course names,
      lifecycle retention, no restoration, current Admin/Course refusal,
      concurrent name/reference winners, and rollback.

**Checkpoint**: A Group row changes atomically only when current rules permit,
and no accepted race can leave an Archived Group selected for new future intent
or duplicate Active normalized names.

### Phase 2: HTTP Contract And Participant Retention

- [x] Add exact nested Group resource/action matching, server-derived inputs,
      narrow success bodies, and field/conflict/not-found/current-state status
      mappings.
- [x] Cover malformed/trust input, cross-Course identifiers, missing/Disabled
      Admin, Archived Course, target state, blocker/name races, and sanitized
      technical failure.
- [x] Prove Admin detail retains both Group states and Participant detail lists
      only Active choices while an own retained Selection still includes the
      same Archived Group details and derived meaning.

**Checkpoint**: Same-origin requests expose no trust or unrelated Participant
data and preserve the full retained Group meaning across lifecycle changes.

### Phase 3: German Stable-Detail Management

- [x] Add Group edit/lifecycle mutations and targeted Admin/Participant cache
      reconciliation.
- [x] Add responsive Group cards, state Chips, complete edit forms, accessible
      lifecycle Dialogs, permanent retention copy, and localized outcomes.
- [x] Add Playwright real edit/archive blocked and allowed/reactivation
      conflict/rename/success/refresh evidence plus bounded historical
      Participant selected-Group presentation.
- [x] Cover field/dialog/result focus, keyboard activation/cancel restoration,
      desktop/360px layout, stale/technical refusal, and axe scans.

**Checkpoint**: Admins can understand and operate every permitted Group state
without losing retained intent or mistaking Archived Groups for future choices.

### Phase 4: Documentation, Verification, And Completion

- [x] Update affected canonical docs, dictionary coverage, and index routing.
- [x] Run focused domain, Worker/D1, Participant HTTP, and Playwright suites
      plus final `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and create one semantic commit
      ending in `TASK-kmm36`.

**Checkpoint**: Product behavior, implementation truth, evidence, tracking,
and commit history agree.

## Testing Strategy

- Booking-domain Vitest owns complete Group fields, stable normalization,
  Active-versus-Archived conflict policy, exact upcoming/exact-start/in-
  progress/ended/Cancelled retained-reference matrix, injected instant,
  identity/details/state preservation, and persistence outcome propagation.
- Worker/D1 Vitest owns guarded field/state updates, partial-index concurrency,
  two-sided archive/Selection races, cross-Course isolation, retained Selection
  identity/details, no restoration, stale actor/Course/Group/reference state,
  rollback, exact HTTP/privacy outcomes, and production authentication.
- Participant HTTP integration owns Active choice filtering plus retained
  selected Archived Group details and derived live/history representation.
- Playwright owns German Group edit/lifecycle success/refusal, field and Dialog
  focus, refresh, responsive widths, Admin retained data, bounded Participant
  history, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote state is introduced; the
existing Group/Selection schema remains valid and local/test D1 state is
disposable.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan stays focused on one Group lifecycle task

## References

- `TASK-kmm36`
- `docs/product/course-structure.md`
- `docs/product/module-participation.md`
- `docs/product/domain-model.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/process/verification.md`
