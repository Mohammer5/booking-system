---
id: PLAN-s3gmg
title: Implementation plan for Extract Course Participant collection and detail navigation
status: draft
implements:
- TASK-5uzbb
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Course Participant collection/detail implementation plan

## Overview

Turn the Assignment list and administrative participation detail into nested
Course Participant resource routes and replace all-Participant radio dialogs
with one server-search picker.

## Ground Truth

- `browser/course-access/CourseMembershipSection.jsx` — embedded Assignment owner.
- `browser/course-access/AdminCourseParticipation{,Detail}Page.jsx` — broad views.
- `browser/course-access/{CourseAssignmentDialog,AdminParticipationParticipantDialog}.jsx`
  — list-all assumptions.
- `worker/course-access/createAdministrativeParticipationPersistence.js` — broad batch.

## Approach

Reuse the shared collection primitives for the paginated Assignment join. Keep
the existing detail read for full Module/Group/Selection context, narrowed to
one target, while retiring the overview. Export/reuse lifecycle dialogs on the
detail. Add an MUI Core searchable dialog list backed by participant-options;
dialog search remains local.

## Non-Goals / Out of Scope

Global Participant creation and API terminology renames are excluded.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Assignment API / Participant browser label | Preserves domain distinction. |
| Detail retains full selection context | Admin-assisted selection needs Modules/Groups. |
| Shared server picker | Both callers must discover beyond directory page 1. |

## Phases

### Phase 1: Routes and collection

- [ ] Add participant collection/detail routes and replace redirects.
- [ ] Render paginated Assignment collection with parent breadcrumbs/actions.
- [ ] Add lifecycle controls and Archived rules on target detail.

**Checkpoint**: nested Participant routes own collection/detail behavior.

### Phase 2: Picker and cleanup

- [ ] Add bounded search hook/component for Assignment and assisted targeting.
- [ ] Remove broad overview structure/list and obsolete hook/endpoint ownership.
- [ ] Update invalidation and Worker/Playwright/axe coverage.

**Checkpoint**: both picker callers use bounded search and old overview is gone.

## Testing Strategy

Worker parent/privacy/options tests; Playwright collection URL state, direct and
assisted actions, beyond-first-page search, redirects, Archived read-only,
keyboard/focus, and axe.

## Rollback Plan

Revert the participant-route commit; compatibility redirects and old overview
are changed in the same conceptual commit to avoid dual owners.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

> **Contract source**: PLAN-bs9eh §Cross-Plan Contract: Collection response
