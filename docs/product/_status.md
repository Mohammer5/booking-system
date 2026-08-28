# Product Status

The booking-system product specification is accepted repository truth. The
first-release product-contract gaps addressed by the current gap-closing pass
are resolved: the focused specifications now define Participant registration,
profile and global access state; Admin User and Super Admin lifecycle;
invitation behavior; Course, Group, and Module data and lifecycle contracts;
timezone semantics; Module Selection history; and stale-action handling.

Participant hard deletion is explicitly unsupported in v1. Identity linking,
identity transfer, and automatic merging across distinct external
authentication principals are explicitly outside v1. Complete Participant,
Admin User, and booking change audit histories are also outside v1. These are
accepted scope boundaries, not unresolved product questions.

The first bootstrap-created Admin User receives Super Admin authority, and an
Active Super Admin may promote an Active ordinary Admin User. Multiple Super
Admins may coexist; Super Admin demotion and a dedicated transfer or succession
workflow are not supported in v1.

No known unresolved product-contract question from this gap-closing pass
remains. A future requirement may deliberately change or extend the contract,
but implementation planning does not need to invent behavior for the cases
covered here.

This product area remains the implementation-agnostic source of product truth.
The repository now implements the first Admin bootstrap subset, the first
[Course](../DICTIONARY.md#course) structure subset, [Participant
onboarding](../DICTIONARY.md#participant-onboarding), and direct [Course
Assignment](../DICTIONARY.md#course-assignment), plus Participant-managed
[Module Selection](../DICTIONARY.md#module-selection) and Participant profile
maintenance plus Course Assignment revocation/reactivation. An Active Admin
User can create an Active Course with the canonical minimal fields and edit
its complete name, description, and timezone while it remains Active. The
timezone becomes permanently read-only after the first successful Module
creation, including after every Module is later removed. The Admin can add
Course-wide
[Groups](../DICTIONARY.md#group) whose Active names are normalized and unique,
add future Scheduled [Modules](../DICTIONARY.md#module) through the Course
timezone's DST rules, discover every registered Active or Disabled
[Participant](../DICTIONARY.md#participant), and assign one of them to an
Active Course without creating a Module Selection. The Admin Course detail
shows current Assignment state and permits exact current lifecycle actions,
while the independent Participant directory still includes zero-Assignment
Participants. Revocation in an Active or Archived Course removes future
Scheduled-Module Selections, retains begun Scheduled and Cancelled-Module
Selections, and immediately removes Participant access. Active-Course
reactivation reuses the stable Assignment without restoring removed choices.
An Active Admin User can also Disable an Active Participant or Re-enable a
Disabled Participant from stable Participant administration. Disable removes
only future Scheduled-Module Selections across every Course in one atomic
outcome, retains exact-start/begun/ended Scheduled and all Cancelled history,
preserves every Assignment and any same-principal Admin User, and immediately
removes all normal Participant access. Re-enable reuses the Participant,
preserves Assignment states, restores only currently eligible access, and
does not restore removed choices.
A new authenticated principal can
explicitly supply the required booking-system Participant name and unique
email, become one Active Participant, return to the Participant home, and see
the valid zero-Assignment state without public Course discovery. An Active
Participant now sees exactly the Active Courses reached through their own
Active Assignments and may open a stable private detail containing relevant
Course information, Modules, Active Groups, and only their own current or
historical Module Selection. Before a Scheduled Module starts, the Participant
may explicitly select or change to an Active same-Course Group, or remove the
Selection; overlapping Modules remain independent and no Group is selected by
default. Unknown, inactive, unassigned, Revoked, stale, and cross-Participant
Course identifiers reveal no Course data. An Active Participant may edit their
own required name/email, while an Active Admin User may edit an Active or
Disabled Participant from a stable detail; both preserve identity, lifecycle,
relationships, provider data, and any same-principal Admin User. Group and
Module editing or lifecycle operations; Course lifecycle operations;
Admin-assisted Module Selection,
Archived-Course historical access, Invite, later Admin onboarding, and later
Admin management
behavior remain unimplemented. Technology, persistence, API,
frontend, and infrastructure mechanics remain outside this product
specification and do not alter its contracts.
