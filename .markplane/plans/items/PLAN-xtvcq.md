---
id: PLAN-xtvcq
title: Implement Course creation and Admin views
status: done
implements:
- TASK-ubm2q
related: []
created: 2026-08-28
updated: 2026-08-28
---

# Implement Course Creation And Admin Views

## Overview

Implement `TASK-ubm2q` as the first complete `course-structure` vertical slice:
one booking-domain creation operation, one rollout-compatible D1 migration,
freshly authorized Worker/API reads and creation, and German MUI Course
index/create/detail routes. A created Course has only the canonical minimal
data, stable identity, Active state, and no implicit related business object.

The existing Admin entry becomes the authorization gate for nested Admin
routes. Every Course HTTP request still authenticates and resolves current
Admin state independently, and the guarded insert rechecks actor state at the
write boundary so a stale submit cannot create a Course.

## Ground Truth

- `TASK-ubm2q`, `EPIC-m22qh`, and `NOTE-7gbq2` — acceptance, dependency,
  local-completion, UI/accessibility, and evidence ownership.
- `TASK-dfq2k` / `PLAN-vx3ws` — implemented responsive MUI shell and direct,
  refresh-safe route foundation that this slice must extend.
- `docs/product/domain-model.md:109-123`, `:343-408` and
  `docs/product/course-structure.md:35-89`, `:261-322` — Course fields,
  Active/Archived lifecycle, IANA timezone, initial emptiness, and current-state
  acceptance.
- `docs/product/admin-access.md:40-139`, `:364-370` and
  `docs/product/representative-scenarios.md:97-102`, `:251-259` — Active Admin
  authority, Disabled refusal, scenario M, and stale-actor behavior.
- `packages/booking/src/admin-access/createResolveAdminContext.js:1-28` and
  `createBootstrapFirstAdmin.js:1-46` — language-neutral outcomes, narrow
  capability injection, and validation-without-storage-normalization pattern.
- `packages/booking/src/index.js:1-5` and
  `packages/booking/boundaries.config.mjs:1-22` — current package interface and
  the map that must explicitly add `course-structure`.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql:1-69`
  and `src/worker/admin-bootstrap/createAdminPersistence.js:1-89` — current
  SQLite/D1 schema and owned persistence-adapter pattern.
- `apps/booking-system-web/src/worker/createWorkerApplication.js:1-59`,
  `src/worker/admin-bootstrap/createAdminHttpHandler.js:1-155`, and the two
  Worker compositions — existing routing, exact outcomes, authentication seam,
  UUID composition, and narrow HTTP representations.
- `apps/booking-system-web/vitest.worker.config.js:1-32` and installed
  `@cloudflare/vitest-plugin` 1.1.1 `D1Migration`/`applyD1Migrations` types —
  ordered clean and upgrade migration evidence can use migration-array slices.
- `apps/booking-system-web/src/browser/BrowserApplication.jsx:1-34`,
  `admin-bootstrap/AdminBootstrapPage.jsx:24-281`,
  `admin-bootstrap/useAdminBootstrap.js:1-113`, and
  `application-shell/ResponsiveApplicationShell.jsx:18-215` — current route,
  Admin-state, TanStack Query, nested-route, navigation, and focus seams.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdminRegistrationForm.jsx:13-90`
  and `test/e2e/adminBootstrap.spec.js:7-503` — React Hook Form, localized
  outcome, keyboard/focus, axe, and responsive-test patterns.
- `docs/architecture/{packages,module-organization,browser-conventions,persistence,boundaries}.md`
  and `docs/process/{conceptual-simplicity,verification}.md` — responsibility,
  migration, browser, deny-by-default, and layered verification rules.

## Approach

- Add `packages/booking/src/course-structure/` with a public
  `createCreateCourse` factory. It accepts only `createCourseId` and
  `createCourseForActiveAdmin`, validates current Active actor, nonblank string
  name, optional string/null description, and an IANA timezone (default
  `Europe/Berlin`; fixed-offset forms are invalid), then emits only
  `created`, `admin-not-active`, `invalid-name`, `invalid-description`, or
  `invalid-timezone` outcomes.
- Preserve valid supplied name/description text rather than silently trimming
  storage, following the current Admin-name precedent. Omitted/null description
  becomes `null`; absent/null/blank timezone means no selection and receives
  the default. Do not add length, uniqueness, or canonicalization rules.
- Add `0002_courses.sql` with `courses(id primary key, name, description,
  timezone, state)` and SQLite checks for nonblank name and Active/Archived
  state. No Group, Module, Assignment, Invite, audit, timestamp, or speculative
  timezone-freeze column is introduced.
- Add Worker slice `src/worker/course-structure/` with `createCoursePersistence`
  and `createCourseHttpHandler`. The adapter owns list/get/guarded-create and
  maps rows to plain Course data. The insert uses `insert ... select ... where
  exists` against the actor Admin ID and Active state; zero changes means the
  actor lost authority at acceptance.
- Compose Admin and Course persistence explicitly in both Worker entrypoints;
  do not introduce a repository framework or services bag. Route exact
  same-origin operations before the existing Admin fallback:

  | Operation | Success | Refusal/error |
  | --- | --- | --- |
  | `GET /api/admin/courses` | `200 { courses: [...] }` | `401`; exact `403` missing/Disabled Admin |
  | `POST /api/admin/courses` | `201` narrow Course | `401`; exact `403`; `422` field outcome |
  | `GET /api/admin/courses/:courseId` | `200` narrow Course | `401`; exact `403`; `404 course-not-found` |

- Each route derives the external principal only from the normal Better Auth
  session and freshly runs `createResolveAdminContext`. POST ignores
  caller-supplied ID/state/authority/actor fields. After a guarded-insert loss,
  resolve current Admin state again for a precise safe refusal and create no
  row. List order is deterministic by case-insensitive name then ID; duplicate
  names and concurrent independent submissions remain accepted.
- Refactor `/admin` into a nested route whose existing bootstrap/current-Admin
  page gates its index and Course children. The Course API is never requested
  before the gate resolves an Active Admin. Preserve the existing `/admin`
  page, one session, sign-in/sign-out, and shell; change shell context matching
  to cover all `/admin/...` routes.
- Add browser `course-structure` slice routes `/admin/courses`,
  `/admin/courses/new`, and `/admin/courses/:courseId`. TanStack Query owns
  list/detail/mutation state; React Hook Form owns name, optional description,
  and timezone mechanics; German slice resources own all visible copy.
- Use direct MUI headings, breadcrumbs/links, Card/List, TextField, Button,
  Alert, Chip, and Snackbar patterns. The index has truthful loading, empty,
  list, and technical-error states plus a visible create action. Detail is
  refresh-safe and identifies Active state with text, not color alone.
- On validation or server refusal, focus the associated field or error Alert.
  On success, navigate to the new ID-backed detail route, focus its heading,
  and announce a localized success Snackbar. Desktop and 360px layouts retain
  usable primary actions and no horizontal overflow.

## Acceptance Mapping

| Criterion | Planned evidence |
| --- | --- |
| Minimal fields/nonunique name | Domain validation/duplicate tests, D1 rows, API and real browser creation. |
| IANA timezone/default/fixed-offset refusal | Domain table tests, Worker 422 tests, form validation, detail rendering. |
| Active empty Course/no implicit object | Domain created outcome, courses-only migration, D1 schema/count assertions. |
| Fresh Active Admin only/stale disable | HTTP auth matrix plus guarded-insert stale-actor test and browser privacy. |
| Stable D1 identity/concurrency | Clean/upgrade migration, read-after-create, duplicate-name concurrent inserts. |
| Direct Admin index/create/detail | Real Playwright journey, refresh/direct/error/empty tests at both widths. |

## Non-Goals / Out of Scope

- No Course edit/timezone mutation (`TASK-7n2my`) or archival
  (`TASK-fzniz`).
- No Groups/Modules (`TASK-6tfxd`), Assignments (`TASK-z6hut`), Course Invites
  (`TASK-k2ckf`), Participant data/access, implicit placeholder, or counts API.
- No timezone-freeze history before Module creation owns that need; no
  capacities, recurrence, audit workflow, generic API/UI/persistence layer,
  MUI X, new dependency, provider change, fixture principal, or OAuth UI test.
- No remote D1/Cloudflare provisioning, credentials, deployment, hosted test,
  or release-hardening work.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| One `course-structure` package module | Canonical architecture already names it as the Course lifecycle owner. |
| Guard the Course insert with current Admin state | Fresh pre-resolution alone cannot defeat an actor disabled between page load and write acceptance. |
| Native `Intl.DateTimeFormat` IANA validation plus fixed-offset rejection | It is runtime-compatible, requires no dependency, and enforces the explicit product distinction. |
| Three small same-origin Course endpoints | They map directly to the required index/create/detail views without a generic transport framework. |
| Nested current-Admin browser gate | Direct child routes reuse one proven auth state machine and make pre-authorization Course privacy structural. |
| Separate migration 0002 and upgrade test | Preserves version history and proves both clean construction and data-preserving evolution. |

## Phases

### Phase 1: Domain And Boundary

- [x] Implement/test the Course creation operation and public exports.
- [x] Add the `course-structure` booking responsibility to the deny-by-default
      map and its exact root interface permission.

**Checkpoint**: pure tests prove minimal creation, validation, default timezone,
nonunique names, Active/empty outcome, and no extra capability call.

### Phase 2: Migration, Persistence, And Worker/API

- [x] Add migration 0002 and clean/upgrade schema evidence.
- [x] Implement/test Course persistence, stable identity, deterministic reads,
      duplicate/concurrent creation, and guarded stale-actor refusal.
- [x] Compose and test exact authenticated Course HTTP routes/outcomes in both
      production and non-production Worker graphs.

**Checkpoint**: Worker/D1 tests prove migration compatibility, authorization,
validation, atomic write acceptance, narrow serialization, and no implicit row.

### Phase 3: Browser Slice

- [x] Refactor the existing Admin state into the nested route gate without
      changing bootstrap/authentication behavior.
- [x] Add German MUI index/create/detail routes, query/form state, navigation,
      success announcement, refusal focus, and responsive layouts.
- [x] Add Playwright real journey plus direct/refresh, empty/error/privacy,
      keyboard/focus, desktop/360px, overflow, and axe evidence.

**Checkpoint**: an Active Admin can discover, create, and revisit Courses by
URL while every non-Active context receives no Course data.

### Phase 4: Documentation And Completion

- [x] Update canonical implementation/status, package/module/boundary,
      persistence, application/route, browser, verification, index, and
      dictionary wording; maintain no nonexistent co-located docs.
- [x] Run focused suites/build/boundary graph checks and canonical
      `nix develop -c corepack pnpm check`.
- [x] Complete task/plan evidence, Markplane state, validation, and semantic
      implementation commit.

**Checkpoint**: code, schema, docs, Markplane, tests, and Git all agree the
Course create/view slice is locally complete.

## Testing Strategy

- Booking Vitest: blank/wrong-type name; omitted/supplied description; default,
  alternate IANA, fixed-offset/invalid timezone; duplicate names; Active empty
  result; inactive actor and no persistence call.
- Worker/D1: full clean migration includes `courses`; dedicated upgrade test
  applies migration 0001, seeds Admin/history, applies 0002, and proves old data
  plus new table; persistence constraint/stable read/list/no-implicit schema;
  duplicate-name concurrency; guarded stale actor.
- HTTP: unauthenticated/missing/Disabled/Active matrix for all operations,
  malformed and trust-field input, each validation outcome, 404 detail, fresh
  reads, stale POST after disable, and exact narrow response shapes.
- Playwright: real fixed first-Admin session and browser empty/create/success/
  detail/refresh journey; duplicate name and timezone presentation; intercepted
  loading/error/not-found states; missing-context privacy; keyboard validation
  and focus; desktop/360px overflow and axe scans.
- Regression: booking/Worker/browser focused commands, ESLint/boundary tests,
  production build and Worker graph, then full `pnpm check`; finally
  `markplane sync`, `markplane check`, and `git diff --check`.

## Rollback Plan

Revert the Course domain/Worker/browser slice, boundary-map/docs changes, and
migration 0002 together before deployment. Local/test data is disposable; the
migration is additive and no remote database exists. After any deployment,
keep the additive table and roll application behavior back rather than applying
a destructive down migration.

## Execution State

- Current phase/checkpoint: Phases 1-4 and Markplane closure are complete; the
  reviewed implementation commit remains.
- Completed phase checkboxes: all Phase 1-4 items.
- Next exact action: review and stage the complete task diff, create the
  semantic implementation commit, and verify clean Git.
- Persisted decisions: canonical Course/Admin/timezone/empty-state rules remain
  in product docs; implementation/API/schema/UI choices are recorded above.
- Focused verification: 30 booking-domain Vitest cases pass; focused booking
  source/boundary ESLint passes with zero warnings; 34 Worker/D1 cases pass
  across six files; all 13 boundary-tooling cases pass; no changed file has an
  adjacent `*.docs.md`; clean and upgrade migration paths are covered; both
  production graphs build; all 11 Chromium tests pass across desktop/narrow
  Course and existing Admin/shell journeys with axe and focus evidence. The
  canonical full gate passes on 2026-08-28 with 9 repository-rule, 13 boundary,
  30 booking-domain, 34 Worker/D1, both production-build, and 11 Chromium
  results.
- Remaining verification: implementation commit and clean Git.
- Working tree: the planning checkpoint is committed; task-start metadata,
  Phase 1-3 source/tests/migration/boundary/browser changes, and plan updates
  are uncommitted.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan remains under the repository's 300-line split threshold

## References

- `TASK-ubm2q`, `EPIC-m22qh`, and `NOTE-7gbq2`
- `TASK-dfq2k` / `PLAN-vx3ws`
- `TASK-6tfxd`, `TASK-z6hut`, `TASK-k2ckf`, `TASK-7n2my`, and `TASK-fzniz`
