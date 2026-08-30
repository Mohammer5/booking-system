---
id: PLAN-jataz
title: Implementation plan for Reduce Course detail to data and relationship summaries
status: draft
implements:
- TASK-x8dax
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Focused Course detail implementation plan

## Overview

Make Course detail a true parent detail with three linked retained counts and no
full child resource collections.

## Ground Truth

- `browser/course-structure/CourseDetailPage.jsx` — embedded current composition.
- `worker/course-structure/courseHttpContract.js` — current arrays/capabilities.
- `worker/course-structure/createCourseHttpHandler.js` — current three-read detail.
- migrations `0003` and `0005` — retained Group/Module/Assignment state.

## Approach

Use the server counts already added in the listing-contract task, render one
breadcrumb and three count links, keep edit/invite/archival, and delete obsolete
embedded imports/owners only after nested routes are complete. Compare counts to
unfiltered list pagination totals in E2E.

## Non-Goals / Out of Scope

No product/domain lifecycle or Participant-facing detail changes.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Count all retained rows | Matches stable lifecycle semantics. |
| Server-derived archival flag | Avoids transferring Modules or browser policy. |
| Links instead of previews | Child collections own discovery and actions. |

## Phases

### Phase 1: Focused representation

- [ ] Finalize Course detail response counts/capability.
- [ ] Render Course fields/lifecycle/invite plus linked summaries/breadcrumbs.

**Checkpoint**: Course detail transfers and renders only parent-owned data/counts.

### Phase 2: Cleanup and equality evidence

- [ ] Remove embedded Assignment/Group/Module/broad overview ownership.
- [ ] Remove dead code/translations/hooks while retaining nested-route reuse.
- [ ] Prove lifecycle-inclusive counts and unfiltered total equality.

**Checkpoint**: count equality passes and no embedded child management remains.

## Testing Strategy

Worker counts/archival capability and E2E count links, absence assertions,
Active/Archived route navigation, equality, refresh, responsive, and axe.

## Rollback Plan

Revert the Course-detail commit; nested routes remain independently useful.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

<!-- CROSS-PLAN CONTRACTS: If this plan defines an interface consumed by other plans,
use a `## Cross-Plan Contract: [Name]` section as the canonical definition.
Other plans reference it: > **Contract source**: PLAN-xxxxx §Section Name -->
