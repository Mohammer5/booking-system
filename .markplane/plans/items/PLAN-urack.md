---
id: PLAN-urack
title: Implementation plan for Extract Course Group collection, create, and detail routes
status: draft
implements:
- TASK-g9tdt
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Course Group routes implementation plan

## Overview

Relocate existing Group creation and management into collection/create/detail
route owners with no duplicate embedded implementation.

## Ground Truth

- `browser/course-structure/GroupCreationSection.jsx` — list/create owner.
- `browser/course-structure/GroupManagementCard.jsx` and hooks/dialogs — detail behavior.
- `worker/course-structure/createGroupPersistence.js` — current item/mutation reads.
- `worker/course-structure/createGroupManagementHttp.js` — mutation outcomes.

## Approach

Extract the existing creation form and management content into route pages.
Collection uses the shared URL/table-card contract. Detail fetches one Group plus
parent context and composes unchanged form/dialog state. Creation navigates to
detail with route state for success focus.

## Non-Goals / Out of Scope

No Group top-level navigation or lifecycle changes.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Route-owned existing forms | Preserves validated/focus behavior without duplication. |
| Parent context in list/item response | Avoids unguarded Course lookup. |
| Prefix invalidation | Updates filters, totals, counts, and dependent reads. |

## Phases

### Phase 1: Collection and create

- [ ] Add routes, breadcrumbs, paginated collection, and Active-only create action.
- [ ] Extract creation form into `/groups/new` and navigate to created detail.

**Checkpoint**: Group discovery and creation have stable nested routes.

### Phase 2: Detail and behavior preservation

- [ ] Move edit/lifecycle/delete ownership to item detail.
- [ ] Enforce Archived read-only UI/direct-request handling.
- [ ] Update invalidation and full focused Worker/Playwright/axe evidence.

**Checkpoint**: Group detail preserves every lifecycle/focus rule without duplication.

## Testing Strategy

Existing Group lifecycle/deletion tests migrate to new routes; add list URL,
item privacy, create navigation, Archived read-only, refresh, responsive, and axe.

## Rollback Plan

Revert this conceptual commit; mutations and schema remain unchanged.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

> **Contract source**: PLAN-bs9eh §Cross-Plan Contract: Collection response
