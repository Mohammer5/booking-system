---
id: TASK-qwe92
title: Add the authenticated Admin navigation layout
status: done
priority: high
type: feature
effort: large
epic: EPIC-ruijc
plan: PLAN-p287x
depends_on:
- TASK-ix2jk
blocks:
- TASK-9gxuv
related: []
assignee: gerkules
tags:
- browser
- admin
- accessibility
position: a6
created: 2026-08-30
updated: 2026-08-30
---

# Add the authenticated Admin navigation layout

## Description

Add one authenticated Admin layout inside the existing application shell. It
must mount only after authoritative Active-Admin resolution, provide exactly the
four resource destinations, preserve identity/self/sign-out affordances outside
the resource list, and integrate desktop navigation with one mobile Drawer while
retaining one main landmark and the existing skip link.

Affected surfaces include `BrowserApplication.jsx`, the Admin gate and context,
the responsive application shell, Admin translations, and focused browser/E2E
coverage.

## Acceptance Criteria

- [x] Active Admin `/admin` navigation redirects with replace semantics to
      `/admin/courses`; every non-Active Admin entry/refusal state stays intact.
- [x] The named Admin resource navigation contains exactly Courses,
      Participants, Admin Users, and Admin Invites and selects the owning item
      for nested routes with `aria-current` and MUI selected styling.
- [x] Desktop navigation is persistent/sticky; narrow navigation uses one
      keyboard-operable Drawer with correct trap, dismissal, and focus return.
- [x] Login, bootstrap, no-Admin, Disabled-Admin, technical-error, and public
      Admin Invite pages never render or flash the Admin resource navigation.
- [x] Admin identity, authority, self-detail, sign-out, bootstrap-success, and
      sign-out-success semantics remain available without becoming resource
      links.
- [x] One page-level main landmark, skip-link behavior, and non-overflowing wide
      content remain verified.

## Testing Requirements

Add focused Playwright coverage for pre-authorization privacy, redirect,
desktop/mobile layout, selected nested items, keyboard traversal, Drawer focus
trap/restoration, announcements, and axe scans.

## Out Of Scope

Do not normalize collection data, add Group/Module sidebar entries, or invent an
Admin dashboard.

## References

- `.instructions/0001.md#3-accepted-admin-information-architecture`
- `.instructions/0001.md#5-authenticated-admin-sidebar-and-responsive-layout`
- `docs/architecture/browser-conventions.md`
