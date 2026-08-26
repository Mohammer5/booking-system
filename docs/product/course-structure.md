# Course Structure And Lifecycle

## Responsibility

This document owns the containment, scheduling, editing, naming, deletion,
cancellation, and archival rules for Courses, Groups, and Modules.

## Not Responsible For

This document does not define Participant identity or Course access, the
Participant's Module Selection actions, notifications, implementation storage,
or user-interface design.

## Inputs

- Admin actions that create or modify a Course, Group, or Module;
- current Course, Group, Module, and Module Selection state;
- a Module's scheduled date and time; and
- the Course timezone.

## Outputs

- valid Course, Group, and Module state;
- preserved or removed historical references according to usage; and
- the Course-wide Groups and Scheduled Modules eligible for participation.

## Adjacent Parts

Structure follows the [domain model](domain-model.md), determines eligibility
for [Module participation](module-participation.md), and constrains
[Course access](course-access.md) when a Course is Archived.

## Course Structure

A [Course](../DICTIONARY.md#course) is the permanent container for its Groups,
Modules, Course Assignments, and shared Course Invite. An Admin MAY create and
modify Courses subject to the rules below.

Renaming or changing descriptive Course information MUST NOT change Course
identity or break any relationship. Course names need not be globally unique,
and sophisticated duplicate detection is not a domain rule.

### Course Timezone

Each Course MUST have exactly one Course timezone. All of its Module dates and
times MUST be defined and interpreted in that timezone. Individual Modules
MUST NOT have separate business timezones. Daylight-saving-time behavior
follows the Course timezone.

Displaying an equivalent time in a Participant's local timezone MAY be a future
presentation concern but is not core booking behavior. The current product
requirements do not define whether or how an existing Course's timezone may be
changed after Modules exist; no such behavior may be inferred.

## Groups

### Course-Wide Attendance Choices

A [Group](../DICTIONARY.md#group) is a Course-wide attendance option. Every
Active Group is available to every otherwise eligible future Scheduled Module
in its Course. The initial model MUST NOT make a Group available for only
selected Modules.

An Admin MAY create a Group within exactly one Course. The Group remains
permanently owned by that Course.

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

An Admin MAY change a Group's name or details. The edit MUST preserve Group
identity and existing Module Selections. If `Online` is renamed to `Remote`,
Participants previously selected into that Group are shown with the new name.

Active Groups in one Course MUST remain distinguishable to Participants. Group
names SHOULD therefore be unique within the Course. Names are not domain
identity.

### Course Ownership

A Group belongs permanently to exactly one Course and MUST NOT be moved to
another. A Group created in the wrong Course must be deleted or Archived as its
usage permits and recreated in the correct Course.

### Deletion And Archival

- An Admin MAY delete or Archive a Group only under the conditions below.
- A Group that has never been referenced by a Module Selection MAY be
  permanently deleted.
- A Group with meaningful historical participation MUST NOT be hard-deleted in
  a way that destroys that history. It SHOULD be Archived, and historical
  Module Selections MAY continue to identify it.
- A Group with active future Module Selections MUST NOT be Archived until those
  selections no longer reference it. The Group MUST NOT simply disappear and
  Participants MUST NOT be silently moved to another Group.

The initial scope does not give Admins authority to manipulate Participants'
Module Selections. Future references must therefore be resolved through the
existing Participant and Module lifecycle rules before the Group is Archived.

### No Capacity

Groups have no capacity. The domain MUST NOT introduce maximum sizes, full
Groups, overbooking prevention, waiting lists, reservations, capacity locks,
fairness rules, or fallback Groups. Selecting a Group remains the choice of one
value rather than a reservation competition.

## Modules

### Scheduling

A [Module](../DICTIONARY.md#module) is exactly one non-recurring scheduled
occurrence in a Course. An Admin MAY add a Module to an existing Active Course,
including after Participants have joined or earlier Modules have occurred.

Adding a Module MUST NOT automatically create Module Selections. It becomes
available for eligible Participants under the normal selection rules.

A Scheduled Module's upcoming, starting, or past position is derived from its
current scheduled date and time. These positions MUST NOT become additional
lifecycle states. Recurring Modules are not supported.

### Editing

An Admin MAY change a Module's title or name, description, instructions, and
scheduled date or time.

- Descriptive edits MUST NOT affect existing Module Selections.
- A date or time edit MUST preserve the Module's identity and its existing
  Module Selections.
- Participant eligibility to modify a Selection MUST immediately follow the
  edited start time. If the edit places the Module in the past or reaches its
  start time, Participant modification becomes unavailable.
- The booking domain does not require a history of every previous scheduled
  date or time.

For example, changing `Module 2: Monday 10:00` to
`Module 2: Tuesday 15:00` leaves every existing Group selection attached to
Module 2.

### Course Ownership

A Module belongs permanently to exactly one Course and MUST NOT be moved to
another. A Module created in the wrong Course must be removed or Cancelled in
accordance with its usage and recreated in the intended Course.

### Deletion And Cancellation

- An Admin MAY delete or Cancel a Module only under the conditions below.
- A Module that has never had Module Selections and has no meaningful
  participation history MAY be permanently deleted.
- A Module that has or had Module Selections MUST NOT be hard-deleted in a way
  that destroys their historical meaning. It SHOULD be Cancelled.

A Cancelled Module MUST remain historically identifiable, MUST NOT accept new
Module Selections, MUST NOT be modifiable by Participants, and MUST be shown as
Cancelled wherever historical context is shown. No additional Module lifecycle
states are required.

## Course Lifecycle

The complete Course lifecycle is Active or Archived.

### Active Course

Subject to all other eligibility rules, an Active Course MAY receive
Participants, have a usable Invite, contain future Modules, and allow Module
Selections.

### Permanent Deletion

An Admin MAY permanently delete a genuinely unused Course. An accidentally
created Course with no meaningful participation or history MAY be deleted
together with its unused child objects and Invite as appropriate.

The current product requirements do not define a more precise test for
"meaningful" Course history beyond preserving historical Module Selections.
No broader deletion policy may be inferred.

### Archival

An Admin MAY Archive a Course. A Course with meaningful participation or
history SHOULD be Archived instead of hard-deleted. Archiving MUST:

- prevent new Participants from joining;
- make the shared Invite unusable;
- prevent new Module Selections;
- prevent Participant modification of Module Selections; and
- preserve historical context.

Future Modules and Selections SHOULD be resolved before archiving so that
upcoming participation does not silently become ambiguous history. For
example, an Admin MAY cancel affected Modules, or Participants MAY remove their
own eligible future Selections. An Admin MUST NOT create or change a
Participant's Module Selection on their behalf.
