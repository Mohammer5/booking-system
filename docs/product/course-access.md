# Course Access

## Responsibility

This document owns Participant registration, onboarding, profile, global
access state, and external authentication identity as relevant to participant
access. It also owns Course membership through Course Assignments, shared
Course Invite behavior, Assignment revocation and reactivation, Participant
administration requirements, Course-access permissions, and Course visibility.

## Not Responsible For

This document does not define Admin User identity or lifecycle, Super Admin
authority, Admin bootstrap, Admin Invites, detailed Module Selection actions,
Course content lifecycle, authentication technology, or user-interface
implementation.

## Inputs

- a stable external authentication principal used in participant context;
- a new person's required Participant name and email;
- an Active Participant's profile, access, or Join action;
- an Active Admin User's Participant, Assignment, or Course Invite action;
- an otherwise eligible Admin-assisted set-Selection action for an existing
  Active Participant; and
- authoritative current Participant, Course, Assignment, and Invite state.

## Outputs

- a fully registered Participant identity with required profile and Active or
  Disabled global state;
- an unchanged, Active, or Revoked Course Assignment;
- authorization or refusal to join or access a Course;
- the Course and Participant information visible to the actor; and
- the minimum Participant administration representation and actions.

## Adjacent Parts

Access applies the [domain model](domain-model.md), receives administrative
authority from [Admin access](admin-access.md), gates [Module
participation](module-participation.md), and respects [Course
lifecycle](course-structure.md#course-lifecycle).

## External Authentication And Participant Identity

An [external authentication
identity](../DICTIONARY.md#external-authentication-identity) is the stable
principal presented by the authentication layer. In participant context it
establishes which [Participant](../DICTIONARY.md#participant) is acting; it is
not itself Participant identity and grants no Course access.

If several sign-in methods resolve to the same stable external principal, the
booking system sees the same external authentication identity and reaches the
same current Participant. Different external principals remain different even
when name, email, or other personal data matches. The product does not infer
that they belong to the same real-world human and MUST NOT automatically merge
them.

The same external authentication identity MAY independently back one
Participant and one Admin User. Their domain identities, profiles, state,
Course membership, Selections, authority, and history remain independent. The
product remains compatible with authentication-layer linking behind one stable
principal but does not provide Participant or Admin identity linking, merge,
recovery, or transfer in v1.

## Participant Registration And Onboarding

A person MUST be able to register for participant-facing access without a
Course Invite and without an existing Course Assignment. A Course Invite is a
path to joining one Course, not a prerequisite for Participant registration.

After first successful authentication in participant context, a person with no
current Participant MUST complete mandatory
[Participant onboarding](../DICTIONARY.md#participant-onboarding):

```text
Authenticate in participant context
        |
        v
Supply required name and email
        |
        v
Participant registration completes
        |
        v
Active Participant with zero or more later Course memberships
```

Before both values are valid and registration succeeds, normal participant
application access MUST NOT be granted. The person MUST be directed back to
onboarding and MUST NOT join a Course, access Course information, or create or
modify a Module Selection. Authentication, onboarding, and signing out may
remain available.

The Participant domain identity becomes fully registered when onboarding
succeeds and starts Active. Incomplete or abandoned onboarding is not a
Participant lifecycle state and MUST NOT create a pending Participant, Course
Assignment, Module Selection, or other booking-domain record.

A Course Invite opened before authentication or onboarding MAY be resumed
after onboarding. Completion does not Join the Course: the Invite, Course,
Participant, and Assignment state MUST be revalidated at a later explicit Join
confirmation.

## Participant Profile

Every registered Participant has:

- one required human-readable [Participant
  name](../DICTIONARY.md#participant-name); and
- one required [Participant email](../DICTIONARY.md#participant-email).

Surrounding whitespace is trimmed for required-text validation; blank values
after trimming are invalid. No separate first name, last name, salutation,
organization, address, phone, or broader profile is required.

Participant name is non-unique and not domain identity. When Participant email
is stored or updated, surrounding whitespace MUST be trimmed, the resulting
complete string MUST be validated as an email address, and that resulting value
MUST be retained as the Participant's booking-system profile value. Participant
email MUST be unique among registered Participants by case-insensitive
comparison of the complete trimmed address.

No provider-specific email-address transformation participates in storage or
uniqueness comparison. The booking system MUST NOT remove dots from the local
part, strip `+tag` suffixes, infer aliases, apply Gmail- or Microsoft-specific
canonicalization, perform MX- or domain-provider-specific rewriting, or treat
syntactically different addresses as equal merely because a provider might
deliver them to one mailbox. For example, ` Alice@example.com` and
`alice@example.com` compare equal, while `alice+course@example.com` and
`alice@example.com` remain distinct, as do `first.last@gmail.com` and
`firstlast@gmail.com`.

Email uniqueness gives Admin Users a deterministic way to distinguish
Participant profiles. Email is still neither Participant identity nor evidence
that two external principals identify the same human, and matching email MUST
NOT merge external authentication identities or Participants.

Authentication-provider profile data MAY prefill name or email as a
presentation convenience, but the Participant MUST explicitly supply or
confirm both booking-system values during onboarding. Provider display name or
email changes MUST NOT automatically mutate the Participant profile. Changing
the booking-system email MUST NOT imply changing provider data.

### Profile Editing

An Active Participant MAY edit their own name or email. Any Active Admin User
MAY edit any Active or Disabled Participant's name or email. An edit preserves
Participant identity, state, Course Assignments, Module Selections, and every
historical relationship.

If a Participant or Admin User attempts to assign an email already held by a
different registered Participant under the accepted comparison rule, the
change MUST be refused and the target Participant's existing data left
unchanged. A Disabled Participant has no participant-side profile access.

## Participant Global Access State

The complete Participant lifecycle is:

```text
Active <-> Disabled
```

Only an Active Admin User may Disable or Re-enable a Participant. Participants
MUST NOT Disable or Re-enable themselves. Participant hard deletion is not
supported in v1.

Participant state is global participant-facing access control. It is separate
from the Active or Revoked Course Assignment that records Course-specific
membership.

### Disable

When a Participant becomes Disabled:

- participant application access is limited to authentication, signing out,
  and an appropriate unavailable or disabled-account state;
- Join through a Course Invite is refused;
- participant-side profile edits and Module Selection mutations are refused;
- all Course Assignments remain stored in their existing Active or Revoked
  state;
- Selections for Scheduled Modules where `now < startsAt` are removed across
  all Courses;
- Selections for Scheduled Modules where `startsAt <= now` are retained;
- Selections for Cancelled Modules are retained; and
- every retained Selection is historical while the Participant is Disabled.

Disable MUST preserve historical booking information and MUST NOT mutate or
delete Courses, Groups, Modules, Course Invites, or Admin User identities,
including an Admin User backed by the same external authentication identity.

### Re-enable

Re-enabling preserves the same Participant identity and every Course
Assignment state. It does not restore future Selections removed on Disable.
Where an Active Assignment otherwise grants access, participant-facing access
becomes available again.

If a retained Selection belongs to a currently in-progress Scheduled Module
in an Active Course with an Active Assignment, that Selection becomes live
again on Re-enable. This is retained participation, not a late booking.

### Administration While Disabled

An Active Admin User MAY inspect a Disabled Participant, edit their profile,
administer their Course Assignments, and Re-enable them. Direct Assignment
administration remains independent of Participant state: an Admin User MAY
establish, revoke, or reactivate Course membership for a Disabled Participant
where the Course rules permit, but that Participant receives no
participant-facing Course access until Re-enabled.

Admin-assisted Selection creation or replacement requires an Active target
Participant. A Disabled Participant MUST be Re-enabled before a new assisted
booking may be accepted.

## Participant Administration

Active Admin Users MUST be able to discover every fully registered Participant,
including Participants with zero Course Assignments. The minimum Participant
administration representation exposes:

- Participant name;
- Participant email; and
- Active or Disabled state.

It exposes authorized actions to edit name, edit email, Disable, and Re-enable.
Course-specific Assignment and Selection administration remains governed by
the focused membership and Module participation rules. This requirement does
not prescribe table technology, layout, pagination, API, or persistence.

Participants MUST NOT receive a global Participant directory or another
Participant's email or profile merely because they share a Course.

## Administrative Assignment

When a fully registered Participant has no Assignment to an Active Course, an
Active Admin User MAY directly assign them. This is allowed whether the
Participant is Active or Disabled; global access still requires Active
Participant state. A new Assignment MUST NOT be created for an Archived Course.

- Assigning a Participant who already has an Active Assignment is a successful
  no-op and MUST NOT create a duplicate.
- For an Active Course, assigning a Participant whose Assignment is Revoked
  MUST reactivate that same Assignment.
- Revoking an already-Revoked Assignment is a successful no-op.
- A Revoked Assignment MUST NOT be reactivated while its Course is Archived.
- Reactivation MUST NOT restore removed future Module Selections.
- No pending Participant or Assignment may be created for an unknown or
  incompletely registered person.

Administrative assignment and Invite Join have identical membership meaning.
Origin creates no separate Assignment state.

## Course Assignment Through Admin-Assisted Booking

An Active Admin User may set an existing Active Participant's Module Selection
without requiring an Active Assignment before the operation begins. When all
normal eligibility rules in [Module
participation](module-participation.md#admin-assisted-booking) are satisfied:

```text
no Course Assignment
  -> Active Course Assignment + set Module Selection

Active Course Assignment
  -> unchanged Active Course Assignment + set Module Selection

Revoked Course Assignment
  -> reactivated Active Course Assignment + set Module Selection
```

The outcome preserves one Assignment per Participant and Course. The Course
must be Active, and booking validity MUST be established against authoritative
current state before the combined outcome is accepted. Refusal leaves no newly
created or reactivated Assignment. Admin-assisted removal does not create or
reactivate membership.

This path MUST NOT create a Participant for an unknown or incompletely
registered person, operate on a Disabled Participant, or turn an Admin User
into a Participant.

## Shared Course Invite

### Exact Current-Invite Lifecycle

Each Course has at most one current shared
[Course Invite](../DICTIONARY.md#course-invite). While the Course is Active, an
Active Admin User MAY apply these transitions:

```text
no Invite
  -> enabled current Invite

enabled current Invite
  -> disabled current Invite

disabled current Invite
  -> enabled current Invite

enabled or disabled current Invite
  -> replacement enabled current Invite
```

Replacement permanently invalidates the predecessor for Join. A Course Invite
does not expire automatically. The current Course Invite URL MAY be retrieved
and copied later while managing an Active Course; copying MUST NOT require
replacement and therefore does not invalidate distributed links. Archived
Course structure is frozen, so its Invite cannot be enabled or replaced.

### Reuse And Forwarding

The Invite is Course-specific and intentionally not person-specific. Multiple
Participants MAY use the same enabled current Invite, and recipients may
forward it. Possession authorizes only an explicit attempt to Join under
authoritative current rules.

### Join Flow

Joining follows this conceptual sequence:

1. A person opens a recognized Course Invite.
2. They authenticate if necessary.
3. A new person completes mandatory Participant onboarding.
4. The Active Participant receives an explicit Join action.
5. At confirmation, current Invite, Course, Participant, and Assignment state
   is revalidated.
6. When allowed, the Participant receives one Active Course Assignment and may
   access the Course.

Opening the URL, authenticating, or completing onboarding alone MUST NOT create
Course membership. An existing Active Assignment makes repeat Join a
successful no-op. A Disabled Participant cannot Join. A Revoked Assignment
prevents self-reactivation through the shared Invite; only an Active Admin User
may reactivate it while the Course is Active.

A page opened earlier preserves no authority. If the Invite becomes Disabled
or is replaced, the Course becomes Archived, the Participant becomes Disabled,
or the Participant's Assignment becomes Revoked before confirmation, the
authoritative current state governs and no stale page grants membership.

### Recognized Invite Visibility

A recognized Invite token or path that can still be associated with its Course
MAY reveal:

- the Course name; and
- whether Join is available or unavailable.

The Course-name allowance applies even when the Invite is Disabled, replaced,
or attached to an Archived Course. It MUST NOT expose any other Course-private
information, including rosters, Module Selections, private meeting links or
access instructions, Participant profiles, or administrative information.

A truly unknown or malformed Invite that cannot be associated with a Course
MUST NOT reveal a Course name or any other Course information.

## Assignment Revocation And Reactivation

An Active Admin User MAY revoke an Active Assignment in either an Active or
Archived Course. Revocation is access removal and MUST:

- transition the Assignment to Revoked;
- block participant-facing Course access and Selection mutation;
- prevent self-reactivation through the shared Invite;
- remove Selections for Scheduled Modules where `now < startsAt`;
- retain Selections for Scheduled Modules where `startsAt <= now`; and
- retain all Selections for Cancelled Modules.

Retained Selections are historical while the Assignment is Revoked. Future
Selections removed on revocation do not return on later reactivation. In an
Active Course, reactivating a retained Assignment may make an in-progress
Selection live again when the Participant is Active and every other live
predicate holds. A Revoked Assignment in an Archived Course cannot reactivate.

Participants have no self-service leave-Course capability in v1. A Participant
may remain assigned while having no Selections.

## Course Access And Visibility

### Active Course

Participant-facing Course access requires both:

- Active Participant state; and
- an Active Course Assignment.

For an Active Course, those conditions grant normal access to participation
information and otherwise eligible Selection mutation. The Participant may see
the Course's Modules, Active Groups and relevant Group details, their own
Selections, and Course information needed for participation.

### Archived Course

An Active Participant with an Active Assignment MAY retain read-only access to
an Archived Course. They may view appropriate historical Course information,
Modules, relevant Group information, and their own Selections but MUST NOT
mutate any booking state. Archival does not revoke Assignments. A later Admin
revocation removes that Participant's access, and the Revoked Assignment cannot
reactivate while the Course remains Archived.

### Participant Privacy

Course access MUST NOT expose the full Participant roster, other Participants'
Selections, email addresses or profiles, or administrative data. Participant
rosters and Group counts remain outside v1.

### Admin User Visibility

An Active Admin User MAY discover and view Active and Archived Courses as
needed for administration, including Courses with zero members or no enabled
Invite. Administrative Course information includes Course Participants,
Assignment state, Modules, Groups, and Participants' Selections, subject to the
accepted action rules.

### No Public Discovery

The product has no public Course catalogue or directory. Outside the deliberate
recognized-Invite Course-name exception, a person without current Admin access
or Active Participant plus Active Assignment access MUST NOT discover or view
a Course.

## Multiple Courses

A Participant MAY have independent Assignments to several Courses. Revocation
from one Course MUST NOT affect another Course. Participant Disable applies
globally without changing those Assignment states. A Course Invite applies only
to its Course, and Module Selections MUST NOT span Courses.

## Authoritative Current State

Every onboarding completion, profile edit, Participant state change, Assignment
operation, Course Invite action, Join confirmation, access check, and related
state-changing operation MUST be validated against authoritative current state
when accepted. Stale forms and Invite pages confer no continuing authority.
