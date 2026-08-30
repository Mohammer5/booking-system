---
id: TASK-6tfxd
title: Create Groups and future Modules
status: done
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: PLAN-7vmhd
depends_on:
- TASK-ubm2q
blocks:
- TASK-qk47b
- TASK-7n2my
- TASK-2u7z6
related: []
assignee: gerkules
tags:
- group
- module
- scheduling
- ui
position: a4
created: 2026-08-27
updated: 2026-08-28
---

# Create Groups and future Modules

## Description

Allow an Active Admin User to configure enough structure in an Active Course
for Module participation by creating Course-wide Groups and future Scheduled
Modules. Each included creation capability must preserve its complete
canonical contract even though later lifecycle operations remain deferred.
The Admin Course detail must list and create both structures through complete
browser-usable vertical slices backed by D1 and authoritative Worker policy.

## Acceptance Criteria

- [x] An Active Admin User can create an Active, permanently Course-owned
      Group with a required name that is non-blank after trimming and optional
      free-text details.
- [x] Active Group names are unique within the Course after trimming and
      case-insensitive comparison, and each created Group is a Course-wide
      choice rather than Module-specific structure.
- [x] An Active Admin User can create a Scheduled Module in an Active Course
      with a required non-blank title, optional description, optional
      instructions, and definite `startsAt` and `endsAt` instants.
- [x] Module creation succeeds only when `startsAt > now` and
      `endsAt > startsAt`; schedule input uses the Course's IANA/TZDB timezone,
      rejects nonexistent DST local times, and requires explicit
      disambiguation of ambiguous local times.
- [x] The first successfully created Module permanently freezes the Course
      timezone, while refused creation does not claim a successful Module
      outcome.
- [x] Creating a Module does not implicitly create a Module Selection.

- [x] Only a freshly resolved Active Admin User may mutate an Active Course;
      stale actor/Course state, duplicate normalized Group name, invalid local
      time, or failed Module creation leaves no partial Group, Module, or
      timezone-freeze side effect.
- [x] Group and Module identities and their permanent Course ownership are
      enforced in D1, and concurrent normalized Group-name attempts preserve
      one valid Active-name outcome.
- [x] The Admin Course view lists Groups and Modules, exposes their normal
      empty states, and creates them without requiring API-only access.

## UI/UX Expectations

Use German-first MUI forms and list/status patterns. Schedule input clearly
uses the Course timezone, communicates the resolved instant, rejects a
nonexistent wall time, and requires the user to choose the intended occurrence
for an ambiguous wall time. Free MUI X Community date/time components may be
used only if the implementation plan confirms they meet this concrete need;
no Pro/Premium package is allowed. Forms, errors, and success states work by
keyboard with predictable focus at desktop and narrow/mobile widths.

## Verification Evidence Required

- Booking-domain Vitest for Group normalization/uniqueness and deterministic
  timezone/DST/instant rules using an injected clock or definite `now`.
- Worker/D1 tests for migrations, Course ownership, unique/atomic outcomes,
  first-successful-Module timezone freeze, authorization, and no partial
  effects on refusal.
- Playwright for list/create/empty/error journeys, DST gap and overlap input,
  direct Course refresh, responsive widths, keyboard/focus behavior, and
  axe-style accessibility checks.
- Boundary checks for any MUI X/date-library import, production build, and
  full `pnpm check`.

## Out Of Scope / Notes

Group archival, reactivation, and deletion; Module rescheduling, cancellation,
and deletion; Course edits; and Course archival are outside this task. Do not
add capacities, recurring Modules, per-Module Groups, or conflict prevention.
Create a fresh implementation plan when selected.

## References

- `docs/product/domain-model.md#group`
- `docs/product/domain-model.md#module`
- `docs/product/course-structure.md#course-timezone`
- `docs/product/course-structure.md#groups`
- `docs/product/course-structure.md#modules`
- `docs/product/representative-scenarios.md#n-course-timezone-and-dst`
- `docs/product/representative-scenarios.md#o-backdated-module-refusal`
- `docs/product/non-goals.md#module-and-group-modeling`
- `docs/architecture/browser-conventions.md#material-ui-and-accessible-interaction`
- `docs/architecture/persistence.md#migration-contract`
- `docs/process/verification.md`
