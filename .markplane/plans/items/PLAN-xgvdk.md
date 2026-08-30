---
id: PLAN-xgvdk
title: Implementation plan for Extract Course Module collection, create, and detail routes
status: draft
implements:
- TASK-qwrut
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Course Module routes implementation plan

## Overview

Relocate existing Module creation and complete management into stable nested
route owners while retaining definite-time and lifecycle behavior.

## Ground Truth

- `browser/course-structure/ModuleCreation{Section,Form}.jsx` — create/DST behavior.
- `browser/course-structure/ModuleManagementCard.jsx` and edit/schedule/action
  components — detail behavior.
- `worker/course-structure/createModulePersistence.js` and management handlers
  — item/mutation contracts.

## Approach

Extract create form and management content into pages. Collection reuses URL and
responsive primitives while formatting both definite instants in Course
timezone with semantic `time`. Item response supplies server-derived
capabilities; Archived parent suppresses all mutations.

## Non-Goals / Out of Scope

No Module top-level navigation, MUI X dependency, or scheduling-policy change.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse exact forms/dialogs | Preserves DST and focus evidence. |
| Course timezone in collection/item context | Correct semantic presentation. |
| Detail-prefix invalidation | Reconciles participant and count consumers. |

## Phases

### Phase 1: Collection and create

- [ ] Add routes/breadcrumbs and paginated responsive Module collection.
- [ ] Move creation to `/modules/new` and navigate to stable detail.

**Checkpoint**: Module discovery and creation have stable nested routes.

### Phase 2: Detail and lifecycle preservation

- [ ] Move content edit/reschedule/cancel/delete to item detail.
- [ ] Preserve exact-start/elapsed/Cancelled/Archived presentation and focus.
- [ ] Update invalidation and focused Worker/Playwright/axe coverage.

**Checkpoint**: Module detail preserves scheduling/lifecycle/focus rules.

## Testing Strategy

Migrate existing Module create/edit/cancel/delete tests to new routes; add list
URL state, item privacy, create navigation, Archived read-only, refresh, semantic
time, responsive, and axe.

## Rollback Plan

Revert this conceptual commit; mutations, instants, and schema remain unchanged.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

> **Contract source**: PLAN-bs9eh §Cross-Plan Contract: Collection response
