---
id: PLAN-zf23i
title: Implementation plan for Normalize top-level Admin collection views
status: done
implements:
- TASK-3mi4s
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Top-level Admin collection views implementation plan

## Overview

Build a focused `browser/admin-collections` abstraction and apply it to the four
top-level resource pages without abstracting resource-specific columns/actions.

## Ground Truth

- `browser/course-structure/CourseIndexPage.jsx` — card-only Courses.
- `browser/course-access/ParticipantDirectoryPage.jsx` — card-only Participants.
- `browser/admin-access/AdminUserDirectoryPage.jsx` — partial responsive table.
- `browser/admin-access/AdminInvitePage.jsx` — card-only Invite list/dialogs.
- corresponding `use*.js` hooks — current non-parameterized query keys.

## Approach

Parse/repair owned search parameters from `useSearchParams`, keeping an optional
search draft local until explicit submit. Share heading/filter/pagination and
desktop-table/mobile-list layout; keep field definitions and actions in owning
slices. Query keys use normalized plain collection objects. Mutations invalidate
prefixes rather than patching pages.

## Non-Goals / Out of Scope

Course-owned collections belong to later tasks. No MUI X or generic primitive
wrappers.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Explicit search submit | Avoids per-keystroke history entries. |
| Defaults omitted canonically | Bookmarkable URLs remain concise/deterministic. |
| Prefix invalidation | Mutations can change ordering/filter membership/totals. |

## Phases

### Phase 1: Shared collection browser concept

- [x] Add normalized URL parsing/serialization and repair tests.
- [x] Add filter/search/sort controls and pagination/table-card composition.
- [x] Preserve focus and distinct loading/error/empty/filtered-empty states.

**Checkpoint**: shared URL and rendering behavior has focused unit coverage.

### Phase 2: Four resource owners

- [x] Convert Course and Participant pages/hooks.
- [x] Move Admin User row mutations to detail and convert list state.
- [x] Convert Invite list while retaining transient creation URL/dialog.
- [x] Add route-state, responsive, keyboard, focus, and axe E2E coverage.

**Checkpoint**: all four collections satisfy the common contract and E2E checks.

## Testing Strategy

Vitest for pure URL logic; Playwright for filters/sort/page/pageSize/repair/
history/refresh, state distinctions, responsive renderings, actions, and axe.

## Rollback Plan

Revert this browser commit while server list defaults continue returning the
first default page; dependent Course-owned pages have not yet landed.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

> **Contract source**: PLAN-bs9eh §Cross-Plan Contract: Collection response
