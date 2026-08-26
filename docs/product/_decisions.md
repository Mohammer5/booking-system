# Product Decisions

## Separate Membership From Module Participation

A Course Assignment answers whether a Participant belongs to a Course. A
Module Selection answers whether that Participant intends to attend one Module
and which Group they chose. Keeping these concepts separate allows Course
membership with all, some, or no Modules selected and prevents membership from
silently creating bookings.

## Absence Means Non-Participation

A missing Module Selection means the Participant is not participating in the
Module. The model does not distinguish unanswered from declined and does not
add an RSVP lifecycle around a simple current choice.

## Require Participant Onboarding And Booking-System Profile Data

Participant registration is available without a Course Invite. Mandatory
onboarding collects one required name and one required unique email before the
Participant exists as a fully registered domain identity or receives normal
application access. These values are explicit booking-system profile
properties, not identity proof or authoritative authentication-provider data.

## Use Reversible Participant Disabling Instead Of Deletion

Participant Active or Disabled state is global participant-facing access
control. Disabling preserves identity, Course Assignments, and historical
participation while removing future Scheduled-Module Selections at the same
boundary as Assignment revocation. Hard deletion and participant self-disable
would require separate historical and recovery policy, so v1 excludes them.

## Keep Authentication Principals Separate From Domain Identities

The booking system trusts the stable external principal presented by the
authentication layer. Several sign-in methods may resolve to one principal,
while two different principals remain different even when names or email
addresses match. The same principal may independently back one Participant and
one Admin User, but the product neither merges those domain identities nor
links distinct principals in v1.

## Keep Groups Course-Wide

Groups are deliberately simple Course-wide attendance choices. Their identity
and one free-text details field do not vary by Module. Per-Module Group
availability or structured room, meeting-provider, or access subobjects would
add relationships that v1 does not need.

## Keep The Core Data Contracts Minimal

A Course has name, optional description, and timezone; a Group has name and
optional details; a Module has title, optional description and instructions,
and one `startsAt`/`endsAt` interval. Required text is non-blank after trimming.
Names and titles are not identity and need not be globally unique.

## Require Unique Active Group Names Within A Course

Active Group names are unique within one Course after trimming and
case-insensitive comparison. This makes current choices unambiguous while
allowing Archived Groups to retain historically useful names. Reactivation
must re-establish the invariant.

## Use One Shared Reusable Course Invite

A shared Course Invite intentionally trades fine-grained invitation control
for simple onboarding. Anyone possessing a valid current enabled Invite may
attempt to join, and the current URL remains recoverable so copying it does not
invalidate distributed links. Explicit Join confirmation and authoritative
current Participant, Assignment, Course, and Invite state govern success.

## Reveal Only The Course Name For Recognized Invites

A recognized Invite token may reveal its Course name even after it is Disabled,
replaced, or attached to an Archived Course. This preserves useful target
context without exposing private Course data. An unknown token reveals no
Course, and no Invite exposes rosters, profile data, private access details, or
administrative information before joining.

## Retain Revoked Course Assignments

A revoked Course Assignment is retained so an Admin User's access removal
remains effective even while a generic Course Invite is usable. Revocation
removes only Selections for Scheduled Modules that have not reached `startsAt`;
in-progress, ended, and Cancelled-Module Selections remain as history. Only an
Active Admin User may reactivate the Assignment, and never in an Archived
Course.

## Derive Live Participation From Surrounding State

A retained Selection is live only while Participant, Course, and Assignment
are Active, the Module is Scheduled, and `now < endsAt`. Otherwise it is
historical. Keeping this meaning derived avoids another persisted lifecycle on
Module Selection while allowing retained in-progress participation to become
live again after valid Assignment reactivation or Participant Re-enable.

## Validate State-Changing Actions At Acceptance

Every mutation is authorized and validated against authoritative current state
when accepted. A loaded form or Invite page grants no durable authority. This
single rule resolves stale joins, deadlines, disabled actors, revoked
membership, concurrent Invite claims, and last-Active-Super-Admin protection
without a general merge or conflict-resolution workflow.

## Use IANA Course Timezones And Definite Instants

Every Course has one IANA/TZDB timezone, defaulting to `Europe/Berlin`, and the
first Module freezes it. Module local schedule input must resolve to definite
instants: nonexistent daylight-saving local times are rejected and ambiguous
times require an explicit occurrence. All lifecycle comparisons use the
resolved instants.

## Keep Module Scheduling Future-Facing

A new Module and every pre-start reschedule must result in `startsAt > now` and
`endsAt > startsAt`. Schedule edits stop at the current `startsAt`, while
descriptive edits remain possible in an Active Course even after start, end, or
cancellation. This keeps booking deadlines deterministic without adding
schedule history.

## Permit Cancellation Only Before Module End

An upcoming or in-progress Scheduled Module may be Cancelled in an Active
Course only while `now < endsAt`. Cancellation is terminal and retains existing
Selections as history; at the exact `endsAt`, cancellation is no longer
available.

## Delete Groups And Modules By Retained References

An Active-Course Group or Module may be hard-deleted only when no currently
retained Module Selection references it. Removed or replaced pre-start choices
do not require a full historical change log and do not block deletion; every
retained current or historical Selection does.

## Allow Reversible Group Archival

Groups move between Active and Archived while their Course is Active.
Archival is blocked only by a retained Selection for an upcoming Scheduled
Module; a retained in-progress or historical Selection continues to identify
the Group. Reactivation preserves identity, restores future eligibility, and
must satisfy Active Group name uniqueness.

## Preserve Courses Through Structurally Read-Only Archival

Courses are never hard-deleted or restored. Archival freezes Course, Group,
Module, Invite, Assignment-addition/reactivation, and Selection mutation while
preserving all structures and history. Revocation remains available as access
removal, and an Active Participant with an Active Assignment retains read-only
historical access until that Assignment is revoked.

## Block Course Archival Until Scheduled Modules End

A Scheduled Module remains unresolved for Course archival while its `endsAt`
is in the future. It may reach `endsAt` or be explicitly Cancelled before
archival. Archival itself never cancels Modules, removes Selections, or mutates
Course structures.

## Enable Multiple Super Admins Through Promotion

The first successfully bootstrap-created Admin User receives Super Admin
authority automatically. Thereafter an Active Super Admin may promote an
Active ordinary Admin User without changing identity. Multiple Super Admins
reduce dependence on one account, while one-way promotion avoids introducing
demotion and transfer workflows in v1.

## Protect Super Admin Authority And Availability

An Admin User cannot disable, delete, or alter their own authority. Ordinary
Admins cannot mutate Super Admins. An Active Super Admin may administer another
Super Admin, but every accepted mutation must leave at least one Active Super
Admin. The invariant is revalidated at acceptance so stale or concurrent
actions cannot remove all Super Admin access.

## Use Separate One-Time Admin Invites

Course Invites and Admin Invites grant access to different responsibilities.
An Admin Invite creates one ordinary Active Admin User and becomes terminal
when Claimed or Revoked. Existing Admin Users cannot claim another Invite, and
claim refusal neither re-enables them nor consumes the Invite. A legitimately
deleted Admin's former external principal may return only through a new Active
Invite, producing a new ordinary Admin identity.

## Show Admin Invite Secrets Only At Creation

The complete Admin Invite URL is shown and copyable once, when created, then is
not recoverable. The list retains creation time, state, and authorized
Revocation. Revoking and creating a replacement is the simple recovery for a
lost active URL and avoids requiring recoverable stored secrets as product
behavior.

## Complete Admin Invite Claims Atomically

Opening or partially completing an Admin Invite does not consume it. The Invite
is revalidated when Admin User creation is attempted, and exactly one claimant
may transition it from Active to Claimed. A stale claimant receives no partial
Admin User and no precedence from having started earlier.

## Keep Admin User Disable/Delete Effects Local

Disabling or deleting an Admin User changes administrative identity access but
does not cascade into Courses, Groups, Modules, Participants, memberships,
Selections, or previously created Invites. Previously accepted business
actions remain authoritative.

## Use One Module Selection For Assisted Booking

An Active Admin User may set an Active existing Participant's Module Selection
or remove it under the normal deadline and lifecycle rules. A successful set
may create or reactivate the ordinary Course Assignment as part of the same
outcome. Refusal leaves no membership side effect, and no Admin-specific
booking entity or late override is introduced.

## Require Focused Administration Views

Admin Users, Admin Invites, and fully registered Participants need focused list
representations because their accepted states and authorized actions must be
discoverable. The specification defines minimum information and operations
without selecting UI, API, pagination, persistence, or token mechanics.

## Exclude Workflow-Heavy And Audit Features

Capacity, waiting lists, approvals, per-Module Group availability, recurring
scheduling, attendance, notification correctness, identity merge/transfer,
Super Admin demotion/succession, and complete Participant, Admin, or booking
change histories are deliberately excluded. Each would introduce distinct
states, relationships, or policy that the first release does not require.
