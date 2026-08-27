---
id: EPIC-566gf
title: Accessible application experience
status: done
priority: high
started: null
target: null
related:
- EPIC-m22qh
tags:
- ui
- mui
- accessibility
created: 2026-08-27
updated: 2026-08-28
---

# Accessible application experience

## Objective

Establish the cohesive, responsive, accessible browser foundation that every
remaining product slice builds on. Adopt MUI inside the browser responsibility,
migrate the existing Admin entry without behavior change, and provide
route-level Admin/Participant shells plus evidence-backed interaction states.

## Key Results

- [x] KR1: Free MUI Core, one application-owned theme, and explicit browser-only
      import boundaries replace the current unthemed Admin presentation.
- [x] KR2: Admin and Participant contexts have responsive, directly navigable
      shells and consistent German loading/empty/success/error/unavailable/
      destructive states without a generic design-system layer.
- [x] KR3: Automated accessibility scans plus explicit keyboard, focus,
      semantic-name, desktop, and narrow/mobile evidence pass in `pnpm check`.

## Notes

This is the first implementation epic after the completed application and
Google-authentication foundation. `TASK-ic4fu` delivered the browser-private
MUI theme and accessibility baseline, and `TASK-dfq2k` delivered the shared
responsive shell and evidenced interaction states. No paid MUI component or
remote infrastructure was introduced by this epic.
