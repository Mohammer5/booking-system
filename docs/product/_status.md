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
[Course](../DICTIONARY.md#course) structure subset, and [Participant
onboarding](../DICTIONARY.md#participant-onboarding). An Active Admin User can
create an Active Course with the canonical minimal fields, add Course-wide
[Groups](../DICTIONARY.md#group) whose Active names are normalized and unique,
add future Scheduled [Modules](../DICTIONARY.md#module) through the Course
timezone's DST rules, and inspect all three through the Course index and stable
detail route. A new authenticated principal can explicitly supply the required
booking-system Participant name and unique email, become one Active
[Participant](../DICTIONARY.md#participant), return to the Participant home,
and see the valid zero-Assignment state without public Course discovery.
Course, Group, and Module editing or lifecycle operations; Course Assignment,
Course access, Module Selection, Invite, Participant profile/lifecycle, later
Admin onboarding, and Admin management behavior remain unimplemented.
Technology, persistence, API, frontend, and infrastructure mechanics remain
outside this product specification and do not alter its contracts.
