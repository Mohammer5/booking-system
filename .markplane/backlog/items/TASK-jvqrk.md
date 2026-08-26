---
id: TASK-jvqrk
title: Manage Participant Module Selections
status: backlog
priority: medium
type: feature
effort: medium
epic: EPIC-m22qh
plan: null
depends_on:
- TASK-qk47b
blocks: []
related: []
assignee: null
tags: []
position: a6
created: 2026-08-27
updated: 2026-08-27
---

# Manage Participant Module Selections

## Description

Allow an eligible Participant to explicitly choose, change, or remove their
own Group choice for a future Scheduled Module. Completing this capability
proves that Course Assignment answers membership while Module Selection
independently records whether and how the Participant intends to participate.

## Acceptance Criteria

- [ ] For one Participant and Module, exactly zero or one Module Selection
      exists; no Selection means non-participation and Course membership never
      creates one implicitly.
- [ ] The Participant explicitly chooses the Group; the system does not choose
      a default, preferred, previous, or first available Group.
- [ ] Creating or changing a Selection requires an Active Participant, Active
      Course Assignment, Active Course, Active Group, and Scheduled Module
      where `now < startsAt`, with the selected Group and Module belonging to
      the same Course.
- [ ] Selecting the already-selected Group is an idempotent successful no-op,
      while choosing another eligible Group replaces the existing Selection
      and leaves exactly the new current choice.
- [ ] Eligible pre-start removal leaves no Selection and therefore records
      non-participation.
- [ ] Replaced or removed pre-start values are not retained merely as audit
      history or represented by a cancelled-booking state.
- [ ] Creation, replacement, and removal stop at exact `startsAt`; every
      mutation is validated against authoritative current state so a stale
      action cannot bypass current eligibility or the deadline.

## Notes

Admin-assisted booking and all deferred lifecycle operations remain outside
this task.

## References

- `docs/product/domain-model.md#module-selection`
- `docs/product/domain-model.md#selection-validity-and-history`
- `docs/product/module-participation.md#participation-state`
- `docs/product/module-participation.md#participant-booking-eligibility`
- `docs/product/module-participation.md#changing-the-selected-group`
- `docs/product/module-participation.md#removing-participation`
- `docs/product/module-participation.md#startsat-deadline`
- `docs/product/module-participation.md#concurrent-and-stale-changes`
