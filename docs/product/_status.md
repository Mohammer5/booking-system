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
[Course](../DICTIONARY.md#course) structure and terminal-archival subset, [Participant
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
An Active Admin User may also edit the complete name/details of an Active or
Archived Group in an Active Course, archive an Active Group when no retained
Selection targets a future Scheduled Module, and reactivate that same identity
subject to current Active-name uniqueness. Archival never removes or rewrites
a Selection. Active Groups remain the only future choice set, while a retained
in-progress or historical Selection continues to present its selected Group's
identity, details, and state.
The Admin may permanently delete an Active or Archived Group only while the
Course remains Active and no currently retained Selection references it.
Upcoming, in-progress, ended, and Cancelled-Module references all block; a
removed or replaced pre-start Selection does not, because no separate complete
past-reference audit exists. Successful deletion changes only the Group row.
An Active Admin User may edit a Module's complete title, description, and
instructions throughout its Scheduled or Cancelled lifetime while the Course
remains Active. Before the current start, a Scheduled Module may also move to
another strictly future Course-local interval using the same DST gap and
explicit-overlap rules as creation. At exact current start or later, and for
every Cancelled Module, both instants remain immutable. Either accepted edit
preserves Module identity and retained Selections; a successful reschedule
makes the new stored `startsAt` the Selection deadline immediately.
An Active Admin User may terminally Cancel an upcoming or in-progress
Scheduled Module in an Active Course while `now < endsAt`. Exact end, ended,
already Cancelled, stale Course, and stale Admin attempts change nothing.
Cancellation preserves Module identity, content, and its immutable original
interval. Every retained Selection row remains stored, immediately presents as
historical with its Participant and Group identity intact, and is unavailable
for creation, replacement, or removal.
The Admin may permanently delete a Scheduled or Cancelled Module in an Active
Course only when no current Selection row references it, independent of
upcoming, in-progress, or ended position. Every retained live or historical
Selection blocks deletion; a removed or replaced pre-start Selection does not.
Success removes only the Module row, preserves all unrelated structure and
participation data, and leaves the Course timezone permanently locked even
after the first, last, or every current Module is gone.
An Active Admin User may terminally archive an Active Course only when every
Scheduled Module has reached exact `endsAt` or later; Cancelled Modules never
block. One guarded state update changes only the Course to Archived and retains
all Course fields, Groups, Modules, Assignments, and Selections unchanged.
Archived Admin detail remains inspectable but removes every Course, Group,
Module, Assignment-add/reactivate, and Selection mutation surface; revocation
of an existing Active Assignment remains available. An Active Participant
with an Active Assignment retains private, directly navigable read-only access
to the Archived Course and only their own historical Selections until that
Assignment is revoked.
A new authenticated principal can
explicitly supply the required booking-system Participant name and unique
email, become one Active Participant, return to the Participant home, and see
the valid zero-Assignment state without public Course discovery. An Active
Participant now sees exactly the Active or Archived Courses reached through
their own Active Assignments and may open a stable private detail containing
relevant Course information, Modules, currently eligible Groups, retained
selected-Group details, and only their own current or historical Module
Selection. Before a Scheduled Module starts in an Active Course, the Participant
may explicitly select or change to an Active same-Course Group, or remove the
Selection; overlapping Modules remain independent and no Group is selected by
default. Unknown, inactive, unassigned, Revoked, stale, and cross-Participant
Course identifiers reveal no Course data. An Active Participant may edit their
own required name/email, while an Active Admin User may edit an Active or
Disabled Participant from a stable detail; both preserve identity, lifecycle,
relationships, provider data, and any same-principal Admin User. An Active
Admin User can inspect retained Course Assignments as Course Participants for
an Active or Archived Course and open one stable Course-scoped Participant
detail. That detail presents identity, Assignment lifecycle, and no/live/
historical Selection meaning from the current lifecycle and definite instant,
including Archived selected-Group details. For an eligible Active target, the
Admin may set, change, or remove a Module Selection; the operation may establish
or reactivate the ordinary Assignment atomically. Bounded private target
discovery may include an Active Participant without an Assignment, while the
Participant experience remains roster- and peer-private. An Active Admin User can now create,
retrieve, copy, disable, re-enable, or permanently replace the one current
shared Course Invite while its Course is Active. Recognized current and
predecessor links reveal only Course name plus available/unavailable meaning;
unknown or malformed links reveal no Course data. Replacement removes the
predecessor's Join authority permanently, while no Invite expires or becomes
person-specific. A recognized Invite now continues through fixed Google
authentication and optional Participant onboarding without creating
membership, then accepts one separate explicit Join. Missing membership is
created once, Active membership repeats successfully, and Disabled
Participants, Revoked Assignments, unavailable Invites, and Archived Courses
are refused without change. Any Active Admin User can now create multiple
independently Active Admin Invites, see and copy each complete URL only in its
successful creation result, list later non-secret creation time and terminal
state, and Revoke an Active Invite regardless of creator. Claimed and Revoked
Invites remain terminal, no Invite expires, and a lost URL is replaced by
Revoking it and creating another. A valid Active Admin Invite now reveals only
registration availability, continues through fixed Google authentication, and
requires an explicit nonblank booking-system name before one atomic final
acceptance creates a fresh ordinary Active Admin User and makes the Invite
Claimed. Opening, authenticating, refreshing, invalid input, abandonment,
existing Active/Disabled Admin principals, terminal state, and competing losers
create nothing and consume nothing. A legitimately deleted principal may
return through a new Invite as a new ordinary identity without restored state
or authority. The complete current Admin User directory now exposes required
name, ordinary or Super Admin authority, and Active or Disabled state. Every
Active Admin may edit their own required booking-system name; ordinary Admins
may edit other ordinary Admins but not Super Admins, while Super Admins may edit
ordinary or Super Admin targets. Authorized edits may retain an Active or
Disabled target, change only the name, and revalidate current actor/target
state and authority at acceptance. An Active Super Admin can now explicitly
promote another Active ordinary Admin
to Super Admin. Promotion changes only authority, creates no identity, admits
multiple Super Admins, is immediately authoritative for the promoted user's
existing session, and is one-way with no demotion action. Ordinary/Disabled
actors, self, Disabled/already-Super targets, and stale concurrent losers
change nothing. An ordinary Active Admin may now Disable, Re-enable, or delete
another ordinary Admin, while an Active Super Admin may manage another
ordinary or Super Admin. No actor may Disable/delete themselves, ordinary
Admins cannot mutate Super Admins, and every accepted Disable/delete leaves an
Active Super Admin. Re-enable preserves identity and authority; deletion
removes only the current Admin identity, so the existing authentication
session loses Admin access and return requires a new Invite/new ordinary
identity. Courses, Groups, Modules, Participants, Assignments, Selections,
Course Invites, Admin Invites, same-principal Participant data, and previously
accepted actions remain unchanged.
Technology, persistence, API,
frontend, and infrastructure mechanics remain outside this product
specification and do not alter its contracts.
