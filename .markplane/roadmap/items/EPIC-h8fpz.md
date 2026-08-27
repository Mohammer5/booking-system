---
id: EPIC-h8fpz
title: Administrative participation
status: later
priority: medium
started: null
target: null
related:
- EPIC-ziadc
- EPIC-hikpy
tags:
- admin
- participation
- booking
created: 2026-08-27
updated: 2026-08-27
---

# Administrative participation

## Objective

Give Admin Users complete visibility into Course participation and the accepted
assisted Selection actions. Reuse ordinary Assignment and Selection concepts,
derived history, and the Participant `startsAt` deadline without an Admin-only
override or partial membership side effect.

## Key Results

- [ ] KR1: Admin Course views compose Participants, Assignment state, Modules,
      Groups, and live/historical retained Selections without Participant
      privacy leakage or persisted Selection status.
- [ ] KR2: Eligible assisted set/reselect/replace/remove flows are complete in
      the browser and share Participant deadline/lifecycle rules.
- [ ] KR3: Missing/Revoked Assignment composition is atomic with successful set,
      and every refusal proves no partial Assignment or Selection effect.

## Notes

This epic follows the relevant Participant, Assignment, Group, Module, and
Course lifecycle work so it can present and mutate authoritative final states.
It adds no parallel Admin booking entity, late-booking override, capacity,
attendance, notification, or audit workflow.
