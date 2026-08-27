---
id: EPIC-hikpy
title: Local functional acceptance
status: later
priority: high
started: null
target: null
related:
- EPIC-ifkev
- EPIC-hc9uu
- EPIC-h8fpz
tags:
- acceptance
- testing
- local
created: 2026-08-27
updated: 2026-08-27
---

# Local functional acceptance

## Objective

Prove the complete v1 application from a fresh local D1 database through fixed
non-production identities, layered automated evidence, representative scenarios
A–AI, and reproducible manual real-Google operation. Align final documentation
and gate release hardening without beginning any remote work.

## Key Results

- [ ] KR1: Complete deterministic fixtures and migrations prepare every required
      Admin/Participant journey while production remains structurally unable to
      establish fixture sessions.
- [ ] KR2: Layered tests, Playwright, axe, keyboard/focus, responsive/privacy/
      stale/lifecycle evidence, build, and `pnpm check` cover all A–AI mappings.
- [ ] KR3: Canonical status/setup/verification docs describe the accepted local
      application, all local epics close, and release hardening remains later
      until final local acceptance is done.

## Notes

This epic is the convergence gate, not a place to hide missing feature work.
Gaps return to their owning tasks. Remote Cloudflare resources, deployment
credentials, release workflows, hosted staging tests, production promotion,
and smoke tests remain exclusively in `EPIC-ifkev` after `TASK-6sxq3`.
