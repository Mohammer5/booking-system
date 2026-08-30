---
id: TASK-pi3jc
title: Complete Admin navigation integration and verification
status: draft
priority: high
type: chore
effort: large
epic: EPIC-ruijc
plan: PLAN-p5vch
depends_on:
- TASK-x8dax
blocks: []
related: []
assignee: null
tags:
- tests
- docs
- admin
position: aD
created: 2026-08-30
updated: 2026-08-30
---

# Complete Admin navigation integration and verification

## Description

Complete cross-slice cleanup, reconcile canonical current-state and verification
documentation with the implemented Admin information architecture, remove
superseded tests/surfaces, and run the complete repository acceptance gate.

Affected surfaces include all new/changed browser and Worker tests, E2E fixture
data, translations, route inventories, architecture/process/root status and
indexes, Markplane state, and final repository verification.

## Acceptance Criteria

- [ ] All required routes, seven collection behaviors, redirects, responsive
      navigation/rendering, breadcrumbs, detail/create/lifecycle flows, and
      representative accessibility states have non-duplicated regression
      coverage.
- [ ] Deterministic browser data exercises more than one page and proves picker
      discovery beyond the first page without weakening fixture isolation.
- [ ] Old embedded-route assertions, obsolete endpoints/hooks/translations, and
      duplicate management implementations are removed.
- [ ] Canonical docs/status/index/README route inventories describe actual code,
      and a dictionary coverage pass is complete.
- [ ] `markplane sync`, `markplane check`, and `corepack pnpm check` all pass
      without skips, suppressions, weakened tests, or ignored failures.
- [ ] Every epic task is completed only after its acceptance criteria pass and
      has one semantic task-ID commit; the epic is complete and the worktree is
      clean.

## Testing Requirements

Run focused affected suites during cleanup, then the exact full commands from
`.instructions/0001.md`; record every result for the completion report.

## Out Of Scope

Do not implement release hardening, remote Cloudflare resources, new product
lifecycles, a second component library, or a separate architecture checker.

## References

- `.instructions/0001.md#17-tests`
- `.instructions/0001.md#19-verification-and-commits`
- `docs/process/verification.md`
