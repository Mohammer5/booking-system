---
id: TASK-t8jzz
title: Complete representative browser and accessibility acceptance
status: backlog
priority: high
type: chore
effort: large
epic: EPIC-hikpy
plan: null
depends_on:
- TASK-h37zt
blocks:
- TASK-6sxq3
related:
- NOTE-7gbq2
assignee: null
tags:
- playwright
- accessibility
- scenarios
- regression
position: a3
created: 2026-08-27
updated: 2026-08-27
---

# Complete representative browser and accessibility acceptance

## Description

Complete the final browser-level and layered regression evidence for every
representative scenario A through AI after all vertical capabilities and
deterministic fixtures exist. This is an acceptance audit and test-composition
task, not a substitute for focused evidence required in each feature task.

## Acceptance Criteria

- [ ] The execution-contract note maps every scenario A through AI and every
      focused product section to a real primary task, and the implemented test
      suite contains appropriate automated evidence for each mapping with no
      silent or duplicate-owner gap.
- [ ] Playwright covers complete Admin and Participant happy paths plus
      critical refusal, lifecycle, stale-action, concurrency-visible,
      privacy, direct-navigation/refresh, and historical-presentation journeys
      against the explicit non-production Worker and fresh isolated D1.
- [ ] Desktop and narrow/mobile acceptance covers all independently navigable
      views and primary actions. German copy, responsive layout, semantic
      landmarks/labels, visible focus, keyboard-only use, dialog focus and
      restoration, and predictable post-mutation focus are asserted.
- [ ] Automated axe-style scans cover every critical route/state; explicit
      behavior assertions remain for accessible names, status announcements,
      keyboard interaction, focus, and non-color-only communication.
- [ ] Exact temporal boundaries and stale actions use injected clocks or
      definite instants, never sleeps. Overlapping Modules remain accepted and
      no excluded capacity/conflict/audit workflow appears.
- [ ] Lower-layer audit confirms domain policy has Vitest, D1/API/atomicity has
      Worker integration evidence, migrations build clean state, boundary
      changes are lint-enforced, and browser journeys are not unit-test-only.
- [ ] The full production build and canonical `pnpm check` pass from clean
      deterministic state without real Google credentials or hosted provider
      UI.

## UI/UX Expectations

Acceptance observes the complete MUI experience rather than introducing a new
test-only UI. Every independently navigable screen has loading, empty,
success, validation, error, unavailable, and destructive-confirmation states
where applicable, uses German-first copy, and remains usable at both required
viewport classes.

## Verification Evidence Required

- A reviewed A–AI traceability report in `NOTE-7gbq2` linked to exact tests and
  primary task IDs.
- Complete Playwright/axe, domain Vitest, Worker/D1/migration, production
  composition, ESLint/boundary, build, and `pnpm check` results.
- Failure artifacts are useful but secret-free; no test contacts Google's
  hosted UI or remote Cloudflare infrastructure.

## Out Of Scope / Notes

Do not implement missing product behavior opportunistically under this test
task; reopen/fix the owning unfinished implementation task if the audit finds a
gap. Hosted staging, production, release workflows, and smoke testing remain
`EPIC-ifkev`. Create a fresh implementation plan when selected.

## References

- `docs/product/representative-scenarios.md`
- `docs/product/_index.md`
- `docs/process/verification.md#layered-regression-harness`
- `docs/process/verification.md#browser-tests`
- `docs/process/verification.md#canonical-repository-command`
- `docs/architecture/browser-conventions.md#material-ui-and-accessible-interaction`
- `NOTE-7gbq2`
- `TASK-h37zt`
