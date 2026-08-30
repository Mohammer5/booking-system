---
id: TASK-x8dax
title: Reduce Course detail to data and relationship summaries
status: draft
priority: high
type: enhancement
effort: large
epic: EPIC-ruijc
plan: PLAN-jataz
depends_on:
- TASK-qwrut
blocks:
- TASK-pi3jc
related: []
assignee: null
tags:
- browser
- worker
- course-structure
position: aC
created: 2026-08-30
updated: 2026-08-30
---

# Reduce Course detail to data and relationship summaries

## Description

Reduce Course detail to the Course resource itself: identity/lifecycle,
complete fields and timezone-lock presentation, archival, the singular current
Course Invite, and compact linked retained counts for Participants, Groups, and
Modules. Remove every complete child collection and child mutation surface from
the parent detail.

Affected surfaces include Course detail response/persistence, browser detail,
breadcrumbs and summary links, Course query reconciliation, obsolete embedded
components/imports, and focused Worker/browser tests.

## Acceptance Criteria

- [ ] Course detail returns `counts.participants/groups/modules` with all
      required retained lifecycle states and authoritative archival availability,
      but no Group or Module arrays.
- [ ] Browser Course detail owns only Course data/edit/lifecycle, timezone lock,
      current Invite, and three accessible linked count summaries.
- [ ] Each unfiltered nested collection total equals its Course-detail count,
      including Archived Courses.
- [ ] Assignment collections, Group/Module lists and mutations, and the broad
      participation overview are absent from Course detail.
- [ ] Course mutations invalidate every affected Course collection page and
      detail; nested mutations refresh the corresponding count.
- [ ] Dead imports/components/hooks/endpoints/translations are removed when no
      longer owned anywhere, without removing reusable forms/dialogs.

## Testing Requirements

Worker count/lifecycle/archival tests and Playwright detail/count-link/equality,
absence of embedded lists, Active/Archived behavior, refresh, focus, responsive,
and axe evidence.

## Out Of Scope

Do not change Course product fields, Invite security, archival policy, or
Participant-facing Course detail.

## References

- `.instructions/0001.md#9-course-detail-must-become-a-focused-parent-detail`
- `docs/product/domain-model.md`
