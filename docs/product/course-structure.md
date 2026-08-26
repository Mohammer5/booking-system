# Course Structure And Lifecycle

## Responsibility

This document owns the containment, scheduling, editing, naming, deletion,
cancellation, and archival rules for Courses, Groups, and Modules.

## Not Responsible For

This document does not define Participant identity or Course access, the
Participant's Module Selection actions, notifications, implementation storage,
or user-interface design.

## Inputs

- Active Admin User actions that create or modify a Course, Group, or Module;
- current Course, Group, Module, and Module Selection state;
- a Module's `startsAt` and `endsAt`; and
- the Course timezone.

## Outputs

- valid Course, Group, and Module state;
- preserved or removed historical references according to usage; and
- the Course-wide Groups and Scheduled Modules eligible for participation.

## Adjacent Parts

Structure follows the [domain model](domain-model.md), receives administrative
authority from [Admin access](admin-access.md), determines eligibility for
[Module participation](module-participation.md), and constrains [Course
access](course-access.md) when a Course is Archived.

## Course Structure

A [Course](../DICTIONARY.md#course) is the permanent container for its Groups,
Modules, Course Assignments, and shared Course Invite. An Active Admin User MAY
create and modify Courses subject to the rules below.

Renaming or changing descriptive Course information MUST NOT change Course
identity or break any relationship. Course names need not be globally unique,
and sophisticated duplicate detection is not a domain rule.

### Course Timezone

Each Course MUST have exactly one
[Course timezone](../DICTIONARY.md#course-timezone). All of its Module dates
and times MUST be defined and interpreted in that timezone. Individual Modules
MUST NOT have separate business timezones. Daylight-saving-time behavior
follows the Course timezone.

An Active Admin User MAY change the timezone while the Course has no Modules.
Once the first Module has been created in the Course, the timezone MUST NOT
change. The product does not reinterpret Module times, migrate schedules, or
automatically reschedule Modules as a consequence of a timezone change.

Displaying an equivalent time in a Participant's local timezone MAY be a
future presentation concern but is not core booking behavior. The initial
product adds no special daylight-saving-time workflow beyond interpreting the
interval in the Course timezone.

## Groups

### Course-Wide Attendance Choices

A [Group](../DICTIONARY.md#group) is a Course-wide attendance option. Every
Active Group is available to every otherwise eligible future Scheduled Module
in its Course. The initial model MUST NOT make a Group available for only
selected Modules.

An Active Admin User MAY create a Group within exactly one Course. The Group
remains permanently owned by that Course.

A Group MAY contain Course-wide logistical details such as a physical
location, room, meeting link, access instructions, or other human-readable
information. Names and details express distinctions such as `Room A`, `Room B`,
or `Remote`; these labels MUST NOT imply special business types or behavior.

For example:

- `Room A` may have details `Building B, second floor, room 201`.
- `Remote` may have details `Join using the provided meeting link`.

### Course-Wide Details Limitation

Group identity and logistical details MUST be Course-wide, not Module-specific.
The initial model therefore does not express:

- one Group using different rooms for different Modules;
- one Group using a different meeting link for each Module; or
- one Group existing for one Module but not another.

If a concrete future requirement needs such behavior, the domain relationship
must be reconsidered explicitly. Ad hoc Module-specific exceptions MUST NOT be
added to this model.

### Editing And Naming

An Active Admin User MAY change a Group's name or details. The edit MUST
preserve Group identity and existing Module Selections. If `Online` is renamed
to `Remote`, Participants previously selected into that Group are shown with
the new name.

Active Groups in one Course MUST remain distinguishable to Participants. Group
names SHOULD therefore be unique within the Course. Names are not domain
identity.

### Course Ownership

A Group belongs permanently to exactly one Course and MUST NOT be moved to
another. A Group created in the wrong Course must be deleted or Archived as its
usage permits and recreated in the correct Course.

### Deletion And Archival

- An Active Admin User MAY delete or Archive a Group only under the conditions
  below.
- A Group that has never been referenced by a Module Selection MAY be
  permanently deleted.
- A Group with meaningful historical participation MUST NOT be hard-deleted in
  a way that destroys that history. It SHOULD be Archived, and historical
  Module Selections MAY continue to identify it.
- A Group with active future Module Selections MUST NOT be Archived until those
  selections no longer reference it. The Group MUST NOT simply disappear and
  Participants MUST NOT be silently moved to another Group.

Future references must be resolved through an allowed Participant or
Admin-assisted Selection action, or through the Module lifecycle rules, before
the Group is Archived. Admin-assisted Selection actions follow the same
eligibility and `startsAt` deadline defined in [Module
participation](module-participation.md#admin-assisted-booking).

### No Capacity

Groups have no capacity. The domain MUST NOT introduce maximum sizes, full
Groups, overbooking prevention, waiting lists, reservations, capacity locks,
fairness rules, or fallback Groups. Selecting a Group remains the choice of one
value rather than a reservation competition.

## Modules

### Scheduling

A [Module](../DICTIONARY.md#module) is exactly one non-recurring scheduled
occurrence in a Course. An Active Admin User MAY add a Module to an existing
Active Course, including after Participants have joined or earlier Modules
have occurred.

Every Module has a `startsAt` and `endsAt`, both interpreted in the Course
timezone, and MUST satisfy `endsAt > startsAt`.

Adding a Module MUST NOT automatically create Module Selections. It becomes
available for eligible Participants under the normal selection rules.

A Scheduled Module's upcoming, started, or ended position is derived from its
`startsAt` and `endsAt`. At the exact `startsAt` instant, it has started. These
temporal descriptions MUST NOT become additional lifecycle states. Recurring
Modules are not supported, and duration is not a separate domain concept.

### Editing

An Active Admin User MAY change a Module's title or name, description, and
instructions where the product rules otherwise permit those edits.

- Descriptive edits MUST NOT affect existing Module Selections.
- Before `startsAt`, an Active Admin User MAY change `startsAt`, `endsAt`, or
  both, provided the resulting interval satisfies all normal validity rules.
- An allowed schedule edit MUST preserve the Module's identity and existing
  Module Selections.
- Participant eligibility to modify a Selection MUST immediately follow the
  edited `startsAt`.
- At or after `startsAt`, the Module schedule MUST NOT change: neither
  `startsAt` nor `endsAt` may be edited.
- The booking domain does not require a history of every previous schedule.

For example, before a Module starts, changing its interval from
`Monday 10:00–11:00` to `Tuesday 15:00–16:30` leaves every existing Group
selection attached to that same Module. Once a Module reaches its then-current
`startsAt`, its schedule cannot be changed, including to move it back into the
future.

### Course Ownership

A Module belongs permanently to exactly one Course and MUST NOT be moved to
another. A Module created in the wrong Course must be removed or Cancelled in
accordance with its usage and recreated in the intended Course.

### Deletion And Cancellation

- An Active Admin User MAY delete or Cancel a Module only under the conditions
  below.
- A Module that has never had Module Selections and has no meaningful
  participation history MAY be permanently deleted.
- A Module that has or had Module Selections MUST NOT be hard-deleted in a way
  that destroys their historical meaning. It SHOULD be Cancelled.

A Cancelled Module MUST remain historically identifiable, MUST NOT accept new
Module Selections, MUST NOT be modifiable by Participants, and MUST be shown as
Cancelled wherever historical context is shown. Cancellation MUST NOT delete
existing Module Selections merely because the Module was Cancelled. Those
Selections remain historical records but no longer represent active or live
bookings. This derived distinction requires no cancelled-booking state or
additional Module lifecycle state.

## Course Lifecycle

The complete Course lifecycle is Active or Archived.

### Active Course

Subject to all other eligibility rules, an Active Course MAY receive
Participants, have a usable Invite, contain future Modules, and allow Module
Selections.

### No Permanent Deletion

An Active Admin User MUST NOT permanently delete a Course, including an unused
or accidentally created Course. Archival is the only Course removal mechanism
and preserves the Course and its history.

### Archival

An Active Course MAY contain Scheduled Modules that have not yet ended and
their live Module Selections during normal operation. The Course MUST NOT
transition to Archived while it contains any Scheduled Module whose `endsAt`
is still in the future.

The blocker includes both:

- an upcoming Scheduled Module where `now < startsAt < endsAt`; and
- an in-progress Scheduled Module where `startsAt <= now < endsAt`.

At the exact `endsAt` instant, the Scheduled Module has ended and no longer
blocks Course archival on temporal grounds. An ended Scheduled Module does not
block archival merely because it and its historical Selections still exist.
These positions remain derived temporal descriptions; no InProgress Module
lifecycle state is introduced.

Before archival, every Scheduled Module that has not yet ended MUST be resolved
under the existing Module lifecycle rules. It may reach `endsAt`, or an Active
Admin User MAY explicitly Cancel it where the normal cancellation rules permit,
including when it is upcoming or in progress. Cancellation preserves the
Module and its Module Selections as historical records, makes those Selections
no longer live bookings, and removes the archival blocker even when the
Module's original `endsAt` remains in the future. Merely removing every
Selection does not resolve a not-yet-ended Scheduled Module.

Archival itself MUST NOT Cancel a Module, delete or otherwise mutate Module
Selections, or move Participants between Groups. The lifecycle preconditions
MUST be satisfied before the Course changes state; no additional Course
lifecycle state is introduced.

Only after these preconditions are satisfied MAY an Active Admin User Archive
the Course. Once the Course is Archived, its state MUST:

- prevent new Participants from joining;
- prevent creation of new Course Assignments;
- make the shared Invite unusable;
- prevent new Module Selections;
- prevent Participant modification of Module Selections; and
- preserve historical context.

An Archived Course MUST remain visible and manageable to Active Admin Users. It
MUST NOT return to Active state, and the product has no restore, unarchive, or
equivalent Course action.
