---
id: TASK-dfq2k
title: Establish responsive application shells and interaction states
status: backlog
priority: high
type: enhancement
effort: medium
epic: EPIC-566gf
plan: PLAN-vx3ws
depends_on:
- TASK-ic4fu
blocks:
- TASK-ubm2q
- TASK-7uxjj
- TASK-k2ckf
- TASK-wny83
related: []
assignee: null
tags:
- ui
- navigation
- responsive
- accessibility
position: b10
created: 2026-08-27
updated: 2026-08-27
---

# Establish responsive application shells and interaction states

## Description

Establish the responsive route-level frame and concrete interaction patterns
that all later Admin and Participant browser slices use. Preserve `/admin` as
the administration entry and add a language-independent Participant entry
route and shell without creating a Participant, Assignment, role selector, or
booking authority merely through navigation or authentication.

This is a cross-cutting browser foundation, not a generic frontend subsystem.
It owns shell/navigation behavior and evidence for repeated UI states while
later vertical tasks own their domain operations and slice-local forms.

## Acceptance Criteria

- [ ] Admin and Participant contexts have responsive MUI application shells,
      stable language-independent entry routes, clear context-appropriate
      navigation, and direct-navigation/refresh behavior through the existing
      same-origin SPA fallback; `/api/*` remains Worker-owned.
- [ ] The Participant entry does not imply a second session or session role:
      it uses the same Better Auth principal, creates no Participant or Course
      membership, and exposes no Course data before later onboarding/access
      tasks authorize it.
- [ ] Concrete, consistently styled patterns exist for loading, empty,
      success/status, validation, technical error, unavailable/refused,
      notification, list/table, form, dialog, and destructive confirmation
      states without duplicating TanStack Query or React Hook Form ownership.
- [ ] Navigation and state patterns work on desktop and narrow/mobile widths,
      use familiar Material interactions, expose semantic landmarks and
      accessible names, retain visible focus, and do not communicate meaning
      by color alone.
- [ ] Dialog and destructive-confirmation behavior moves focus predictably,
      traps it only while modal, supports Escape where safe, and restores focus
      to the invoking control after dismissal or completion.
- [ ] Shared UI abstractions exist only where the two concrete contexts or
      repeated states prove one stable owner; no `common`, generic design
      system, or component-by-component MUI wrapper is added.

## UI/UX Expectations

The participant-facing entry is rooted at `/`; administration remains at
`/admin`. Each context is clearly named in German and usable without guessing
navigation conventions. Empty and unavailable screens still expose the safe
recovery action, such as sign-out or returning to a context entry. Narrow
layouts do not require horizontal viewport scrolling for primary actions.

## Verification Evidence Required

- Playwright direct-navigation and refresh checks for `/` and `/admin` at
  desktop and narrow/mobile widths.
- Automated accessibility scans plus explicit landmark, navigation-name,
  tab-order, visible-focus, dialog-focus, Escape, and focus-restoration
  assertions for the shell patterns.
- Boundary/lint and production-build evidence that the foundation remains in
  browser source and preserves separate browser and Worker graphs.
- `pnpm check` passes.

## Out Of Scope / Notes

Participant onboarding, Course discovery, Admin management, and booking
operations remain in their vertical tasks. Do not add placeholder product
records or a role value to authentication state. Create a fresh implementation
plan when selected.

## References

- `docs/architecture/browser-conventions.md#routing-and-navigation`
- `docs/architecture/browser-conventions.md#material-ui-and-accessible-interaction`
- `docs/architecture/authentication-and-sessions.md#one-session-contextual-domain-resolution`
- `docs/architecture/runtime-and-hosting.md#accepted-deployment-shape`
- `docs/process/verification.md#browser-tests`
- `TASK-ic4fu`
