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

This product area contains specifications only. The repository has no product
implementation or application workspace. Accepted technology, persistence,
API, frontend, and infrastructure direction remains outside the product
specification and does not alter its implementation-agnostic behavior.
