---
id: PLAN-wyqpk
title: Implementation plan for Define Admin collection and detail conventions
status: done
implements:
- TASK-ix2jk
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Define Admin collection and detail conventions implementation plan

## Overview

Reconcile canonical architecture/process documentation with the accepted Admin
resource convention before implementation begins, replacing rather than layering
over the embedded Course-detail convention.

## Ground Truth

- `.instructions/0001.md` — authoritative accepted information architecture.
- `docs/architecture/browser-conventions.md` — conflicting route/view ownership.
- `docs/architecture/applications.md` — current route and HTTP inventories.
- `docs/process/verification.md` — required evidence ownership.
- `docs/product/{domain-model,course-access,course-structure,admin-access}.md`
  — invariants that must remain implementation agnostic.

## Approach

Update the owning architecture decision first, then focused mechanism docs,
status/inventory docs, verification policy, and routing indexes. Search the docs
for every superseded embedded-ownership statement. Finish with dictionary
coverage; introduce no new canonical term unless the changed docs truly require
one.

## Non-Goals / Out of Scope

Implementation and tests belong to the dependent tasks. Product lifecycles,
permissions, and security rules are unchanged.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Replace conflicting prose in place | The accepted decision supersedes the old convention. |
| Keep technology out of product docs | Routes/MUI/SQL are architecture mechanics. |
| Reuse current focused docs | No new responsibility needs another global doc. |

## Phases

### Phase 1: Decision and mechanisms

- [x] Add the accepted decision to `_decisions.md`.
- [x] Rewrite browser/application/runtime/persistence/module/boundary mechanics.
- [x] Preserve product invariants while removing conflicting view ownership.

**Checkpoint**: one unambiguous canonical convention exists.

### Phase 2: Status, routing, and evidence

- [x] Update architecture/process/root status and route/evidence inventories.
- [x] Refresh affected `_index.md` summaries and README inventories as needed.
- [x] Search for stale wording and perform dictionary coverage.

**Checkpoint**: routing summaries and current-state docs match the decision.

## Testing Strategy

Focused `rg` contradiction searches, Markdown/link checks available through
repository lint, `markplane check`, and later full `pnpm check`.

## Rollback Plan

Revert this task commit as one documentation decision change before dependent
implementation commits.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `.instructions/0001.md#15-documentation-changes`
