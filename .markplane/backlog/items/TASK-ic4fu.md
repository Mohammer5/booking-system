---
id: TASK-ic4fu
title: Adopt MUI and accessible visual foundation
status: done
priority: high
type: enhancement
effort: medium
epic: EPIC-566gf
plan: PLAN-586hh
depends_on:
- TASK-aeij8
- TASK-t65sy
blocks:
- TASK-dfq2k
related: []
assignee: gerkules
tags:
- ui
- mui
- accessibility
- browser
position: b00
created: 2026-08-27
updated: 2026-08-27
---

# Adopt MUI and accessible visual foundation

## Description

Adopt Material UI as the browser-only component and visual foundation before
new product screens multiply. Establish the application-owned theme and
accessibility-test baseline, then migrate the already implemented `/admin`
Google sign-in, first-Admin bootstrap, current-context, refusal, and sign-out
experience without changing its accepted behavior or HTTP/domain contracts.

The current browser is React 19.2.8 on Vite 8.2.2 and uses native HTML. The
planning-time stable package is `@mui/material` 9.4.0, but implementation must
reverify the current stable compatible release from official MUI guidance and
primary package metadata before pinning it. MUI stays private to browser
source and never becomes booking-domain, Worker, persistence, or
authentication policy.

## Acceptance Criteria

- [x] The application pins the then-current stable compatible free MUI Core
      release and required open-source styling dependencies; its manifest,
      browser-only boundary-map permissions, runtime graph, lockfile, and
      canonical architecture docs agree. No MUI import is permitted from
      `packages/booking`, Worker, persistence, or authentication source.
- [x] One repository-owned theme and `CssBaseline` define cohesive typography,
      spacing, surfaces, responsive breakpoints, and visible focus treatment
      without creating a separate UI/design-system package.
- [x] The existing `/admin` states and transitions remain behaviorally
      unchanged: fixed Google entry, authenticated name form only while
      bootstrap is available, Active/missing/Disabled Admin outcomes,
      localized failures, bootstrap-race handling, and Better Auth sign-out.
- [x] The migrated flow uses familiar Material components and remains fully
      usable at desktop and narrow/mobile viewports with semantic headings,
      labels, accessible names, keyboard operation, predictable focus, and no
      color-only status communication.
- [x] Automated axe-style Playwright scanning is integrated into the local
      browser harness for the migrated critical states, supplemented by
      explicit visible-focus, form-error association, accessible-name, and
      keyboard assertions.
- [x] MUI Core components are used directly where appropriate. No competing
      bespoke design system or generic wrapper around every MUI component is
      introduced; shared abstractions require repeated concrete use and one
      clear owner.

## UI/UX Expectations

Keep `/admin` directly navigable and refresh-safe. Present coherent loading,
authentication failure, validation, unavailable, success, Active Admin, and
sign-out states in German through the existing i18n architecture. Focus moves
to or is announced with the actionable error/result after submission without
trapping keyboard users. The visual result is a foundation for later screens,
not a redesign of product behavior.

## Verification Evidence Required

- Browser/component-focused Vitest only where non-browser presentation logic
  benefits from it; do not duplicate domain assertions.
- Playwright at desktop and narrow/mobile widths for every existing `/admin`
  state, keyboard-only form/sign-out use, focus/error behavior, and automated
  accessibility scans.
- ESLint/boundary tests proving MUI is browser-only, plus production build
  evidence that Worker graphs do not import it.
- Existing Worker/D1/authentication tests remain green and `pnpm check` passes.

## Out Of Scope / Notes

Do not add new Admin, Participant, Course, or booking behavior. MUI X is not
needed by this task. Paid components, a generic component-wrapper layer,
remote Cloudflare work, and provider UI automation remain excluded.
`PLAN-586hh` records the code-grounded implementation and verification path.

The canonical `pnpm check` passed on 2026-08-27 with 9 local-rule tests, 13
boundary tests, 8 booking-domain tests, 17 Worker/D1/authentication tests, the
production Worker/client build, and 3 Chromium tests covering the real journey
plus desktop and 360px state/accessibility matrices. The built Worker output
contains no MUI or Emotion reference.

## References

- `docs/architecture/_decisions.md#use-material-ui-as-the-browser-component-foundation`
- `docs/architecture/browser-conventions.md#material-ui-and-accessible-interaction`
- `docs/architecture/boundaries.md#current-responsibility-modules`
- `docs/process/verification.md#browser-tests`
- `TASK-aeij8`
- `TASK-t65sy`
- https://mui.com/material-ui/getting-started/versions/
- https://mui.com/material-ui/getting-started/installation/
- https://mui.com/material-ui/migration/upgrade-to-v9/
