---
id: PLAN-p6dvs
title: Implement Participant Course assignment
status: draft
implements:
- TASK-z6hut
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Implement Participant Course Assignment

## Overview

Implement `TASK-z6hut` as one complete `course-access` vertical slice. An
Active Admin User can discover every registered Participant, including those
with no membership, inspect a Course's current Assignments, and establish one
ordinary Active Course Assignment for an Active or Disabled Participant.

The slice adds dependency-free booking policy, one additive D1 migration,
guarded and idempotent persistence, narrow same-origin Admin HTTP operations,
and German MUI directory/membership experiences. Assignment creates no Module
Selection, no Participant identity, and no origin-specific membership state.

## Ground Truth

- `TASK-z6hut`, `EPIC-m22qh`, and `NOTE-7gbq2` — exact acceptance,
  dependency order, local-only scope, UI/accessibility contract, and evidence
  ownership.
- `docs/product/domain-model.md:150-190`, `:244-283`, and `:343-401` — one
  Active/Revoked Assignment per Participant/Course pair, membership distinct
  from Selection, idempotence, authoritative acceptance, and valid empty
  states.
- `docs/product/course-access.md:157-278` and `:358-435` — Disabled target
  administration, global Participant discovery, direct Assignment semantics,
  administrative visibility, privacy, and current-state validation.
- `docs/product/_decisions.md:3-10`, `:79-103`, and `:208-222`, plus
  `docs/product/non-goals.md` — separate membership/participation, retained
  lifecycle, acceptance-time validation, focused views, and excluded pending,
  origin, self-leave, audit, and workflow states.
- `packages/booking/src/course-access/createRegisterParticipant.js:1-83`,
  `createResolveParticipantContext.js:1-25`, and `courseAccess.test.js:1-152`
  — current operation-factory, plain-data, language-neutral outcome, and
  validation-before-effect patterns.
- `packages/booking/src/course-structure/createCreateCourse.js:1-112` and
  `createCreateGroup.js:1-84` — current Active actor/Course checks and guarded
  persistence outcome translation.
- `apps/booking-system-web/migrations/0002_courses.sql`,
  `0003_groups_and_modules.sql`, and `0004_participants.sql` — current stable
  identities, constrained states, restrictive ownership, and additive schema
  conventions.
- `apps/booking-system-web/src/worker/course-access/
  createParticipantPersistence.js:1-96` and its Worker tests — Participant
  mapping, constraint classification, deterministic ordering, and D1 setup.
- `apps/booking-system-web/src/worker/course-structure/
  createCoursePersistence.js:1-89`, `courseHttpContract.js:1-130`, and
  `createCourseHttpHandler.js:1-354` — guarded SQL acceptance, narrow response,
  exact route matching, fresh Admin authorization, and stale classification.
- `apps/booking-system-web/src/worker/createWorkerApplication.js:1-72` and both
  Worker compositions — route precedence and narrow UUID/persistence injection.
- `apps/booking-system-web/src/browser/course-structure/
  CourseDetailPage.jsx:1-225`, `useCourses.js:1-132`, and
  `courseStructureTranslations.js:1-134` — stable Course detail, query/mutation,
  MUI state, focus, responsive, and slice-owned German copy patterns.
- `apps/booking-system-web/src/browser/admin-bootstrap/
  AdministrationContext.jsx:1-112` and `BrowserApplication.jsx:1-48` — Active
  Admin route gate, administration navigation, and nested route composition.
- `apps/booking-system-web/test/e2e/courseStructure.spec.js:1-476` and
  `participantRegistration.spec.js:1-439` — real fixture/session journeys,
  intercepted exceptional states, desktop/360px, keyboard/focus, refresh,
  privacy, axe, and overflow conventions.
- `docs/architecture/{applications,persistence,packages,module-organization,
  runtime-and-hosting,browser-conventions,boundaries,javascript-conventions}.md`
  and `docs/process/{conceptual-simplicity,verification}.md` — ownership,
  migration, same-origin, browser, boundary, and verification constraints.

## Approach

- Add `createAssignParticipantToCourse` in
  `packages/booking/src/course-access/`. It accepts current `adminUser`,
  `course`, and `participant` data plus only `createCourseAssignmentId` and
  `assignParticipantToActiveCourse` capabilities.
- Check an Active actor, Active Course, and a fully registered target whose
  state is Active or Disabled before creating an Active Assignment candidate.
  Translate persistence outcomes without creating a Selection or identity.
- Extend the `course-access` public interface and booking root export only. No
  first-level responsibility or package edge changes.
- Add `0005_course_assignments.sql` with stable ID, restrictive Participant and
  Course foreign keys, constrained Active/Revoked state, a unique
  `(participant_id, course_id)` pair, and triggers preventing ownership change.
  Do not add `module_selections`.
- Extend Participant persistence with `findParticipantById` and ordered
  `listParticipants`. Add Assignment persistence with:
  - ordered Course membership joined to the minimum Participant representation;
  - one guarded `insert ... select ... on conflict ... do nothing` that
    rechecks current Active Admin, Active Course, and Active/Disabled target;
  - post-write classification of created, already-Active, stale actor/Course,
    missing/ineligible target, and retained Revoked state; and
  - one actual persisted Assignment returned for created or idempotent success.
- Add a Worker `course-access` Admin handler before generic Course routing:

  | Operation | Success | Refusal/error |
  | --- | --- | --- |
  | `GET /api/admin/participants` | `200 { participants }` | `401`; exact `403` missing/Disabled Admin |
  | `GET /api/admin/courses/:courseId/assignments` | `200 { assignments }` for an existing Active or Archived Course | `401`; exact `403`; `404 course-not-found` |
  | `POST /api/admin/courses/:courseId/assignments` with `{ participantId }` | `201` created Assignment; `200` already-Active Assignment | `401`; exact `403`; `404` Course/Participant; `409 course-not-active`/retained lifecycle refusal; `422 invalid-participant-id` |

- Expose Participant list items as `{ id, name, email, state }` and Assignment
  items as `{ id, state, participant: { id, name, email, state } }`. Derive
  Assignment ID/state and all authorization server-side; ignore trust fields.
- Add browser-owned `course-access` query/mutation resources and components:
  - `/admin/participants` global directory, linked from `/admin`, showing every
    registered Participant and a truthful empty/loading/unavailable state;
  - a Course membership section on stable `/admin/courses/:courseId` with
    ordered empty/list/loading/error state; and
  - an MUI assignment Dialog listing eligible Active/Disabled Participants.
- Keep assigned Participants selectable so a repeat submit visibly exercises
  idempotence. On cancel/Escape restore the opener; on success close and focus
  a semantic result status; on validation/stale/technical refusal focus the
  relevant control or alert.
- Keep all copy in `courseAccess` German i18n resources. Text labels accompany
  chips so Participant and Assignment states never rely on color. Use current
  responsive stack/list patterns without horizontal overflow.
- Use existing fixed normal sessions and real onboarding to create zero-
  Assignment Participants in E2E. Represent a Disabled target and stale
  Course refusal through focused browser contract interception because their
  lifecycle mutation UIs are owned by later tasks; prove real acceptance in
  Worker/D1 tests.

## Acceptance Mapping

| Criterion | Planned evidence |
| --- | --- |
| Discover every registered Participant, including zero Assignment | Ordered D1/HTTP list plus real onboarding-to-Admin directory E2E. |
| Direct Active Assignment for Active/Disabled target | Domain eligibility, guarded D1 tests, HTTP contract, and browser Dialog flow. |
| Idempotent already-Active assignment / unique pair | Domain outcome, unique constraint, concurrent Worker tests, and repeat browser submit. |
| Membership only; no Selection/origin/identity side effect | Schema inspection and D1 row/count/trust-field assertions. |
| Fresh actor, Course, and target validation | Guarded SQL race tests and exact current-state HTTP refusals. |
| Course membership view and global zero-membership directory | Independent Admin route plus stable Course detail section and refresh E2E. |
| German MUI, responsive, keyboard/focus, privacy, axe | Desktop/360px Playwright journeys, focus assertions, direct refresh, Admin gate, axe, and overflow checks. |

## Non-Goals / Out of Scope

- No Assignment revocation, reactivation transition/effects, Archived-Course
  reactivation, or Selection retention (`TASK-smtvk`). The schema admits the
  canonical retained Revoked state, but this slice exposes no lifecycle action;
  an unexpectedly retained Revoked row is left unchanged for that later task.
- No Participant Course access (`TASK-qk47b`), self Selection (`TASK-jvqrk`),
  assisted Selection (`TASK-2nh3b`), Invite Join (`TASK-5gny6`), profile edits
  (`TASK-ca46j`), or Participant Disable/Re-enable UI (`TASK-25j4s`).
- No pending/incomplete Participant, Assignment origin, automatic/default
  Selection, Participant roster exposure outside Admin, self-leave, capacity,
  audit history, fixture-state framework, remote D1, deployment, or release
  hardening.
- No generic repository/API/query/form/component abstraction, first-level
  application responsibility, manifest dependency, or boundary-map edge.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| Keep Assignment policy in existing `course-access` | Canonical ownership already groups Participant identity, Course access, and membership without a new package. |
| Separate Participant directory and Course membership reads | The directory must include zero-Assignment Participants; a membership join alone cannot satisfy discovery. |
| Enforce one pair in D1 and classify after guarded insert | The database decides stale/concurrent races while the domain and HTTP keep precise outcomes. |
| Persist the complete Active/Revoked schema now | Course Assignment's canonical state/cardinality belong to its first schema; lifecycle transitions remain deferred. |
| Return the existing row for idempotent success | Browser/API responses remain truthful and no duplicate identity is manufactured. |
| Add one stable Participant directory route, nest membership on Course detail | Directory discovery is independently navigable; membership is owned by the already stable Course view. |
| Reuse existing named sessions, not add stateful fixtures | Real onboarding covers zero-membership discovery, while Worker/D1 owns lifecycle-state acceptance evidence. |

## Phases

### Phase 1: Domain And Schema

- [ ] Implement/test direct Assignment policy, target eligibility, idempotent
      language-neutral outcomes, and no Selection capability/effect.
- [ ] Add migration 0005 plus clean/upgrade, state, foreign-key, permanent-
      ownership, unique-pair, and absence-of-Selection evidence.

**Checkpoint**: booking Vitest and migration tests prove the first Assignment
contract and rollout-safe schema independently of HTTP/browser mechanics.

### Phase 2: Persistence And Worker HTTP

- [ ] Implement/test Participant directory and Course Assignment persistence,
      deterministic representations, guarded acceptance, idempotence,
      uniqueness, concurrency, stale actor/Course/target, and no partial rows.
- [ ] Implement/test exact Admin routes, fresh authorization, narrow request and
      response contracts, ignored trust fields, privacy, and both Worker
      compositions.

**Checkpoint**: isolated Worker/D1 tests prove every mutation is decided from
current state and one pair survives concurrent/repeated attempts.

### Phase 3: Admin Browser Experience

- [ ] Implement the German Participant directory route and add its Admin
      navigation entry with complete loading/empty/unavailable states.
- [ ] Implement the Course membership section and assignment Dialog with
      Active/Disabled and Active/Revoked labels, complete mutation states,
      predictable focus, direct refresh, and narrow/mobile layout.
- [ ] Add Playwright discovery, empty/list/assign/repeat/Disabled/stale/privacy,
      desktop/360px, keyboard/Dialog focus, axe, and overflow evidence.

**Checkpoint**: the real Admin journey can discover an onboarded zero-membership
Participant, assign them, repeat safely, and revisit the Course membership view.

### Phase 4: Documentation And Completion

- [ ] Update canonical product/architecture/process status, application/API,
      persistence, package/module/browser/boundary, verification, indexes, and
      dictionary implementation wording; update no nonexistent co-located docs.
- [ ] Run focused checks and canonical `pnpm check`, close task/plan/epic state
      where warranted, synchronize Markplane, validate diffs, and commit.

**Checkpoint**: schema, code, docs, tracking, tests, and Git agree direct Course
Assignment is locally complete while access/lifecycle/release work stays absent.

## Testing Strategy

- Booking Vitest: Active/Disabled target, missing/ineligible target, inactive
  actor/Course, created candidate, already-Active result, retained lifecycle
  refusal, and absence of any Selection capability or effect.
- Worker/D1: 0001-0004 upgrade and clean full chain; schema checks; restrictive
  foreign keys and ownership; one pair; ordered directory/membership; Active
  and Disabled target; repeated/concurrent insert; stale actor/Course/target;
  unknown/incomplete target; retained Revoked row unchanged; exact HTTP status,
  body, trust fields, and privacy; no Participant/Selection partial effect.
- Playwright: real Participant onboarding then Admin directory; zero Assignment;
  Course empty membership; Dialog keyboard/trap/cancel restoration; assign and
  success focus; repeat no-op; Disabled representation/action; stale/technical
  refusal; direct directory/Course refresh; missing-Admin request privacy;
  desktop/360px; axe; no horizontal overflow.
- Regression: lint/boundary tests, domain/Worker suites, production build,
  `pnpm check`, then `markplane sync`, `markplane check`, and `git diff --check`.

## Rollback Plan

Before deployment, revert domain/Worker/browser/docs and migration 0005
together; local/test D1 is disposable. After deployment, retain the additive
Assignment table and roll application behavior back rather than applying a
destructive down migration. No remote database exists in this task.

## Execution State

- Current phase/checkpoint: planning is complete; implementation has not begun.
- Completed phase checkboxes: none.
- Next exact action: commit this attached implementation plan, then begin Phase
  1 with booking-domain tests and operation implementation.
- Persisted decisions: canonical product behavior remains in the cited docs;
  task-scoped schema/API/UI decisions are recorded above.
- Focused verification: full context rehydration, dependency/readiness check,
  source/adjacent-doc inspection, and plan ground-truth validation completed;
  `markplane sync` passes. No applicable adjacent `*.docs.md` exists.
- Remaining verification: every focused layer, canonical `pnpm check`,
  Markplane validation, diff validation, task closure, and implementation commit.
- Working tree: only `TASK-z6hut` plan attachment metadata and this new plan are
  uncommitted; no product source change or unrelated user change is present.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under the repository's 300-line split threshold

## References

- `TASK-z6hut`, `EPIC-m22qh`, and `NOTE-7gbq2`
- `TASK-ubm2q` / `PLAN-xtvcq`
- `TASK-7uxjj` / `PLAN-n8a29`
- `TASK-qk47b`, `TASK-ca46j`, `TASK-smtvk`, and `TASK-2nh3b`
