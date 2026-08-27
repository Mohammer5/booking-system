---
id: TASK-ubm2q
title: Create and view Courses
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: PLAN-xtvcq
depends_on:
- TASK-aeij8
- TASK-dfq2k
blocks:
- TASK-6tfxd
- TASK-z6hut
- TASK-k2ckf
related: []
assignee: gerkules
tags:
- course
- admin
- ui
position: c10
created: 2026-08-27
updated: 2026-08-28
---

# Create and view Courses

## Description

Allow an Active Admin User to create and subsequently view an Active Course
with the complete canonical minimal data contract. The result provides the
empty Course container needed for later Groups, Modules, Assignments, and
participation without inventing placeholder business objects. Deliver the
capability as a complete Admin browser slice with D1 persistence and an Admin
Course index/detail path, not only as a domain function or endpoint.

## Acceptance Criteria

- [x] An Active Admin User can create and subsequently view a Course with a
      required name that is non-blank after trimming and an optional
      description; Course names need not be unique and are not identity.
- [x] The Course has one valid IANA/TZDB timezone, defaults to
      `Europe/Berlin` when none is chosen, and rejects a fixed UTC offset as a
      timezone substitute.
- [x] A successfully created Course is Active with zero Groups, zero Modules,
      zero Course Assignments, and no Course Invite.
- [x] Creating the Course does not implicitly create any other business
      object.

- [x] Only a freshly resolved Active Admin User may create or inspect Courses;
      unauthenticated, missing, and Disabled Admin contexts are refused, and a
      stale submit after actor disable creates nothing.
- [x] D1 persistence and version-controlled migrations preserve stable Course
      identity, lifecycle state, optional description, and valid timezone;
      concurrent submissions create only their independently accepted Courses.
- [x] The Admin browser provides a directly navigable Course index with a
      truthful empty state, create action, and links to refresh-safe Course
      detail views. A successful create makes the new Course reachable without
      requiring a guessed URL.

## UI/UX Expectations

Use the MUI shell and German i18n for the Course list, empty/loading/error
states, create form, validation, success notification, and detail view. The
form is keyboard-operable, labels and validation errors are programmatically
associated, focus moves predictably after refusal/success, and desktop plus
narrow/mobile layouts keep primary actions usable. Course state is not
communicated by color alone.

## Verification Evidence Required

- Vitest in `packages/booking` for required/non-unique name and initial Course
  outcome rules.
- Worker/D1 tests for clean migration, persistence, authorization, validation,
  stable identity, no implicit records, and stale-actor refusal.
- Playwright for the German Admin index/create/detail journey, empty and error
  states, direct navigation/refresh, keyboard/focus behavior, responsive
  widths, privacy, and an axe-style scan.
- ESLint/boundary checks for any new responsibility edges, production build,
  and full `pnpm check`.

## Out Of Scope / Notes

Course edits and timezone mutation are owned by `TASK-7n2my`; archival is
owned by `TASK-fzniz`. Groups, Modules, Assignments, and Invites are separate
tasks. Create a fresh code-grounded implementation plan when selected.

## References

- `docs/product/domain-model.md#course`
- `docs/product/course-structure.md#course-structure`
- `docs/product/representative-scenarios.md#m-new-course`
- `docs/product/admin-access.md#admin-user-identity`
- `docs/architecture/browser-conventions.md`
- `docs/architecture/persistence.md#migration-contract`
- `docs/process/verification.md#product-and-worker-tests`
- `TASK-dfq2k`
