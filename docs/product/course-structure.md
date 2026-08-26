# Course Structure And Lifecycle

## Responsibility

This document owns the data, containment, scheduling, editing, naming,
deletion, cancellation, and archival rules for Courses, Groups, and Modules.

## Not Responsible For

This document does not define Participant identity or Course access, the
Participant's Module Selection actions, notifications, implementation storage,
or user-interface design.

## Inputs

- Active Admin User actions that create or modify a Course, Group, or Module;
- authoritative current Course, Group, Module, and retained Module Selection
  state;
- a Module's `startsAt` and `endsAt` interpreted in the Course timezone; and
- the definite current instant.

## Outputs

- valid Course, Group, and Module data and state;
- preserved or removed structures according to retained references; and
- Course-wide Groups and Scheduled Modules eligible for participation.

## Adjacent Parts

Structure follows the [domain model](domain-model.md), receives administrative
authority from [Admin access](admin-access.md), determines eligibility for
[Module participation](module-participation.md), and constrains [Course
access](course-access.md) when a Course is Archived.

## Course Structure

A [Course](../DICTIONARY.md#course) is the permanent container for its Groups,
Modules, Course Assignments, and current shared Course Invite. It has:

- required `name`;
- optional `description`; and
- required `timezone`.

Course name MUST be non-blank after trimming. Course names are non-unique and
are not domain identity. Editing name or description in an Active Course
preserves Course identity and all relationships.

### New Course State

A newly created Course starts with:

- Active state;
- zero Groups;
- zero Modules;
- zero Course Assignments;
- no Course Invite; and
- `Europe/Berlin` timezone unless the Admin User selects another valid
  timezone.

Creating a Course MUST NOT implicitly create another business object.

### Course Timezone

Each Course has exactly one
[Course timezone](../DICTIONARY.md#course-timezone), represented by a valid
IANA/TZDB timezone identifier such as `Europe/Berlin`. A fixed UTC offset such
as `+01:00` is not a valid substitute. Modules have no separate business
timezone.

An Active Admin User MAY change the timezone only while the Course is Active
and no Module has ever been successfully created in it. Successful creation of
the first Module permanently freezes the Course timezone. Deleting that first
Module, the last remaining Module, or every Module MUST NOT make the timezone
editable again. Course archival also MUST NOT unlock it. The product does not
reinterpret times, migrate schedules, or automatically reschedule Modules
after a timezone change.

Module schedule input is entered or interpreted in the Course timezone but
MUST resolve to definite `startsAt` and `endsAt` instants:

- a local wall-clock time that does not exist during a daylight-saving forward
  transition MUST be rejected rather than shifted; and
- a local wall-clock time that occurs twice during a daylight-saving backward
  transition MUST require explicit selection of the intended occurrence or
  offset.

Once resolved, all comparisons with `now`, `startsAt`, and `endsAt` compare
definite instants. Presentation in another timezone is outside core booking
behavior.

## Groups

### Data Contract And Course-Wide Meaning

A [Group](../DICTIONARY.md#group) has:

- required `name`; and
- optional single free-text `details`.

Group name MUST be non-blank after trimming. Name and details may express
`Room A`, `Remote`, a location, meeting URL, or access instructions, but the
product has no structured room, location, URL, meeting-provider,
physical/remote/hybrid type, or access-instruction subobject.

A Group is permanently owned by exactly one Course and is available
Course-wide. Every Active Group is available to every otherwise eligible future
Scheduled Module in that Course. Groups MUST NOT be moved between Courses or
made Module-specific.

### Editing And Active Name Uniqueness

While the Course is Active, an Active Admin User MAY edit an Active or Archived
Group's name or details. The edit preserves Group identity and every retained
Selection.

Active Group names MUST be unique within one Course after trimming and
case-insensitive comparison. Two Active Groups therefore cannot differ only by
casing or outer whitespace. Archived Groups MAY share a normalized name with
an Active or another Archived Group. Courses and Modules have no equivalent
name-uniqueness invariant.

An edit to an Active Group MUST preserve the uniqueness rule. An Archived
Group with a conflict may be renamed before reactivation.

### Active And Archived Lifecycle

While the parent Course is Active, the Group lifecycle is:

```text
Active <-> Archived
```

Archival is blocked only when a currently retained Module Selection references
the Group for an upcoming Scheduled Module where `now < startsAt`. Retained
Selections for in-progress or ended Scheduled Modules and Cancelled Modules do
not block Group archival.

Archival MUST NOT remove or rewrite a retained Selection. At or after
`startsAt`, the Selection continues to identify the same Group and expose its
details for current or historical meaning as determined by the surrounding
state. The Archived Group is unavailable for new future Selections.

Reactivation:

- preserves Group identity and details;
- does not restore removed Selections;
- makes the Group eligible for future otherwise valid Selections; and
- MUST satisfy Active Group name uniqueness.

No Group lifecycle mutation is allowed after its Course is Archived.

### Hard Deletion

A Group may be hard-deleted only when:

- its Course is Active; and
- no currently retained Module Selection references it.

Every retained reference blocks deletion, whether associated with an upcoming,
in-progress, ended, or Cancelled Module. A pre-start Selection that was removed
or replaced and no longer exists does not block deletion. The product does not
require a complete change log merely to establish that a Group was once
selected.

### No Capacity

Groups have no capacity. The domain has no maximum sizes, full Groups,
overbooking prevention, waiting lists, reservations, capacity locks, fairness
rules, or fallback Groups.

## Modules

### Data Contract

A [Module](../DICTIONARY.md#module) has:

- required `title`;
- optional `description`;
- optional `instructions`;
- required `startsAt`; and
- required `endsAt`.

Title MUST be non-blank after trimming. Module titles are non-unique and are
not domain identity. A Module belongs permanently to exactly one Course and
MUST NOT be moved.

### Creation And Temporal Meaning

An Active Admin User MAY create a Module only in an Active Course and only when
its definite instants satisfy:

```text
startsAt > now
endsAt > startsAt
```

A new Module therefore begins in the future. Creation MUST NOT automatically
create any Module Selection.

A Scheduled Module's upcoming, in-progress, or ended position is derived from
its interval. At exact `startsAt` it has started; at exact `endsAt` it has
ended. These descriptions are not lifecycle states. Modules do not recur and
duration is not a separate concept.

### Descriptive Edits

While the Course is Active, an Active Admin User MAY edit `title`,
`description`, and `instructions` at any time, including after `startsAt`,
after `endsAt`, and after cancellation. These edits preserve Module identity
and every retained Selection.

### Schedule Edits

A Scheduled Module may be rescheduled only before its current `startsAt`. The
resulting interval MUST satisfy:

```text
newStartsAt > now
newEndsAt > newStartsAt
```

The edit preserves Module identity and retained Selections, and Selection
deadlines immediately follow the new `startsAt`. A reschedule cannot make the
Module already started. At or after its current `startsAt`, both schedule
values are immutable, including an attempt to move the Module back into the
future.

A Cancelled Module's `startsAt` and `endsAt` are immutable. An Archived Course
freezes every Module edit regardless of Module or temporal state.

### Cancellation

An Active Admin User MAY Cancel a Scheduled Module only when:

- its Course is Active; and
- `now < endsAt`.

An upcoming or in-progress Module may therefore be Cancelled. At exact
`endsAt`, cancellation is refused. Cancellation is terminal:

```text
Scheduled -> Cancelled
```

There is no uncancel or reactivation workflow. Cancellation preserves all
retained Selections, which become historical, and accepts no new Selection.

### Hard Deletion

A Module may be hard-deleted only when:

- its Course is Active; and
- no currently retained Module Selection references it.

Deletion may therefore be permitted for a never-booked future Module, a Module
whose pre-start Selections were all removed, an ended Module with zero retained
Selections, or a Cancelled Module with zero retained Selections. Every retained
current or historical Selection blocks deletion. The product does not preserve
empty schedule history merely because a Module once existed.

## Course Lifecycle

The complete Course lifecycle is:

```text
Active -> Archived
```

### Active Course

Subject to all other rules, an Active Course may receive Participants, manage
its current Invite, create and modify Groups and Modules, and permit eligible
Module Selections.

### No Hard Deletion Or Reactivation

A Course MUST NOT be hard-deleted, including when unused or created
accidentally. Once Archived, it MUST NOT return to Active.

### Archival Preconditions

An Active Course MUST NOT transition to Archived while it contains a Scheduled
Module where `now < endsAt`. This includes both an upcoming Module and an
in-progress Module. At exact `endsAt`, a Scheduled Module no longer blocks
archival on temporal grounds.

A not-yet-ended Scheduled Module must reach `endsAt` or be explicitly
Cancelled under its normal lifecycle before archival. Removing its Selections
does not resolve the blocker. A Cancelled Module does not block archival merely
because its original `endsAt` is in the future.

Archival itself MUST NOT Cancel a Module, remove or rewrite a Selection, move a
Participant between Groups, or otherwise mutate the retained Course structure.

### Structurally Read-Only Archived Course

After archival, the Course structure is frozen. An Active Admin User may
inspect it but MUST NOT:

- edit Course name, description, or timezone;
- create or delete a Group;
- Archive, reactivate, rename, or edit a Group;
- create or delete a Module;
- Cancel a Module;
- edit Module title, description, instructions, `startsAt`, or `endsAt`;
- enable, disable, regenerate, or replace the current Course Invite;
- create a Course Assignment;
- reactivate a Revoked Course Assignment; or
- perform Participant or Admin-assisted Module Selection mutation.

The current Course Invite is unusable for Join. An Active Admin User MAY still
revoke an existing Active Assignment because that removes access rather than
changing Course structure. An Active Participant with an Active Assignment may
retain the read-only historical access defined in [Course
access](course-access.md#archived-course).

## Authoritative Current State

Every structural edit, timezone change, Group lifecycle or deletion action,
Module creation, reschedule, cancellation or deletion, and Course archival
MUST be validated against authoritative current state and definite instants
when accepted. A stale form cannot preserve an earlier deadline, actor
authority, lifecycle state, uniqueness condition, or retained-reference view.
