---
id: PLAN-nt3f6
title: Implementation plan for Disable and re-enable Participants
status: done
implements:
- TASK-25j4s
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Participant Disable/Re-enable Implementation Plan

## Overview

Complete the reversible Participant lifecycle inside the existing
`course-access` responsibility. Active Admin Users will Disable an Active
Participant through one atomic D1 batch that removes only future Scheduled-
Module Selections across every Course before changing the retained Participant
row to Disabled. Re-enable changes only that retained row back to Active and
never reconstructs removed booking intent.

The stable Admin Participant detail route will expose exactly one current
action with German MUI confirmation and result/refusal focus. Existing fresh
Participant-context, Course-access, profile, and Selection guards continue to
enforce the global Disabled state; no participant-side lifecycle endpoint is
introduced.

No migration or first-level boundary change is needed. The existing
`participants.state` constraint, Assignment/Selection ownership, injected
application clock, and derived Selection presentation already encode the
accepted behavior.

## Ground Truth

- `.markplane/backlog/items/TASK-25j4s.md` — exact lifecycle, UI, evidence, and
  non-goal boundaries.
- `docs/product/course-access.md#participant-global-access-state` — global
  Active/Disabled transitions, access effects, and Assignment preservation.
- `docs/product/module-participation.md#participant-disable` and
  `#participant-re-enable-in-progress` — exact cross-Course Selection boundary
  and derived live/history behavior.
- `docs/product/domain-model.md#selection-validity-and-history` — hard
  invariants at future, exact-start, in-progress, exact-end, and Cancelled
  boundaries.
- `packages/booking/src/course-access/createResolveParticipantContext.js` —
  existing global Active/Disabled context refusal.
- `packages/booking/src/module-participation/deriveModuleSelectionPresentation.js`
  — authoritative live/history derivation without persisted status.
- `apps/booking-system-web/src/worker/course-access/createParticipantPersistence.js`
  — existing retained Participant row and guarded profile writes.
- `apps/booking-system-web/src/worker/course-access/createCourseAccessHttpHandler.js`
  and `courseAccessHttpContract.js` — existing freshly authorized Admin
  Participant detail and explicit lifecycle-action routing patterns.
- `apps/booking-system-web/src/browser/course-access/AdminParticipantDetailPage.jsx`
  and `useCourseAccess.js` — stable detail, current state, mutations, and query
  ownership.
- `apps/booking-system-web/src/browser/participant-entry/ParticipantEntryPage.jsx`
  — existing Disabled unavailable state and safe sign-out path.
- `apps/booking-system-web/migrations/0004_participants.sql` through
  `0006_module_selections.sql` — constrained retained identity, relationships,
  and Selection ownership; no schema change is required.

No relevant adjacent `*.docs.md` file exists for the concrete source and
configuration files inspected for this plan.

## Approach

1. Extend booking-domain Participant lifecycle operations:
   - add separate Disable and Re-enable factories inside `course-access`;
   - require a current Active Admin and the exact applicable target state before
     calling persistence;
   - inject `now()` once for Disable and pass its exact epoch to persistence;
   - return language-neutral `disabled`, `re-enabled`, actor-stale, and target-
     stale outcomes while preserving the same Participant identity; and
   - retain the existing Selection derivation, adding direct proof that a
     retained in-progress Selection is historical while Disabled, becomes live
     after eligible Re-enable, and stays historical at exact `endsAt` or when
     Course/Assignment predicates do not permit access.
2. Extend the existing Participant D1 adapter without a migration:
   - Disable runs an ordered `D1Database.batch()`: delete this Participant's
     Selections joined to Scheduled Modules with `starts_at > now`, then update
     the same still-Active Participant to Disabled;
   - both statements repeat the same current Active-Admin and Active-target
     guards so stale or concurrent losers remove nothing;
   - the deletion is deliberately global across all Courses and independent of
     current Assignment state, while exact-start, in-progress, ended, and every
     Cancelled-Module Selection remain;
   - the batch returns the exact removed count and rolls both statements back
     on any failure;
   - Re-enable uses one guarded update from Disabled to Active, preserving
     profile, principal, Assignments, retained Selections, and same-principal
     Admin data; and
   - classify a zero-change result from fresh Admin and Participant state.
3. Extend same-origin Admin HTTP with two explicit action resources:
   - `POST /api/admin/participants/:participantId/disablement`;
   - `POST /api/admin/participants/:participantId/reenablement`;
   - accept no browser-selected identity, state, instant, Assignment, or
     Selection data;
   - return narrow Participant/result representations, plus the removed count
     for Disable; and
   - freshly authorize every request, use `404` for an unknown target, exact
     `409` target-state refusals, exact current-Admin refusal, and sanitized
     `500` technical failure.
4. Extend stable Admin Participant detail:
   - keep the state chip and profile form, adding one slice-owned lifecycle
     action for the current Participant state;
   - Disable uses destructive German confirmation explaining global access
     loss, future-Selection removal, and retained membership/history;
   - Re-enable explains restored eligibility and non-restoration without
     claiming every Course is accessible;
   - pending, success, stale/unavailable, and technical states are focusable,
     non-color-only, keyboard-operable, and responsive; and
   - successful mutations invalidate Participant detail/directory, Course
     membership, current Participant, and Participant Course caches so a same-
     principal Admin/Participant session immediately reflects current state.
5. Preserve task boundaries:
   - do not add participant self-disable, hard deletion, audit history, or
     automatic Selection restoration;
   - do not implement Course Invite Join; its later owning task must consume
     the already-authoritative Active Participant predicate;
   - do not add Admin User lifecycle from `TASK-ikzih` or administrative
     Selection inspection from `TASK-49if4`; and
   - update canonical status, HTTP, persistence, browser, verification,
     dictionary, and index docs after implementation evidence is green.

## Non-Goals / Out of Scope

- Participant self-disable, self-Re-enable, self-leave, or hard deletion.
- Course Invite creation or Join (`TASK-k2ckf`, `TASK-5gny6`).
- Admin User Disable/Re-enable/delete (`TASK-ikzih`).
- Administrative participation inspection or assisted booking (`TASK-49if4`,
  `TASK-2nh3b`).
- Persisted lifecycle/audit history or restoration of removed Selections.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Keep lifecycle in `course-access` | Participant identity, profile, state, and global access already have one conceptual owner. |
| Reuse the Participant row and schema | Active/Disabled is already constrained; lifecycle needs guarded mutations, not new data. |
| Use two explicit action resources | Browser input cannot select lifecycle state, and each transition has a distinct accepted effect. |
| Delete then update in one guarded D1 batch | The future-Selection boundary and state change succeed or roll back together. |
| Keep Selection meaning derived | Re-enable can make retained in-progress intent live without another Selection state. |
| Keep lifecycle on stable Participant detail | The action is incidental state, not a separately navigable view. |

## Phases

### Phase 1: Domain And Atomic Persistence

- [x] Add Disable/Re-enable operation factories and package-root exports.
- [x] Add injected-time actor/target/refusal and identity-preservation tests.
- [x] Add guarded global Disable batch and guarded Re-enable update.
- [x] Prove exact temporal/lifecycle retention, multi-Course scope,
      Assignment preservation, same-principal Admin isolation, concurrency,
      stale refusal, and batch rollback.

**Checkpoint**: One retained Participant transitions coherently and no refused
or failed operation partially removes Selection or relationship data.

### Phase 2: HTTP And Fresh Participant Access

- [x] Add exact Disable/Re-enable action matching and narrow representations.
- [x] Cover unauthenticated/missing/Disabled Admin, unknown/stale target,
      technical sanitization, and production fail-closed composition.
- [x] Prove Disabled current-context, profile, Course, and Selection refusal;
      same-principal Admin continuity; and eligible access after Re-enable.

**Checkpoint**: Direct requests accept only authorized transitions and every
Participant-facing surface immediately follows fresh global state.

### Phase 3: German Participant Lifecycle UI

- [x] Add slice-owned lifecycle mutations and targeted cache invalidation.
- [x] Add the applicable detail action, confirmation, accurate copy, and
      success/refusal focus behavior.
- [x] Add Playwright real Disable/sign-out/Re-enable/access/non-restoration and
      same-principal Admin evidence; use bounded presentation fixtures only for
      retained past/Cancelled states that current creation UIs cannot produce.
- [x] Cover desktop/360px layout, keyboard/dialog focus, direct refresh, and
      axe scans.

**Checkpoint**: Stable Admin Participant detail safely manages the global
lifecycle and the Participant entry truthfully presents Disabled access.

### Phase 4: Documentation, Verification, And Completion

- [x] Update affected canonical docs, dictionary coverage, and index routing.
- [x] Run focused suites and the final canonical `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and create one semantic commit
      ending in `TASK-25j4s`.

**Checkpoint**: Product behavior, implementation truth, evidence, tracking,
and commit history agree.

## Execution State

All four phases are implemented. Focused domain, Worker/D1, and Playwright
suites passed during implementation. The final canonical `pnpm check` passed
on 2026-08-28 with 226 domain tests, 156 Worker/D1 tests, a successful
production build, and 32 Chromium Playwright tests.

## Testing Strategy

- Booking-domain Vitest owns actor/target eligibility, exact injected instant,
  identity/Assignment preservation, and Disabled/Re-enabled live/history
  predicates at future, exact start, in progress, exact end, ended, and
  Cancelled states.
- Worker/D1 Vitest owns global deletion scope, exact boundary retention,
  guarded state transitions, concurrent/stale outcomes, rollback,
  same-principal Admin isolation, HTTP privacy, and fresh access.
- Playwright owns composed German actions, confirmation/focus, Disabled entry
  and sign-out, Re-enable access, future non-restoration, retained-history
  presentation, responsiveness, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. There is no migration or remote state; existing
Active/Disabled data remains schema-valid and local/test D1 state is
disposable.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan stays focused on this one Participant lifecycle task

## References

- `TASK-25j4s`
- `docs/product/course-access.md`
- `docs/product/module-participation.md`
- `docs/architecture/applications.md`
- `docs/architecture/persistence.md`
- `docs/process/verification.md`
