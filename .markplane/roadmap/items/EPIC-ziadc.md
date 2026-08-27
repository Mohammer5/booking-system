---
id: EPIC-ziadc
title: Course invites and joining
status: later
priority: medium
started: null
target: null
related:
- EPIC-i2x79
- EPIC-h8fpz
tags:
- course-invite
- onboarding
- membership
created: 2026-08-27
updated: 2026-08-27
---

# Course invites and joining

## Objective

Deliver one reusable shared Course Invite per Course and the safe explicit Join
journey through Google authentication and Participant onboarding. Keep public
visibility minimal, Invite secrets out of third-party/diagnostic surfaces, and
membership acceptance authoritative and idempotent.

## Key Results

- [ ] KR1: Admin Users can create, retrieve/copy, disable/re-enable, and replace
      the current Invite with correct predecessor and archival behavior.
- [ ] KR2: Recognized and unknown Invite routes expose exactly the permitted
      Course-name boundary and no private discovery.
- [ ] KR3: New/existing Participants can safely continue and explicitly Join,
      while revoked/stale/disabled/replaced/Archived attempts create nothing.

## Notes

Course Invites remain distinct from Admin Invites. No expiry, person-specific
link, automatic Join, public catalogue, or remote notification is introduced.
Routine browser tests use fixed sessions and never automate Google's UI.
