---
id: PLAN-p287x
title: Implementation plan for Add the authenticated Admin navigation layout
status: draft
implements:
- TASK-qwe92
related: []
created: 2026-08-30
updated: 2026-08-30
---

# Authenticated Admin navigation layout implementation plan

## Overview

Place one resource-navigation layout inside the existing Active-Admin gate and
inside the shared shell's single main landmark.

## Ground Truth

- `src/browser/BrowserApplication.jsx` — nested route ownership.
- `src/browser/admin-bootstrap/AdminBootstrapPage.jsx` — authoritative gate.
- `src/browser/application-shell/ResponsiveApplicationShell.jsx` — existing
  skip link, main, context Drawer, and header.
- `src/browser/admin-bootstrap/AdministrationContext.jsx` — current identity,
  sign-out, and obsolete Admin landing links.

## Approach

Render an `AdminApplicationLayout` only in `ActiveAdminOutlet`, passing current
Admin/sign-out/bootstrap-success context through its nested Outlet. Keep the
Participant/Admin context switch in the header, but consolidate narrow Admin
resource navigation into the same temporary Drawer rather than nesting a second
modal Drawer. Use path-prefix ownership for selected resources.

## Non-Goals / Out of Scope

Collection rendering and child route pages remain dependent tasks.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Active-gate-owned layout | Prevents pre-authorization sidebar flash. |
| One narrow Drawer | Avoids competing focus traps. |
| `/admin` replace redirect | No invented dashboard or history pollution. |

## Phases

### Phase 1: Composition

- [ ] Add the authenticated layout and four-link navigation.
- [ ] Move identity/self/sign-out outside the resource list.
- [ ] Replace the index page with an Active-only redirect while preserving success focus.

**Checkpoint**: the layout is mounted only for a resolved Active Admin.

### Phase 2: Responsive and accessibility verification

- [ ] Integrate desktop sidebar and narrow Drawer with the shared shell.
- [ ] Verify selected nested resources, one main, skip link, focus trap/return.
- [ ] Add German translations and focused Playwright/axe evidence.

**Checkpoint**: desktop and narrow navigation satisfy focus and landmark rules.

## Testing Strategy

Focused application-shell/Admin-bootstrap Playwright tests at desktop and 360px,
keyboard operation, request observation before authorization, and axe.

## Rollback Plan

Revert the layout commit; route content remains independently owned.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

<!-- CROSS-PLAN CONTRACTS: If this plan defines an interface consumed by other plans,
use a `## Cross-Plan Contract: [Name]` section as the canonical definition.
Other plans reference it: > **Contract source**: PLAN-xxxxx §Section Name -->
