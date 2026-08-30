---
id: PLAN-p5vch
title: Implementation plan for Complete Admin navigation integration and verification
status: draft
implements:
- TASK-pi3jc
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Admin navigation integration and verification implementation plan

## Overview

Close gaps across slices, remove superseded evidence/implementation, update
current-state documentation, and run the complete repository gate.

## Ground Truth

- `test/e2e/*.spec.js` — existing 63-test behavior inventory and old route assertions.
- `test/prepareE2eState.js` and fixture-session composition — isolated setup.
- `docs/process/verification.md` — layered evidence contract.
- root `package.json` — canonical `check` composition.

## Approach

Audit each requirement against focused Worker and E2E ownership, migrate old
tests instead of duplicating conventions, seed page-spanning deterministic data
through existing non-production mechanisms, update status/route/test inventories,
then run focused-to-full verification and finish Markplane/commits.

## Non-Goals / Out of Scope

Remote deployment, release hardening, new product features, and broad fixture
frameworks remain out of scope.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Migrate old E2E assertions | Avoids two contradictory implementations. |
| Focused lower-layer evidence | E2E does not replace parser/persistence tests. |
| Full gate only after focused suites | Keeps failures local during development. |

## Phases

### Phase 1: Coverage and cleanup audit

- [ ] Map every spec requirement to focused Worker/browser evidence.
- [ ] Add page-spanning fixtures and missing accessibility/focus/history cases.
- [ ] Remove obsolete routes/endpoints/components/translations/tests.

**Checkpoint**: every required behavior has one appropriate non-duplicated owner.

### Phase 2: Truth reconciliation and full acceptance

- [ ] Update docs status/index/README and dictionary coverage.
- [ ] Run `markplane sync`, `markplane check`, focused suites, and `pnpm check`.
- [ ] Complete tasks/epic and verify commit subjects plus clean status.

**Checkpoint**: full verification is green and tracking/history are complete.

## Testing Strategy

Every command named in `.instructions/0001.md`, with no skips/suppressions and
recorded results for the completion report.

## Rollback Plan

Revert only integration cleanup if necessary; prior task commits remain
independently reviewable and tracked.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

<!-- CROSS-PLAN CONTRACTS: If this plan defines an interface consumed by other plans,
use a `## Cross-Plan Contract: [Name]` section as the canonical definition.
Other plans reference it: > **Contract source**: PLAN-xxxxx §Section Name -->
