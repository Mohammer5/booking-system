---
id: PLAN-nz5n6
title: Implement assigned Participant Course access
status: in-progress
implements:
- TASK-qk47b
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Implement Assigned Participant Course Access

## Overview

Implement `TASK-qk47b` as the read-only Participant-facing half of the existing
`course-access` responsibility. An authenticated principal is resolved to its
current Active Participant on every request; only current Active Assignments
to current Active Courses produce list or detail data. The browser replaces the
unconditional zero-membership message with an authorized Course list and adds
the refresh-safe `/courses/:courseId` detail route.

The slice adds dependency-free booking access policy, guarded D1 reads over the
five existing migrations, narrow Participant HTTP representations, nested
Participant route gating, German MUI list/detail states, and focused domain,
Worker/D1, and Playwright evidence. It adds no migration and no public Course
catalogue, roster, peer data, administrative data, or booking mutation.

## Ground Truth

- `TASK-qk47b`, `TASK-jvqrk`, `TASK-fzniz`, and `EPIC-m22qh` — exact access,
  privacy, read-only Selection boundary, Archived-Course deferral, and KR scope.
- `.instructions/local-functional-assigned-course-access-execution.md` —
  authorized vertical slice, exact route expectations, evidence, closure, and
  Git protocol.
- `docs/product/domain-model.md:150-190` and `:244-283` — Active Participant
  plus Active Assignment access, Course/Selection independence, and absence as
  non-participation.
- `docs/product/course-access.md:379-435` — Active Course visibility,
  Participant privacy, no public discovery, multiple Courses, and current state.
- `docs/product/course-structure.md:35-203` — Participant-relevant Course,
  Group, and Module fields and states.
- `docs/architecture/authentication-and-sessions.md:99-129` — one opaque
  session, contextual principal-to-Participant resolution, and no Course claims.
- `docs/architecture/browser-conventions.md:111-212` — stable routes, TanStack
  server state, authorization-aware fetching, German i18n, MUI, and accessibility.
- `docs/architecture/module-organization.md`, `persistence.md`, and
  `docs/process/{conceptual-simplicity,project-tracking,verification}.md` —
  vertical-slice ownership, existing five-migration schema, planning lifecycle,
  and layered verification.
- `packages/booking/src/course-access/createResolveParticipantContext.js:1-25`,
  `createAssignParticipantToCourse.js`, and `courseAccess.test.js` — current
  operation factory, language-neutral outcome, plain-data, and no-effect patterns.
- `apps/booking-system-web/migrations/0002_courses.sql` through
  `0005_course_assignments.sql` — current Course/Group/Module/Participant/
  Assignment fields and constraints; no `module_selections` table exists.
- `apps/booking-system-web/src/worker/course-access/
  createParticipantHttpHandler.js:1-151` and
  `createParticipantPersistence.js` — existing Participant context semantics,
  narrow response, and D1 mapping.
- `apps/booking-system-web/src/worker/course-structure/
  {createCoursePersistence,createGroupPersistence,createModulePersistence}.js`
  — stable identity lookup, field mapping, and deterministic ordering patterns.
- `apps/booking-system-web/src/worker/createWorkerApplication.js` and both
  Worker compositions — exact route dispatch and explicit persistence injection.
- `apps/booking-system-web/src/browser/participant-entry/
  {ParticipantEntryPage,useParticipantEntry}.js*` — confirmed root cause: only
  `/api/participant/me` is fetched and every Active Participant receives the
  zero-membership alert without any Course request.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdminBootstrapPage.jsx`
  and `BrowserApplication.jsx` — current nested context-gate/Outlet and route
  composition patterns.
- `apps/booking-system-web/src/browser/course-structure/
  {CourseDetailPage,ModuleCreationSection,useCourses}.js*` — stable detail,
  semantic lists/cards, definite time display, query, and responsive MUI patterns.
- `apps/booking-system-web/test/e2e/{participantRegistration,
  courseAssignment,courseStructure}.spec.js` — normal fixed sessions, real D1/API
  setup, route interception for otherwise unavailable lifecycle states, direct
  refresh, keyboard/focus, privacy, axe, and 360px conventions.

## Approach

- Add domain factories in `packages/booking/src/course-access/` for ordered
  Participant Course list and one stable Course detail, backed by one shared
  Active Participant + Active Assignment + Active Course predicate. Refuse
  before calling read capabilities when Participant state is missing/Disabled;
  filter/refuse ineligible memberships with language-neutral outcomes and no
  write capability.
- Extend only the `course-access` and booking root named exports. No package,
  first-level responsibility, dependency, or boundary-map edge changes.
- Add `createParticipantCoursePersistence.js` under Worker `course-access`.
  Guard all SQL by server-derived Participant ID and joins requiring current
  Active Participant, Active Assignment, and Active Course. List by Course name
  case-insensitively then Course ID; detail by the requested stable ID; Modules
  by `starts_at, id`; Groups by case-insensitive name then ID and Active state.
- Return only Assignment state needed for domain policy and participant-relevant
  Course/Module/Group fields. Do not reuse Admin Course detail or Assignment
  DTOs, and never select Participant profile/email/roster/count/Admin data.
- Add a focused `createParticipantCourseHttpHandler.js` plus exact route matcher,
  dispatched before the existing Participant context/onboarding handler. Every
  call authenticates, resolves the current Participant from the stable external
  principal, and then invokes the domain operation and guarded persistence.

  | Operation | Success | Refusal/error |
  | --- | --- | --- |
  | `GET /api/participant/courses` | `200 { courses: [{ id, name, description, timezone, state }] }` | `401 unauthenticated`; `403 no-participant`/`disabled-participant`; sanitized `500 technical-error` |
  | `GET /api/participant/courses/:courseId` | `200 { id, name, description, timezone, state, modules, groups }` | same context outcomes; `404 course-unavailable` for malformed/unknown/inactive/unassigned/Revoked/cross-Participant/stale IDs; sanitized `500 technical-error` |

- Detail Module items are `{ id, title, description, instructions, startsAt,
  endsAt, state, selection: null }`; Group items are `{ id, name, details,
  state }`. The literal `selection: null` is the complete truthful own-Selection
  representation now: migration 0005 is current, no Selection can exist, and
  `TASK-jvqrk` owns adding persistence and mutation. This task adds no table,
  fake row, default Group, pending state, generic Selection reader, or control.
- Refactor the Participant entry route into the current-context gate used by
  nested `/` index and `/courses/:courseId` routes, following the existing Admin
  Outlet pattern. The Course list/detail query components do not mount until the
  current Participant query succeeds as Active, so no private Course request is
  issued during authentication, onboarding, Disabled, or technical states.
- Keep current Participant context in `useParticipantEntry`; add separate
  slice-owned TanStack query keys/functions for Participant Course list/detail.
  Render pending, truthful empty, populated, unavailable, and technical states.
- Keep Participant profile/sign-out on `/`; render a semantic linked Course
  list. Detail uses responsive MUI Course metadata, Module and Active-Group
  sections, honest empty structure, non-color state text, definite Course-local
  times, read-only `Keine Auswahl` state, and navigation back to `/`.
- Add stable `courseAccess.participantCourses.*` German keys only; do not
  hard-code visible German in JSX. Preserve one main landmark, logical h1/h2/h3,
  accessible list/link names, visible keyboard focus, sign-out, and no overflow.

## Acceptance Mapping

| Criterion | Planned evidence |
| --- | --- |
| Active Participant + Active Assignment + Active Course | Domain predicate/operations plus guarded D1 joins and exact HTTP authorization tests. |
| Zero/one/multiple independent assigned Courses | Domain and D1 ordered-list tests plus real browser Assignment journey. |
| Course, Modules, Active Groups, own Selection state | Narrow detail Worker response and populated/empty Playwright states; `selection: null` only. |
| No public discovery or peer/Admin/private data | Unauthenticated/unassigned/cross-Participant tests, JSON key probes, and browser privacy assertions. |
| Fresh current state and indistinguishable identifiers | Per-request context resolution, guarded SQL, stale Participant/Assignment/Course tests, and one `course-unavailable` contract. |
| Stable route/refresh and query-driven home | Nested `/courses/:courseId`, SPA fallback, request-order, direct refresh, and empty/list browser evidence. |
| German MUI/accessibility/responsiveness | Desktop/360px, headings/landmarks/list names, keyboard/focus, axe, and overflow assertions. |

## Non-Goals / Out of Scope

- No Selection table or create/change/remove behavior (`TASK-jvqrk`), Assignment
  revocation/reactivation (`TASK-smtvk`), Participant lifecycle UI
  (`TASK-25j4s`), or Archived-Course historical access (`TASK-fzniz`).
- No Course/Admin Invite, assisted booking, Course/Group/Module lifecycle/edit,
  public discovery, roster, peer profile/email/Selection, counts, Admin data, or
  administrative action in Participant representations.
- No provider/session/cookie/claim change, browser-supplied Participant or
  principal authorization, migration, new dependency, generic API/query/
  repository/service/shared abstraction, remote resource, deployment, or release.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| Dedicated Participant Course handler/persistence inside `course-access` | Keeps Participant access separate from identity onboarding and Admin DTOs while retaining one conceptual owner. |
| Shared nested Participant context gate | Prevents pre-authorization Course requests and duplicated authentication/profile policy across list/detail routes. |
| Guard eligibility in SQL and validate at the domain seam | Prevents broad Admin-data loads/browser filtering while keeping product policy language-neutral and tested. |
| One `course-unavailable` detail outcome | Unknown, inactive, unassigned, Revoked, malformed, and cross-Participant IDs reveal no private existence distinction. |
| `selection: null` per Module | Truthfully exposes the only possible own state without inventing persistence or pre-building `TASK-jvqrk`. |
| No migration or boundary-map change | Existing tables and allowed module/dependency edges fully support this read-only slice. |

## Phases

### Phase 1: Domain Access Policy

- [ ] Implement/test the shared access predicate plus list/detail factories for
      Active/missing/Disabled Participant, Active/missing/Revoked Assignment,
      Active/inactive Course, identifier mismatch, and zero/one/multiple Courses.
- [ ] Prove read-only operations receive no Assignment/Selection write capability
      and create no side effect.

**Checkpoint**: focused booking Vitest proves exact access and refusal policy
without HTTP, D1, browser, or mutation concerns.

### Phase 2: Guarded D1 And Worker HTTP

- [ ] Implement/test narrow deterministic list/detail persistence over migrations
      0001-0005, with Active joins, identifier isolation, Active Groups, all
      Modules, empty structures, privacy fields, and no schema/write side effect.
- [ ] Implement/test exact routes/methods/status/JSON, fresh authentication and
      Participant resolution, trust-field resistance, sanitized failures, both
      Worker compositions, and production fixture exclusion.

**Checkpoint**: isolated Worker/D1 tests prove only current eligible membership
produces narrow Participant Course data and all private identifiers fail alike.

### Phase 3: Participant Browser Experience

- [ ] Implement nested context gating, query-driven `/` Course list, stable
      `/courses/:courseId` detail, separate TanStack keys, German i18n, and
      read-only Module/Group/Selection presentation.
- [ ] Add focused Playwright for real onboarding/Admin direct Assignment,
      zero/one/multiple order, detail/refresh, empty/populated structure, stale/
      technical/unavailable/privacy states, request ordering, sign-out,
      desktop/360px, keyboard/focus, semantic structure, axe, and overflow.

**Checkpoint**: the reported same-session reproduction lists the assigned Course
and opens/refreshes its private detail without exposing adjacent data.

### Phase 4: Documentation, Verification, And Closure

- [ ] Use global docs maintenance to update product/architecture/process current
      state, routes, responsibility, persistence reads, browser server state,
      verification ownership/count wording, indexes where material, and the
      dictionary coverage pass; update no nonexistent co-located docs.
- [ ] Run focused lint/domain/Worker/Playwright checks, canonical `pnpm check`,
      `markplane sync`, `markplane check`, and `git diff --check`; record actual
      evidence, close only proven acceptance/task/plan/KR2, review the complete
      diff, and create the semantic implementation commit.

**Checkpoint**: code, docs, tracking, tests, and Git agree `TASK-qk47b` is done;
KR2 is complete, KR3 and the epic remain open, and adjacent tasks remain unstarted.

## Testing Strategy

- Booking Vitest: predicate, current Participant/Assignment/Course states,
  mismatch, zero/one/multiple ordering preservation, and no write capability.
- Worker/D1 Vitest: exact matching/methods; all context outcomes; ordered lists;
  exclusions; narrow populated/empty detail; Archived Group exclusion; identical
  private identifier outcomes; fresh state loss; response-key privacy; trust
  inputs ignored; both compositions; five-migration/no-Selection/no-write proof.
- Playwright: real fixed sessions, onboarding, Admin Course/Group/Module creation
  and Assignment, same-session Participant list/detail/refresh, zero and multiple
  membership, empty structures, privacy, stale/technical states, request order,
  sign-out, desktop/360px, keyboard/focus, landmarks/headings/link names, axe,
  and horizontal overflow.
- Regression: focused ESLint and suites during development, then `pnpm check`,
  `markplane sync`, `markplane check`, and `git diff --check`.

## Rollback Plan

Before deployment, revert the domain/Worker/browser/docs slice together. No
schema or remote resource changes require data rollback. If application code is
rolled back after deployment, the unchanged five-migration database remains
compatible; no down migration or data rewrite is needed.

## Execution State

- Current phase/checkpoint: planning complete; implementation has not started.
- Completed phase checkboxes: none.
- Next exact action: run Markplane sync/check, review and commit this standalone
  plan, then begin Phase 1 domain policy.
- Persisted decisions: dedicated Participant handler/persistence; guarded Active
  joins; nested current-context gate; one privacy-safe detail outcome; per-Module
  `selection: null`; no migration/dependency/boundary edge.
- Verification observed: baseline checkout and complete diff are clean; both
  prerequisites are done; current source confirms the reported unconditional
  empty-state root cause and absence of Participant Course routes/Selection table.
- Working tree: only `TASK-qk47b` tracking activation and this plan are expected.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is below the repository's 300-line source split threshold

## References

- `TASK-qk47b`, `EPIC-m22qh`
- `TASK-6tfxd` / `PLAN-vx3ws`
- `TASK-z6hut` / `PLAN-p6dvs`
- `TASK-jvqrk`, `TASK-smtvk`, `TASK-fzniz`, and `TASK-25j4s`
