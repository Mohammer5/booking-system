---
id: PLAN-7vmhd
title: Implement Group and future Module creation
status: done
implements:
- TASK-6tfxd
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Implement Group And Future Module Creation

## Overview

Implement `TASK-6tfxd` as the next complete `course-structure` vertical slice:
pure Group/Module creation policy and local-time resolution, one additive D1
migration, freshly authorized nested Course HTTP operations, and German MUI
Group/Module sections on the stable Course detail route.

The first accepted Module insert atomically records permanent Course scheduling
history. Group-name uniqueness, Course ownership, and authoritative Active
Admin/Course checks are enforced at the write boundary. Invalid, stale,
duplicate, nonexistent-time, ambiguous-without-choice, or nonfuture requests
produce no Group, Module, Selection, or timezone-lock side effect.

## Ground Truth

- `TASK-6tfxd`, `EPIC-m22qh`, and `NOTE-7gbq2` — acceptance, ordering,
  local-completion exclusions, UI/accessibility, and evidence ownership.
- `TASK-ubm2q` / `PLAN-xtvcq` — the implemented Course domain, guarded D1,
  HTTP, nested Admin gate, MUI route, and test patterns this slice extends.
- `docs/product/domain-model.md:109-148`, `:211-316`, `:343-409` — Course,
  Group, Module, ownership, naming, definite-time, lifecycle, current-state,
  empty-state, and permanent scheduling-history invariants.
- `docs/product/course-structure.md:35-203`, `:261-323` — Course timezone/DST,
  Group contract/Course-wide meaning, Module creation, Active-Course mutation,
  and authoritative acceptance.
- `docs/product/_decisions.md:42-63`, `:96-123`,
  `representative-scenarios.md:97-121`, and `non-goals.md:41-65` — minimal
  contracts, normalized uniqueness, first-Module lock, future scheduling,
  scenarios M-O, and excluded modeling/workflows.
- `packages/booking/src/course-structure/createCreateCourse.js:1-123` and
  `courseStructure.test.js:1-169` — narrow factory, validation-before-effect,
  language-neutral outcomes, IANA validation, and focused Vitest conventions.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql:1-69`,
  `0002_courses.sql:1-7`, and `src/worker/course-structure/
  courseMigration.worker.test.js:1-39` — current additive migration chain and
  upgrade-path evidence.
- `apps/booking-system-web/src/worker/course-structure/
  createCoursePersistence.js:1-74`, `createCourseHttpHandler.js:1-230`, and
  their Worker tests — guarded inserts, row mapping, exact authorization,
  nested-path parsing, stale refusal, and isolated D1 test patterns.
- `apps/booking-system-web/src/worker/createWorkerApplication.js:1-75` and the
  two Worker compositions — current same-origin routing, UUID, persistence,
  authentication, and production/non-production capability injection seams.
- `apps/booking-system-web/src/browser/course-structure/
  CourseDetailPage.jsx:23-269`, `CourseCreatePage.jsx:18-270`,
  `useCourses.js:1-86`, and `courseStructureTranslations.js:1-51` — stable
  Course detail, MUI/RHF, query/mutation, focus, and German i18n patterns.
- `apps/booking-system-web/test/e2e/courseStructure.spec.js:7-288`,
  `vitest.worker.config.js:1-32`, `wrangler.non-production.jsonc:1-24`, and
  `package.json:16-40` — browser evidence, deterministic non-production
  bindings, and the absence of MUI X, Temporal, or another date library.
- `docs/architecture/{packages,module-organization,javascript-conventions,
  browser-conventions,persistence,boundaries}.md` and
  `docs/process/{conceptual-simplicity,verification}.md` — ownership,
  dependency, migration, browser, and layered-verification constraints.

## Approach

- Extend `packages/booking/src/course-structure/` with:
  - `createCreateGroup`, validating current Active Admin/Course, required
    nonblank name, optional string/null details, and producing a stable Active
    Course-owned Group plus `name.trim().toLowerCase()` uniqueness key;
  - `resolveCourseLocalDateTime`, strictly parsing local minute input and using
    `Intl.DateTimeFormat(...).formatToParts()` round trips in the persisted
    Course IANA timezone to return zero gap candidates, one definite instant,
    or sorted earlier/later overlap candidates; and
  - `createCreateModule`, validating title/optional text, resolving both local
    values with explicit earlier/later choices when needed, reading an injected
    definite `now`, requiring `startsAt > now` and `endsAt > startsAt`, and
    calling persistence only for a valid Scheduled Module.
- Return small language-neutral outcomes. An overlap without every required
  choice returns `schedule-disambiguation-required` plus only the candidate
  instant/offset data needed by the browser; gap and field/interval outcomes
  remain field-addressable. No domain operation creates a Selection.
- Add `0003_groups_and_modules.sql`:
  - `courses.has_ever_had_module` as constrained permanent history;
  - `groups` with stable primary key, Course foreign key, preserved name,
    normalized name, optional details, Active/Archived state, and a partial
    unique index for Active `(course_id, normalized_name)`;
  - `modules` with stable primary key, Course foreign key, required/optional
    text, integer epoch-millisecond instants, Scheduled/Cancelled state, and
    `ends_at > starts_at` constraint;
  - Course-ownership immutability triggers for Group/Module; and
  - an after-Module-insert trigger that sets `has_ever_had_module = 1`, making
    the Module row and permanent timezone freeze one atomic SQL outcome.
- Extend the existing Worker `course-structure` slice with narrow list/create
  capabilities. Guard each insert in SQL on authoritative Active Admin and
  Active Course state. The Group insert also guards normalized-name absence
  while the partial unique index decides stale/concurrent races; zero-change
  outcomes are classified without inventing partial recovery.
- Extend the current HTTP handler rather than adding another responsibility:

  | Operation | Success | Refusal/error |
  | --- | --- | --- |
  | `GET /api/admin/courses/:courseId` | `200` Course plus ordered `groups`/`modules` | existing `401`/`403`/`404` |
  | `POST /api/admin/courses/:courseId/groups` | `201` narrow Group | `401`/`403`; `409` stale Course/name conflict; `422` fields |
  | `POST /api/admin/courses/:courseId/modules` | `201` narrow Module | `401`/`403`; `409` stale Course; `422` fields/time/overlap |

- Derive actor, Course ID, Course state/timezone, identities, lifecycle state,
  and `now` only server-side. Caller trust fields are ignored. A guarded-write
  loss re-resolves current actor/Course state for a safe exact refusal.
- Inject `now` into the Worker composition: real UTC time in production and a
  visibly fake fixed binding only in the explicit non-production composition,
  so Worker and Playwright exact-time evidence is deterministic without a
  production test-clock switch.
- Keep `/admin/courses/:courseId` as the independently navigable surface.
  Refactor its content into locally owned detail, Group, and Module components
  before file budgets are exceeded. TanStack Query owns the augmented detail
  and mutations; React Hook Form owns each independent creation form.
- Use only MUI Core: text/multiline fields, native `datetime-local` inputs,
  RadioGroup choices for overlap occurrences, lists/cards, alerts, chips,
  buttons, and snackbars. Show the Course timezone beside schedule input; show
  candidate offsets/definite instants before resubmission and Course-local plus
  ISO instants after creation. Gap, duplicate, stale, validation, technical,
  empty, pending, and success states receive German copy and predictable field,
  alert, created-item, and post-action focus.

## Acceptance Mapping

| Criterion | Planned evidence |
| --- | --- |
| Active Course-wide Group/minimal fields | Domain outcome, D1 ownership, HTTP and browser create/list. |
| Normalized unique Active names/concurrency | Pure normalization tests, partial unique index, guarded concurrent inserts. |
| Scheduled Module/minimal fields/no Selection | Domain result, Module schema/counts, narrow API and browser list. |
| IANA local input/gap/overlap/definite instants | Fixed-clock domain tables, Worker serialization, browser gap and choice journey. |
| Future/later interval | Exact `<`, `=`, `>` fixed-clock tests and no-write counts. |
| Permanent first-success timezone freeze | Insert trigger, clean/upgrade D1 tests, refused-write rollback evidence. |
| Fresh Active actor/Course/no partial effects | HTTP matrix, stale adapter tests, row/history counts after refusal. |
| Direct empty/list/create experience | Detail refresh plus desktop/360px keyboard, focus, overflow, and axe evidence. |

## Non-Goals / Out of Scope

- No Course editing/timezone mutation (`TASK-7n2my`) or Course archival
  (`TASK-fzniz`). Persist only the history those tasks consume.
- No Group edit/archive/reactivation/delete (`TASK-kmm36`, `TASK-vyj7r`) or
  Module edit/reschedule/cancel/delete (`TASK-2u7z6`, `TASK-vwciv`,
  `TASK-3zcmt`).
- No Participant, Assignment, Invite, Selection, capacity, recurrence,
  per-Module Group, structured logistics, schedule conflict, audit, or
  configurable deadline behavior.
- No MUI X, Temporal polyfill/date dependency, generic resolver/repository/API
  framework, first-level boundary edge, provider/session change, remote D1,
  deployment, or release-hardening work.

## Key Decisions

| Decision | Rationale |
| --- | --- |
| One `course-structure` vertical slice | Canonical ownership already composes Course, Group, Module, and timezone policy. |
| Runtime `Intl` candidate round trips | Existing graphs already use runtime TZDB; native Temporal is absent and no dependency/UI package is needed. |
| Earlier/later occurrence contract | It makes overlap intent explicit without storing a fixed offset as business timezone. |
| Partial unique index plus normalized key | D1 decides concurrent Active-name races while preserving later Archived-name semantics. |
| Module-insert history trigger | One successful SQL insert atomically freezes timezone; every refused/failed insert leaves it false. |
| Augmented stable Course detail | The required Course-owned lists/forms need no incidental new browser route or generic endpoint layer. |
| Non-production-only fixed clock binding | Browser exact-time tests stay deterministic while production has no activatable test clock. |

## Phases

### Phase 1: Domain And Definite-Time Policy

- [x] Implement/test Group creation, normalization, language-neutral outcomes,
      and validation-before-effect.
- [x] Implement/test strict local-time resolution for unambiguous, gap, and
      overlap cases plus Module creation at exact time boundaries.
- [x] Extend only the existing package public interface; preserve boundary map
      edges and dependency-free manifests.

**Checkpoint**: booking Vitest proves complete creation/refusal behavior with
fixed definite time and no persistence call on invalid input.

### Phase 2: Migration, Persistence, And Worker/API

- [x] Add migration 0003 and clean/data-preserving upgrade evidence.
- [x] Implement/test stable rows, immutable ownership, normalized concurrency,
      guarded Active actor/Course writes, Module history trigger, and rollback.
- [x] Compose UUID/clock/persistence capabilities and test exact nested HTTP
      routes, narrow shapes, ignored trust fields, authorization, and stale
      refusals in production/non-production graphs.

**Checkpoint**: isolated D1 evidence proves atomic first-Module freezing, one
concurrent normalized Group winner, and zero partial rows/history on refusal.

### Phase 3: Browser Course Structure

- [x] Extend Course detail queries/mutations and split locally owned detail,
      Group, and Module presentation without introducing generic UI layers.
- [x] Add German MUI empty/list/forms, timezone and definite-instant display,
      DST gap/overlap interaction, success/refusal focus, and responsive states.
- [x] Extend Playwright with real create/list/refresh journeys, gap/overlap,
      stale/error, keyboard/focus, desktop/360px overflow, and axe evidence.

**Checkpoint**: an Active Admin can create and revisit Groups and Modules from
the Course URL, while overlap requires an explicit choice and gaps create none.

### Phase 4: Documentation And Completion

- [x] Update canonical product/architecture/process status, persistence,
      package/module/browser/verification, routing summaries, and dictionary
      implementation wording; update no nonexistent co-located docs.
- [x] Run focused domain/Worker/browser/boundary/build checks and canonical
      `nix develop -c corepack pnpm check`.
- [x] Complete task/epic/plan evidence, Markplane validation, semantic
      implementation commit, and clean-tree verification.

**Checkpoint**: schema, code, docs, Markplane, tests, and Git agree the complete
Group/future-Module creation slice and epic KR1 are locally implemented.

## Testing Strategy

- Booking Vitest: Group text/normalization/outcomes; optional Module text;
  malformed calendar values; valid non-hour-offset zone; Berlin ordinary/gap/
  overlap values; missing/earlier/later choices; `startsAt` before/equal/after
  fixed now; equal/reversed end; inactive actor/Course; no side-effect calls.
- Worker/D1: full clean migration and 0001+0002 upgrade with retained data;
  checks/FKs/immutable ownership; ordered reads; Active-name concurrency;
  stale Admin/Course guards; first-success lock and invalid/failed rollback;
  exact HTTP auth/outcome/shape/trust-field matrices and production fixture
  exclusion.
- Playwright: existing Course journey plus empty Group/Module states, keyboard
  creates, duplicate refusal, definite display, Berlin gap rejection, overlap
  occurrence choice, direct refresh, intercepted stale/technical failures,
  focus/error association, axe, and overflow at desktop and 360px.
- Regression: focused lint and suites, boundary tests if interfaces change,
  both production graphs/build, then full `pnpm check`; finally
  `markplane sync`, `markplane check`, and `git diff --check`.

## Rollback Plan

Before deployment, revert the domain/Worker/browser/docs slice and migration
0003 together; local/test D1 is disposable. After deployment, leave additive
columns/tables/indexes/triggers in place and roll application behavior back
rather than applying a destructive down migration. No remote database exists
during this task.

## Execution State

- Current phase/checkpoint: all implementation-plan phases are complete.
- Completed phase checkboxes: all Phase 1-4 items.
- Next exact action: create the semantic implementation commit and verify the
  clean working tree before selecting the next task.
- Persisted decisions: canonical product behavior remains in product docs;
  implementation/schema/API/UI choices are recorded above.
- Focused verification: lint, all 97 booking tests, all 53 Worker/D1 tests, and
  13 boundary tests pass with zero warnings.
  Migration clean/upgrade, immutable ownership, Group concurrency, exact HTTP,
  stale actor/Course, trigger rollback/history, DST/time, and production
  fixture-exclusion cases are covered. Both production graphs build (628
  Worker and 1100 client modules; existing client chunk warning only). No
  relevant adjacent `*.docs.md` exists. Five focused Course Playwright tests
  pass, covering Group/Module create/list/refresh, duplicate/gap/overlap,
  stale/technical refusal focus, desktop/360px layout, and axe scans. The
  canonical `nix develop -c corepack pnpm check` passes all layers and all 13
  browser tests; the existing client chunk-size advisory is the only build
  notice.
- Remaining verification: semantic commit and clean-tree check only.
- Working tree: planning checkpoint is committed; the verified implementation,
  docs, tracking closure, and plan checkpoints are ready for one task commit.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan remains under the repository's 300-line split threshold

## References

- `TASK-6tfxd`, `EPIC-m22qh`, and `NOTE-7gbq2`
- `TASK-ubm2q` / `PLAN-xtvcq`
- `TASK-qk47b`, `TASK-7n2my`, `TASK-2u7z6`, `TASK-kmm36`, and `TASK-jvqrk`
