---
id: PLAN-a9qhr
title: Implementation plan for Maintain Participant profiles
status: done
implements:
- TASK-ca46j
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Maintain Participant Profiles Implementation Plan

## Overview

Deliver self-service and Admin-assisted Participant profile editing as one
`course-access` vertical slice. The change reuses the existing Participant
schema and unique normalized-email constraint, introduces shared booking-domain
profile validation plus distinct actor-authorized update operations, adds
guarded D1 column-only updates, exposes stable Participant and Admin resources,
and adds directly navigable German MUI forms with layered evidence.

An edit replaces only `name`, retained trimmed `email`, and its lowercase
complete-address comparison key. Participant identity, external principal,
state, Assignments, Selections, and any same-principal Admin User stay
unchanged. Both domain prechecks and guarded SQL acceptance use fresh state;
uniqueness losers retain the complete previous profile.

## Ground Truth

- `.markplane/backlog/items/TASK-ca46j.md` — exact acceptance, UI, evidence,
  dependency, and non-goal boundaries.
- `docs/product/course-access.md#participant-profile` and `#profile-editing` —
  fields, normalization, self/Admin authority, and preservation rules.
- `docs/product/domain-model.md#identity-and-profile` — identity separation,
  invariants, uniqueness, and authoritative acceptance.
- `packages/booking/src/course-access/createRegisterParticipant.js` — current
  name/email validation and complete-address normalization policy.
- `packages/booking/src/course-access/createAssignParticipantToCourse.js` —
  actor/target precheck plus narrow persistence-outcome pattern.
- `apps/booking-system-web/src/worker/course-access/createParticipantPersistence.js`
  — current Participant row mapping and D1 uniqueness classification.
- `apps/booking-system-web/src/worker/course-access/createParticipantHttpHandler.js`
  — current authenticated Participant resource and onboarding contract.
- `apps/booking-system-web/src/worker/course-access/createCourseAccessHttpHandler.js`
  — fresh Admin authorization and directory/detail composition pattern.
- `apps/booking-system-web/src/browser/course-access/ParticipantDirectoryPage.jsx`
  — current directly navigable Admin directory and responsive card pattern.
- `apps/booking-system-web/migrations/0004_participants.sql` — existing required
  fields and unique lowercase `normalized_email`; no new schema is needed.

## Approach

1. Refine the existing `course-access` domain responsibility:
   - extract the concrete Participant profile input rule used by registration
     and edits without exporting provider or persistence mechanics;
   - add `createUpdateOwnParticipantProfile`, requiring the freshly resolved
     target Participant to be Active; and
   - add `createUpdateParticipantProfileAsAdmin`, requiring an Active Admin and
     an existing Active or Disabled target.
2. Extend existing Participant persistence rather than add a migration:
   - self edit updates only profile columns where the Participant is still
     Active;
   - Admin edit uses one guarded update requiring the Admin still Active and
     the target still a registered Active/Disabled Participant;
   - the existing unique `normalized_email` constraint decides concurrent
     duplicate attempts atomically; and
   - zero-change and uniqueness paths classify narrow current-state outcomes
     without partially changing the target.
3. Extend same-origin HTTP resources:
   - `GET /api/participant/me` remains the current profile read and
     `PUT /api/participant/me` replaces both required profile fields for the
     freshly resolved Active Participant;
   - `GET /api/admin/participants/:participantId` returns one narrow Admin
     detail and `PUT` on the same resource edits it after fresh Admin
     authorization; and
   - invalid fields return `422`, duplicate email `409`, stale actor/target
     returns narrow `403`/`404`, and unexpected failures are sanitized `500`.
4. Add browser routes inside the existing Active-context gates:
   - `/profile` presents the current Participant's values and self-edit form;
   - `/admin/participants/:participantId` presents Active/Disabled detail and
     Admin edit; directory cards link to this stable route; and
   - one slice-owned profile form handles required fields, pending/success,
     duplicate/stale/technical outcomes, predictable focus, responsive layout,
     and non-provider-verified wording.
5. Reconcile TanStack state precisely:
   - self success invalidates the current Participant query so every nested
     Participant route sees the accepted values;
   - Admin success invalidates the target detail and directory; and
   - no Course, Assignment, Selection, authentication, or Admin identity cache
     is mutated as a profile-edit side effect.

## Non-Goals / Out of Scope

- Participant Disable/Re-enable remains `TASK-25j4s`.
- Admin User profile editing remains `TASK-45jmb`.
- No Participant hard delete, provider profile mutation, email verification,
  identity merge/link/transfer, partial profile, or profile audit history.
- No seventh migration, generic CRUD repository, shared transport contract,
  optimistic concurrency version, or general conflict-resolution workflow.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse migration `0004` | Required columns and the exact normalized-email uniqueness constraint already exist; this behavior needs guarded operations, not schema. |
| Separate self and Admin domain factories | The same profile rule has two materially different actor/target authorization contracts that remain visible at composition. |
| `PUT` the complete profile resource | Both fields are required and the browser always has current values; a complete replacement avoids partial-input ambiguity. |
| Guard updates in SQL | Page-load authorization cannot confer later authority; current actor/target state is rechecked at acceptance. |
| Keep one current profile only | Complete profile audit history is explicitly excluded and existing relationships point to stable Participant identity. |

## Phases

### Phase 1: Domain Policy And Guarded Persistence

- [x] Extract/reuse exact name and complete-email validation/normalization.
- [x] Add self and Admin profile-update factories with explicit actor/target
      state and preservation contracts.
- [x] Add focused domain evidence for validation, normalization examples,
      Disabled self refusal, Active/Disabled Admin targets, identity and
      relationship preservation, and persistence refusals.
- [x] Add guarded D1 update capabilities with uniqueness/concurrency,
      current-state classification, unchanged refusal, and no-cascade tests.

**Checkpoint**: Only the three profile columns can change, and every invalid,
duplicate, stale, or concurrent loser preserves the complete prior row and all
relationships.

### Phase 2: Participant And Admin HTTP

- [x] Add authenticated `PUT /api/participant/me` with fresh Active Participant
      resolution and exact field/conflict/stale/technical outcomes.
- [x] Add freshly Admin-authorized `GET`/`PUT
      /api/admin/participants/:participantId` and narrow detail contract.
- [x] Cover missing/Disabled self, Active/Disabled Admin targets, stale actor or
      target, duplicate/concurrent email, malformed input, same-principal Admin
      independence, privacy, and production composition.

**Checkpoint**: Direct HTTP requests edit only the authorized Participant and
return no provider, principal, relationship, or peer data.

### Phase 3: Browser Profile Experiences

- [x] Add `/profile` and `/admin/participants/:participantId` routes plus
      directory/home navigation and stable direct-refresh behavior.
- [x] Add TanStack detail/mutations and a German MUI profile form with current
      values, validation, pending/success/refusal states, field association,
      result focus, and non-provider-verified wording.
- [x] Add Playwright for real self and Active-target Admin edits, duplicate and
      stale refusal, mocked Disabled-target presentation/edit, direct refresh,
      same-principal independence, privacy, desktop/360px, keyboard, and axe.

**Checkpoint**: Both actor contexts can maintain the intended profile without
exposing or mutating unrelated identity or relationship state.

### Phase 4: Documentation, Verification, And Completion

- [x] Update current implementation docs, HTTP/persistence/browser/verification
      counterparts, dictionary coverage, and all affected index summaries.
- [x] Run focused suites and the final canonical `pnpm check`.
- [x] Mark task/plan done, sync/check Markplane, and commit one semantic change
      ending in `TASK-ca46j`.

**Checkpoint**: Repository truth, evidence, tracking state, and semantic commit
agree that the profile slice is complete.

## Execution State

- Current phase/checkpoint: Phases 1-4 are complete; Markplane closure and the
  semantic implementation commit remain.
- Completed phase checkboxes: all Phase 1-4 items.
- Next exact action: mark task and plan done, sync/check Markplane, review and
  stage the task diff, create the semantic commit, and verify clean Git.
- Persisted decisions: accepted product behavior remains in canonical product
  docs; the self/Admin HTTP resources, guarded profile-only D1 updates, stable
  browser routes, unchanged boundary shape, and no-migration decision are
  recorded in their owning architecture/process/dictionary docs.
- Focused verification: lint, 203 booking-domain tests, 132 Worker/D1 tests,
  both production builds, and the affected three Chromium scenarios pass. The
  final canonical `pnpm check` passes on 2026-08-28 with 9 repository-rule
  tests, 13 boundary tests, and all 28 Chromium scenarios.
- Remaining verification: semantic task commit and clean Git.

## Testing Strategy

- Booking-domain Vitest owns exact validation/normalization, actor/target
  eligibility, preserved object identity/state/relationships, and outcomes.
- Worker/D1 Vitest owns guarded atomic updates, uniqueness/concurrency, row and
  relationship preservation, fresh authorization, HTTP privacy, and sanitized
  failures.
- Playwright owns the composed German self/Admin journeys, stable routes,
  refresh, Disabled presentation, duplicate/stale outcomes, focus/keyboard,
  responsive overflow, privacy, and axe.
- `pnpm check` remains the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit. No migration or remote persistence change is added;
the existing Participant schema remains valid, and local/test state is
disposable. Do not add a compensating schema migration.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan stays focused on this one task and its verification evidence

## References

- `TASK-ca46j`
- `docs/product/course-access.md`
- `docs/product/domain-model.md`
- `docs/process/verification.md`, `docs/architecture/applications.md`, and
  `docs/architecture/persistence.md`
