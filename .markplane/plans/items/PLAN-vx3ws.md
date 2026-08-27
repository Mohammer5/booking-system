---
id: PLAN-vx3ws
title: Responsive application shells and interaction states
status: done
implements:
- TASK-dfq2k
related: []
created: 2026-08-27
updated: 2026-08-28
---

# Responsive Application Shells And Interaction States Implementation Plan

## Overview

Implement `TASK-dfq2k` as a browser-only foundation: keep `/admin` behavior
inside a responsive MUI shell, add the read-only Participant entry at `/`, and
exercise the real interaction states justified by those contexts. The shell
owns landmarks, navigation, responsive layout, and route titles. React Hook
Form and TanStack Query retain the existing form and server-state ownership.

The Participant entry deliberately performs no request. It presents a German
empty/unavailable state and safe navigation, so entry cannot create a
Participant, Course Assignment, session role, or expose Course data. Moving to
`/admin` reuses the same browser cookie and Better Auth principal.

## Ground Truth

- `TASK-dfq2k` — six acceptance criteria, exact routes, exclusions, and
  required browser/accessibility evidence.
- `NOTE-7gbq2` — task ownership for normal empty/partial states, same-origin
  routing, and the shared browser-state contract.
- `TASK-ic4fu` / `PLAN-586hh` — implemented theme, direct-MUI rule, Admin
  behavior to preserve, and verified accessibility/runtime baseline.
- `apps/booking-system-web/src/browser/BrowserApplication.jsx:1-17` — current
  `/admin`-only route tree and wildcard redirect.
- `apps/booking-system-web/src/main.jsx:1-33` — browser composition and current
  Admin-only title/i18n naming.
- `apps/booking-system-web/src/browser/applicationTheme.js:1-52` — accepted
  spacing, breakpoints, surfaces, and focus treatment.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdminBootstrapPage.jsx:24-233`
  — existing loading, status, error, refusal, and page states.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdminRegistrationForm.jsx:12-92`
  — React Hook Form validation and localized refusal.
- `apps/booking-system-web/src/browser/admin-bootstrap/AdminSignOutButton.jsx:12-42`
  — the existing session-ending action that justifies confirmation.
- `apps/booking-system-web/src/browser/admin-bootstrap/useAdminBootstrap.js:16-57`
  — TanStack query/mutation/invalidation ownership to retain.
- `apps/booking-system-web/test/e2e/adminBootstrap.spec.js:7-458` — real
  fixed-session journey and desktop/360px state matrix.
- `apps/booking-system-web/wrangler.jsonc:1-20` and
  `wrangler.non-production.jsonc:1-25` — SPA fallback and Worker-first API.
- `apps/booking-system-web/boundaries.config.mjs:1-66` — existing browser
  permissions; Worker/authentication have no UI edge.
- `apps/booking-system-web/migrations/0001_first_admin_foundation.sql:1-65`
  — authentication/Admin schema only; this task adds no domain table.
- `docs/product/domain-model.md#normal-empty-and-partial-states` — empty states
  require no placeholder data.
- `docs/architecture/browser-conventions.md#routing-and-navigation`,
  `#server-state`, `#forms-and-validation`, `#internationalization`, and
  `#local-ownership-and-late-abstraction` — route, state, copy, and ownership
  rules.
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
  — one principal/session and no selected role.
- `docs/architecture/runtime-and-hosting.md#accepted-deployment-shape` and
  `docs/process/verification.md#browser-tests` — direct SPA navigation and
  Playwright/axe evidence.

## Approach

- Add a browser-owned `application-shell` slice with one
  `ResponsiveApplicationShell` used by both contexts. It owns a skip link,
  banner, named navigation, current-context marker, desktop controls, narrow
  modal drawer, one `main`, and the content container. It is not a UI kit.
- Route `/` to a new `participant-entry` slice and `/admin` to the existing
  slice. Unknown frontend routes return to `/`; drawer/dialog/toast state
  remains local UI state.
- Compose German resources through `createBrowserI18n` while keeping shell,
  Participant, and Admin copy in owning resource modules. The shell sets the
  route-appropriate document title.
- Make Participant entry a direct-MUI, request-free empty/unavailable state.
  `TASK-7uxjj` owns sign-in/onboarding and `TASK-qk47b` owns Course data.
- Fit Admin content into the shell without changing branches, queries,
  mutations, request bodies, outcomes, or form mechanics.
- Turn Admin sign-out into the concrete destructive confirmation. MUI Dialog
  owns modal focus; Escape/Cancel restore the invoker, confirmation ends the
  same session, the resulting entry action receives predictable focus, and a
  localized Snackbar/Alert announces completion. Failure remains focused.
- Use the shell navigation `List` as the real list pattern. Do not add tabular
  placeholder data, a showcase route, generic state wrapper, or `common`/
  design-system layer before a product slice owns that need.
- Leave domain, migrations, Worker/API, Better Auth, fixtures, dependencies,
  and boundary edges unchanged. Existing lower-layer tests remain regressions.

## Acceptance Mapping

| Criterion | Planned implementation/evidence |
| --- | --- |
| Stable responsive shells/routes | Shared shell, exact `/` and `/admin`, unchanged SPA fallback, direct/refresh desktop/360px E2E. |
| One principal; no Participant effects/data | Request-free `/`, same-cookie switch to `/admin`, network assertions, unchanged schema/auth. |
| Concrete states | Existing Admin query/form states, Participant empty/unavailable, navigation List, sign-out Dialog/Snackbar. |
| Semantic Material interaction | AppBar/nav/drawer/content, `aria-current`, named landmarks, text states, axe/keyboard/overflow evidence. |
| Dialog focus | Initial focus, modal Tab containment, Escape/Cancel restoration, predictable post-sign-out focus. |
| Late abstraction | Only the proven two-context shell is shared; slice states/actions remain local. |

## Unchanged Contracts

- Domain operations and outcomes: no `packages/booking` change.
- Persistence/migrations/atomicity: no change; no Participant, Assignment,
  Course, or role record is introduced.
- Worker/authentication: `/api/*`, provider callback, opaque session,
  principal seam, and production fixture exclusion stay unchanged.
- Dependencies/boundaries: current browser permissions suffice; Worker and
  booking build graphs remain MUI-free.

## Non-Goals / Out Of Scope

- No Participant auth/onboarding/profile, Course discovery/access,
  Course/Admin/Invite management, booking, or placeholder product record.
- No role/session claim, API, migration, fixture identity, dependency, MUI X,
  icon/table package, demo route, generic state system, or component wrappers.
- No provider UI automation, remote Cloudflare work, release hardening, or v1
  non-goal.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Share only the route-level shell | Two real contexts prove one stable owner; content remains slice-local. |
| Keep `/` request-free until onboarding | The task requires a shell while forbidding identity/membership creation and premature Course visibility. |
| Use sign-out for dialog/notification evidence | It is a real session action; a demo or invented product mutation is out of scope. |
| Use navigation List, not placeholder data | It proves real list interaction while later slices own real tables. |
| Focus the next entry action after confirmed sign-out | The authenticated invoker no longer exists; safe dismissal still restores it exactly. |

## Phases

### Phase 1: Route, Localization, And Shell

- [x] Add the shared responsive shell and exact route composition.
- [x] Compose shell/Participant/Admin resources and route titles.
- [x] Add the request-free Participant empty/unavailable entry.

**Checkpoint**: both routes render in one accessible shell with no lower-layer
or boundary change.

### Phase 2: Admin Interaction States

- [x] Fit the Admin state machine into the shell without remote-state changes.
- [x] Add sign-out confirmation, notification, and predictable focus.
- [x] Confirm every required pattern has real contextual ownership.

**Checkpoint**: existing Admin behavior remains and the real destructive flow
proves modal focus, dismissal, completion, and notification.

### Phase 3: Focused Evidence

- [x] Extend Playwright for both routes at desktop/360px: direct/refresh,
      landmarks/nav, active context, same-session switching, request-free
      privacy, drawer/dialog keyboard and focus, notification, axe, overflow.
- [x] Update current Admin assertions; run focused lint, boundary/Worker
      regressions, build, Worker-graph audit, and Playwright.

**Checkpoint**: focused acceptance passes without provider UI automation,
credentials, or release infrastructure.

### Phase 4: Documentation And Completion

- [x] Update canonical architecture/status/verification docs and indexes.
- [x] Run adjacent-doc and dictionary coverage passes; change only affected
      existing docs or stable terminology.
- [x] Run `pnpm check`, `markplane sync`, `markplane check`, and
      `git diff --check`; close plan/task/epic before implementation commit.

**Checkpoint**: docs, planning, verification, and Git agree that the task and
`EPIC-566gf` are complete.

## Testing Strategy

- Browser evidence owns the task: a real fixed session for context switching
  and sign-out, with interception only for existing Admin presentation states.
- Existing domain/Worker suites verify unchanged product/API/schema/auth; no
  duplicate lower-layer assertion is added.
- Existing boundary lint plus production build and Worker-output inspection
  prove browser-only dependencies.
- On NixOS, full regression is `nix develop -c corepack pnpm check` using the
  repository-provided workerd and Chromium.

## Rollback Plan

Revert shell, Participant resources/route, Admin dialog/notification, browser
tests, and docs together. No data rollback exists because domain, API,
authentication configuration, schema, migrations, and stored data do not
change.

## Execution State

- Current phase/checkpoint: Phases 1-4 and Markplane closure are complete; the
  final synchronized validation and implementation commit remain.
- Completed phase checkboxes: all Phase 1-4 items.
- Next exact action: stage the reviewed task diff, create the semantic
  implementation commit, and verify the working tree is clean.
- Persisted decisions: canonical docs/task already decide exact routes, one
  session/principal, pre-onboarding privacy, MUI, and late abstraction; the
  source-grounded implementation choices are recorded above.
- Focused verification: the final 8-test Chromium suite passes both routes and
  viewports, axe scans, keyboard/modal focus and restoration, request-free
  Participant entry, and one-session context switching. Focus work exposed
  list semantics and portal-mount timing, resolved with the named MUI list and
  mount-time callback refs. Full lint, all 13 boundary tests, all 17
  Worker/D1/authentication tests, a production build, and the MUI/Emotion-free
  Worker graph audit pass. The canonical `nix develop -c corepack pnpm check`
  passes on 2026-08-28 with 9 repository-rule, 13 boundary, 8 booking-domain,
  17 Worker/D1/authentication, both production-build, and 8 Chromium results.
- Remaining verification: implementation commit and clean Git.
- Working tree: the task start, this execution checkpoint, shell/Participant
  slices, browser composition, and Admin interaction changes are uncommitted;
  no unrelated changes are present.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan stays near the ~200-line guidance (230 lines)

## References

- `TASK-dfq2k`, `EPIC-566gf`, and `NOTE-7gbq2`
- `TASK-ic4fu` / `PLAN-586hh`
- `TASK-ubm2q`, `TASK-7uxjj`, `TASK-k2ckf`, and `TASK-wny83`
