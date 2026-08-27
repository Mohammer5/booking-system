---
id: PLAN-586hh
title: MUI and accessible visual foundation
status: done
implements:
- TASK-ic4fu
related: []
created: 2026-08-27
updated: 2026-08-27
---

# MUI And Accessible Visual Foundation Implementation Plan

## Overview

Implement `TASK-ic4fu` as a browser-only presentation migration. Pin stable
MUI Core and its supported Emotion styling dependencies, compose one
application-owned theme and `CssBaseline`, migrate every existing `/admin`
state to direct MUI components, and extend Playwright with automated axe,
keyboard, focus, semantic-name, desktop, and narrow/mobile evidence.

The Admin state machine, German copy ownership, Better Auth actions, HTTP
routes/outcomes, booking domain, D1 schema, and Worker composition remain
unchanged. The task adds no new product capability.

## Ground Truth

- `TASK-ic4fu` — six acceptance criteria, UI states, required evidence, and
  explicit MUI X/product/release exclusions.
- `NOTE-7gbq2` — browser-only MUI/accessibility contract and primary evidence
  assignment for this task.
- `apps/booking-system-web/package.json:16-35` — one application manifest,
  locked React 19.2.8, and current Playwright tooling.
- `apps/booking-system-web/boundaries.config.mjs:1-66` — exact browser and
  `main.jsx` third-party allow-lists; Worker/authentication have no UI edge.
- `apps/booking-system-web/src/main.jsx:1-33` — current browser provider
  composition and the correct owner for theme/CSS-baseline composition.
- `apps/booking-system-web/src/browser/AdminBootstrapPage.jsx` equivalent at
  `src/browser/admin-bootstrap/AdminBootstrapPage.jsx:15-177` — complete
  `/admin` loading, technical-error, authentication-failure, first-Admin,
  login, Active, missing-Admin, and Disabled-Admin presentation state machine.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdminRegistrationForm.jsx:11-71`
  — React Hook Form validation and bootstrap refusal mapping.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdministrationContext.jsx:14-44`,
  `GoogleSignInButton.jsx:10-29`, and `AdminSignOutButton.jsx:10-29` — current
  success/context and authentication action semantics.
- `apps/booking-system-web/src/browser/admin-bootstrap/adminBootstrapTranslations.js:1-56`
  — German-first semantic keys; no component-owned user copy.
- `apps/booking-system-web/src/browser/admin-bootstrap/useAdminBootstrap.js:16-57`
  — unchanged query/mutation and bootstrap-race behavior.
- `apps/booking-system-web/test/e2e/adminBootstrap.spec.js:1-128` — real
  fixture-session journey and current browser assertions to preserve/extend.
- `docs/architecture/browser-conventions.md#material-ui-and-accessible-interaction`,
  `docs/architecture/boundaries.md#current-responsibility-modules`, and
  `docs/process/verification.md#browser-tests` — canonical MUI, graph, and
  browser/accessibility contracts.
- Official MUI version/installation guidance plus 2026-08-27 npm metadata —
  stable `@mui/material` 9.4.0 accepts React 19 and uses Emotion by default;
  stable `@axe-core/playwright` is 4.13.0.

## Approach

- Add exact application dependencies: `@mui/material@9.4.0`,
  `@emotion/react@11.14.0`, and `@emotion/styled@11.14.1`; add
  `@axe-core/playwright@4.13.0` as browser-test tooling. Do not add MUI X,
  icons, or a remote font dependency.
- Add `src/browser/applicationTheme.js` as the single theme owner. Use a
  system font stack, explicit palette/surfaces, spacing and breakpoints, and a
  high-contrast `:focus-visible` outline through theme/CssBaseline styling.
- In `src/main.jsx`, compose `ThemeProvider` and `CssBaseline` around the
  existing i18n/query/router application. Permit only `@mui/material` and
  `@mui/material/styles` in the browser module/composition entries that import
  them; keep Worker and authentication allow-lists unchanged.
- Use MUI Core directly in the existing vertical slice: `Container`, `Paper`,
  `Stack`, `Typography`, `Alert`, `Button`, `TextField`, `CircularProgress`,
  and semantic HTML component props. Do not add a UI package or wrapper layer.
- Preserve the state branches and machine-readable outcome mapping. Keep the
  current route, queries, mutations, redirects, API bodies, and German
  translation keys; add keys only for accessible progress/status labeling if
  a rendered element requires them.
- Move focus to mutation failure/success feedback using local refs/effects,
  retain live-region semantics, let React Hook Form focus the invalid name
  field, and make error/help association explicit through the MUI field.
- Extend the existing real-session E2E journey and add focused presentation
  cases for loading/error/refusal states. Exercise desktop and 360px-wide
  layouts, direct navigation/refresh, Tab/Enter operation, visible focus,
  form-error association, accessible names, result focus, and axe scans.
- Update canonical architecture/status/boundary/runtime/verification docs from
  “accepted but absent” to the exact implemented browser-only foundation.
  Run the dictionary coverage pass; no terminology change is expected.

## Acceptance Mapping

| Criterion | Planned implementation/evidence |
| --- | --- |
| Stable free dependencies and browser-only graph | Manifest/lockfile, exact boundary entries, lint/boundary tests, production build/runtime graph review. |
| One theme and CssBaseline | `applicationTheme.js` plus `main.jsx` provider composition and browser assertions. |
| Existing behavior unchanged | Existing query/mutation source retained; Worker/D1/auth suites and real-session E2E remain green. |
| Responsive accessible MUI migration | Direct Core components, desktop/360px Playwright, semantic/keyboard/focus assertions. |
| Axe and explicit accessibility baseline | `@axe-core/playwright` scans plus visible-focus, error association, name, and keyboard checks. |
| No competing abstraction | Existing slice files migrate in place; source review and boundary graph contain no UI package/wrapper layer. |

## Unchanged Contracts

- Domain operations/outcomes: no `packages/booking` change.
- Persistence/schema/migrations/atomicity: no change; existing Worker/D1 tests
  remain regression evidence.
- Worker/API routes, request/response/refusal contracts, Better Auth session,
  and fixture identity establishment: no change.
- Browser route remains direct/refresh-safe `/admin`; all server state remains
  TanStack Query-owned and form mechanics remain React Hook Form-owned.

## Non-Goals / Out of Scope

- No Admin, Participant, Course, or booking behavior; no responsive shell from
  blocked `TASK-dfq2k`.
- No MUI X, paid components, icon package, generic component wrappers, design
  system package, Storybook, CSS framework, or additional browser workspace.
- No domain/Worker/authentication/persistence imports of MUI or Emotion.
- No provider UI automation, provider/session changes, schema/migration work,
  remote Cloudflare resources, or release hardening.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Pin MUI 9.4.0 with current stable Emotion releases | Primary npm metadata confirms stable React-19-compatible versions and official installation names Emotion as the default engine. |
| Keep system fonts | Establishes cohesive typography without a new font package or remote request. |
| Theme in browser responsibility, provider at `main.jsx` | One owner and one top-level composition keep styling out of product/Worker concerns. |
| Direct MUI Core usage in existing slice | The task provides no repeated evidence for a wrapper or separate design-system boundary. |
| Add focused Playwright state stubs only for presentation-only states | The real fixture journey continues to prove domain/auth composition; stubs isolate states that have no current product mutation route without inventing one. |

## Phases

### Phase 1: Dependencies, Theme, And Boundaries

- [x] Install/pin MUI, Emotion, and axe dependencies and update the lockfile.
- [x] Add the application theme and compose ThemeProvider/CssBaseline.
- [x] Update exact browser/main boundary permissions and focused enforcement
      evidence; leave Worker/authentication permissions unchanged.

**Checkpoint**: the browser graph builds with one theme and lint proves no MUI
edge enters booking, Worker, persistence, or authentication source.

### Phase 2: Migrate The Existing Admin Experience

- [x] Convert every current `/admin` state/action to familiar direct MUI Core
      components without changing the state machine or remote contracts.
- [x] Add responsive layout, semantic/live-region behavior, visible focus,
      field/error association, and predictable result/error focus.

**Checkpoint**: the existing German flow is behaviorally unchanged and usable
by keyboard at desktop and narrow widths.

### Phase 3: Browser And Accessibility Evidence

- [x] Extend Playwright across current states at desktop and 360px widths.
- [x] Integrate axe scans and explicit keyboard, focus, label/name,
      error-association, direct-navigation, refresh, and overflow assertions.
- [x] Run focused lint/build/Playwright and existing Worker/D1/auth regressions.

**Checkpoint**: focused architecture, runtime, browser, and accessibility
evidence passes without provider UI automation or real credentials.

### Phase 4: Documentation And Completion

- [x] Update canonical architecture/status/boundary/runtime/verification docs
      and complete the dictionary/index coverage review.
- [x] Run `pnpm check`, `markplane sync`, `markplane check`, and
      `git diff --check`; record evidence, close the task/epic state as
      warranted, and commit one semantic implementation change ending in
      `TASK-ic4fu`.

**Checkpoint**: source, dependency graph, docs, plan/task state, verification,
and Git history agree.

## Testing Strategy

- Focused lint/boundary tests: exact MUI imports only in browser/main and no
  Worker/domain/authentication permission changes.
- Production build: proves the browser graph compiles and review of generated
  Worker outputs confirms UI dependencies are absent from Worker chunks.
- Existing Worker/D1/auth tests: unchanged route, authentication, fresh
  authorization, migration, and bootstrap atomicity behavior stays green.
- Playwright real-session journey: first entry, Google initiation failure,
  authenticated name form, validation, successful bootstrap, Active return,
  sign-out, refresh, missing Admin, and bootstrap refusal.
- Playwright presentation/accessibility matrix: loading, technical/auth errors,
  Disabled/missing/Active states, semantic headings/names/live regions, axe,
  Tab/Enter, visible focus, predictable focus movement, and no horizontal
  overflow at desktop and 360px widths.
- Full canonical `pnpm check`, then Markplane and diff validation.

## Rollback Plan

Revert the task commit. No product contract, session behavior, API, D1 state,
or migration changes require data rollback; the prior native-HTML browser and
dependency graph are restored together.

## Execution State

- Current phase/checkpoint: all implementation, documentation, verification,
  and Markplane closure checkpoints are complete.
- Completed phase checkboxes: all Phase 1-4 items.
- Next exact action: create the semantic implementation commit ending in
  `TASK-ic4fu`, verify a clean tree, then rehydrate and select the next task.
- Persisted decisions: canonical MUI/browser/accessibility direction remains
  unchanged; exact stable versions and implementation choices are recorded in
  this plan and will be reflected in canonical docs during Phase 4.
- Focused verification run: 13 boundary tests, migration lint/build, and the
  pre-expansion real-session Playwright journey pass; production Worker output
  remains UI-free. Direct browser preparation outside `nix develop` fails
  because NixOS rejects pnpm's generic workerd, while the Nix shell supplies
  the patched workerd and Chromium. Full lint passes with the expanded suite.
  The first expanded run passed the real journey; both viewport matrices reach
  every preceding state but time out at the final entry-query 500 because
  TanStack Query correctly retries that request and leaves the loading state
  visible during the assertion window. The corrected no-retry current-Admin
  fixture then passes all 3 Playwright tests at both 1280px and 360px, including
  axe, keyboard/focus, field-error, direct/refresh, and overflow assertions.
  Repository tooling tests (9 local-rule + 13 boundary), 8 domain tests, and
  17 Worker/D1/auth tests pass. Production build transforms 617 Worker and
  1083 client modules; an output audit finds no MUI/Emotion marker in the
  Worker graph.
- Canonical docs now record the exact dependency/theme/boundary/runtime and
  axe/explicit accessibility result; architecture/process/root indexes are
  aligned. The dictionary coverage pass found no new or changed stable term,
  so `docs/DICTIONARY.md` remains unchanged.
- Canonical `pnpm check` passes: lint; 9 local-rule, 13 boundary, 8 domain, and
  17 Worker/D1/auth tests; production Worker/client build; and all 3 Chromium
  E2E tests. The build reports its existing client chunk-size warning without
  failing.
- `TASK-ic4fu` is done; epic KR1 and KR3 are checked while KR2 remains for
  `TASK-dfq2k`. `markplane sync`, `markplane check`, and `git diff --check`
  pass after task closure.
- Remaining verification: none before commit.
- Working tree: the complete task source, test, docs, dependency, and Markplane
  changes are uncommitted; no unrelated changes are present.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `TASK-ic4fu`
- `EPIC-566gf`
- `NOTE-7gbq2`
- `TASK-aeij8` / `PLAN-92d7i`
- `TASK-t65sy` / `PLAN-rpau9`
