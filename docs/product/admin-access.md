# Admin Access

## Responsibility

This document owns Admin User identity and access, Super Admin authority,
Admin User lifecycle and onboarding, first Admin bootstrap, Admin Invite
lifecycle, and the required Admin User and Admin Invite administration views.

## Not Responsible For

This document does not define Participant profile or Course membership, Course
Invite behavior, Course structure, Module Selection policy, authentication
technology, persistence, APIs, or user-interface implementation.

## Inputs

- a stable external authentication principal used in administration context;
- first Admin bootstrap or an Active Admin Invite;
- the registering Admin User's explicitly supplied required name;
- an authorized Admin User mutation, promotion, or Admin Invite action; and
- authoritative current Admin User and Admin Invite state.

## Outputs

- a distinct Admin User identity with ordinary or Super Admin authority;
- Active, Disabled, or deleted Admin User disposition;
- authorized promotion from ordinary Admin to Super Admin;
- an Active, Claimed, or Revoked Admin Invite;
- authorization or refusal for an administrative action; and
- Admin User and Admin Invite list representations with the accepted actions.

## Adjacent Parts

Admin access applies the identity and lifecycle vocabulary in the
[domain model](domain-model.md), authorizes administrative actions in
[Course access](course-access.md), [Course structure](course-structure.md), and
[Module participation](module-participation.md), and leaves technical
composition to the planned booking-system web application.

## Admin User Identity

An [Admin User](../DICTIONARY.md#admin-user) is a booking-system domain entity
for a person authorized to access and operate the administration experience.
It is distinct from a [Participant](../DICTIONARY.md#participant), with its own
stable domain identity, required name, administrative access state, authority,
and lifecycle.

Being an Admin User MUST NOT automatically make that person a Participant.
Being a Participant MUST NOT automatically make that person an Admin User.
Admin access MUST NOT be represented as an `isAdmin` property or equivalent
capability on Participant.

While Active and authorized for the specific action, an Admin User may
administer:

- Courses, Groups, and Modules;
- Participants and Course Assignments;
- Course Invites;
- accepted Admin-assisted booking operations on Participants' Module
  Selections;
- other Admin Users; and
- Admin Invites.

### External Authentication Identity

An [external authentication
identity](../DICTIONARY.md#external-authentication-identity) is the stable
principal presented by the authentication layer. It may establish access to an
Admin User independently of any Participant identity. The same principal MAY
back one Participant and one Admin User without merging their state or history.
The administration context selects the Admin User identity and authority.

Several sign-in methods resolved by the authentication layer to the same
stable principal reach the same current Admin User. Different principals remain
different prospective identities even when personal data matches. The booking
system does not link or merge them and does not attempt to determine whether
they belong to the same real-world human.

Authentication-provider profile data is not authoritative Admin User data. A
provider display-name change MUST NOT automatically change the booking-system
Admin User name or merge identities.

## Name And Onboarding

Every Admin User MUST explicitly supply or confirm one required human-readable
[Admin User name](../DICTIONARY.md#admin-user-name) during bootstrap or invited
onboarding. Surrounding whitespace is trimmed for validation, and a blank value
after trimming is invalid. Separate first name, last name, title, organization,
and other profile fields are not required.

The name is a booking-system property. Authentication-provider profile data
MAY prefill it as a presentation convenience but is not authoritative. An
authorized Active Admin User MAY later edit the name under the mutation rules
below without changing Admin User identity, state, or authority.

## Admission To Administration

After first Admin bootstrap has completed, authentication alone MUST NOT create
an Admin User. An external principal without a current Admin User may create an
Admin User only through:

- the first-ever bootstrap flow while it remains legitimately available; or
- a valid Active Admin Invite.

Otherwise administration access is refused. A current Disabled Admin User is
not a new candidate and receives no access until explicitly Re-enabled.

## Authority And Lifecycle

Every existing Admin User has ordinary Admin or
[Super Admin](../DICTIONARY.md#super-admin) authority and is Active or Disabled.
A legitimately authorized deletion removes that Admin User and is distinct
from Disabled.

A Disabled Admin User remains identifiable but MUST NOT have administrative
access or perform any administrative mutation. Re-enabling preserves Admin
User identity and authority. Disabling or deleting an Admin User MUST NOT imply
Participant Disable or deletion, even when the same external authentication
identity backs both domain entities.

An authorized Active Admin User MAY edit the retained name of an Active or
Disabled target Admin User under the authority rules below. Target Disable
does not erase or protect that booking-system profile property; it prevents the
Disabled Admin User from acting. The actor and target still MUST be revalidated
when the name edit is accepted.

### Ordinary Admin User Authority

An ordinary Active Admin User MAY edit their own name. They MUST NOT:

- Disable themselves;
- delete themselves;
- promote themselves; or
- otherwise alter their own authority.

An ordinary Active Admin User MAY administer another ordinary Admin User by:

- editing their name;
- Disabling them;
- Re-enabling them; or
- deleting them.

An ordinary Admin User MUST NOT mutate any Super Admin. In particular, they
MUST NOT edit, Disable, Re-enable, delete, demote, or otherwise alter a Super
Admin, and MUST NOT promote any Admin User.

### Super Admin Promotion

The first successfully bootstrap-created Admin User receives Super Admin
authority automatically. Additionally, any Active Super Admin MAY promote an
Active ordinary Admin User:

```text
Active ordinary Admin User -> Active Super Admin
```

Promotion is an explicit administration action. It preserves Admin User
identity and every existing relationship; it does not create another Admin
User. A Disabled ordinary Admin User MUST be Re-enabled before promotion. An
Admin Invite always creates an ordinary Active Admin User and never grants
Super Admin authority directly.

Multiple Super Admins MAY coexist. Promotion is one-way in v1: there is no
Super Admin demotion action. An Admin User, including a Super Admin, MUST NOT
demote themselves or anyone else.

### Super Admin Administration And Self-Protection

An Active Super Admin MAY administer another Admin User, including another
Super Admin. Subject to the last-Active-Super-Admin invariant, they MAY:

- edit another Admin User's name;
- Disable another Admin User;
- Re-enable another Disabled Admin User;
- delete another Admin User; and
- promote an Active ordinary Admin User.

A Super Admin MAY edit their own name but MUST NOT Disable or delete themselves
or alter their own authority. Self-protection remains in force even when
several Super Admins exist.

### At Least One Active Super Admin

No accepted Admin User mutation may leave the installation with zero Active
Super Admins. This invariant applies to Disable and delete actions and MUST be
evaluated against authoritative current state when the mutation is accepted.
A stale or concurrent action that would remove the last remaining Active Super
Admin MUST be refused.

Disabling or deleting one Super Admin is permitted only when another Active
Super Admin remains. A Disabled Super Admin retains Super Admin authority and
may be Re-enabled by another Active Super Admin, but does not satisfy the
Active-Super-Admin invariant while Disabled.

### No Cascades

Disabling or deleting an Admin User MUST NOT automatically change:

- Courses, Groups, or Modules;
- Participants;
- Course Assignments or Module Selections;
- Course Invites; or
- Admin Invites previously created by that Admin User.

Previously accepted legitimate actions remain authoritative. No complete
product-level Admin mutation audit log is required in v1.

## First Admin Bootstrap

[First Admin bootstrap](../DICTIONARY.md#first-admin-bootstrap) is available
exactly when no Admin User has ever yet been created for the installation. It
does not depend on whether Participants already exist.

Before any Admin User has been created, visiting the administration
authentication entry point MUST replace normal Admin login with
`Register admin`. The first person who successfully completes the flow:

1. authenticates through the chosen authentication layer;
2. supplies their required Admin User name;
3. becomes the first Active Admin User; and
4. receives Super Admin authority.

Bootstrap MUST NOT reopen merely because Admin Users are later Disabled or
deleted. Competing bootstrap completions are validated against authoritative
current state; only the first successfully accepted Admin User creation may use
bootstrap. The flow MUST NOT introduce password-based local authentication.

## Admin Invites

An [Admin Invite](../DICTIONARY.md#admin-invite) is a security-sensitive path
toward creating one ordinary Active Admin User. It is not Course-specific and
MUST remain distinct from the reusable Course Invite.

### Independent Creation And Lifecycle

Any Active Admin User MAY create a new Admin Invite. Multiple independently
Active Admin Invites MAY coexist. An Admin Invite is:

- Active;
- terminal Claimed; or
- terminal Revoked.

Successful ordinary Admin User creation transitions the Invite:

```text
Active -> Claimed
```

Any Active Admin User MAY Revoke any Active Admin Invite, regardless of its
creator:

```text
Active -> Revoked
```

Claimed and Revoked Invites MUST NOT be reused, re-enabled, or reactivated. An
Admin Invite has no automatic expiration, TTL, or cleanup deadline.

### URL Visibility And Loss

The complete Admin Invite URL or secret MUST be shown and copyable when the
Invite is created. It MUST NOT be recoverable afterwards. Later Invite
administration retains the creation time, state, and authorized Revoke action,
but not the complete URL.

If an Active Invite URL is lost, the intended recovery is to Revoke that Invite
and create a new one. The product does not require recoverable Invite secrets.

### Pre-Onboarding Visibility

Before successful onboarding, a valid Active Admin Invite may reveal only that
it is an available Admin registration invitation. It MUST NOT reveal Admin User
lists, creator identity or details, internal administration information,
Course data, or other Admin Invite information. An unknown, Claimed, Revoked,
or otherwise invalid Invite receives an unavailable result without exposing
administrative state.

### Claiming And Invited Onboarding

Invited Admin onboarding follows this conceptual flow:

```text
Open Active Admin Invite
        |
        v
Authenticate
        |
        v
Supply required Admin User name
        |
        v
Revalidate Invite and external principal
        |
        +--> ordinary Active Admin User created
        |
        +--> Admin Invite becomes Claimed
        |
        v
Access administration
```

Opening the Invite, starting authentication, or abandoning onboarding MUST NOT
consume it or create a pending Admin User. Final creation MUST validate the
Invite, external principal, and all other authoritative state together.

If the Invite became Claimed by another successful claimant or Revoked before
acceptance, Admin User creation MUST fail and no partial Admin User may remain.
Starting earlier grants no precedence. Exactly one claimant may consume an
Active Invite.

### Existing And Deleted Admin Users

If the external authentication identity already backs a current Active or
Disabled Admin User, claiming another Active Admin Invite MUST be refused. The
attempt MUST NOT:

- create another Admin User;
- Re-enable the existing Admin User;
- consume the Invite; or
- change the Invite from Active.

This rule includes current Super Admins. Re-enabling is a separate authorized
administration action.

A legitimately deleted Admin User's former external principal MAY later use a
new Active Admin Invite. Successful onboarding creates a new ordinary Active
Admin User with a new domain identity and newly supplied name. It does not
restore the deleted identity, state, or authority. Later Super Admin authority
requires a separate valid promotion.

A different unlinked external principal is a different prospective Admin
identity, even if the product user is the same real-world human. Possession of
a valid Active Admin Invite may therefore create an ordinary Admin User for
that principal; the booking system performs no name- or email-based identity
matching.

## Administration Views

### Admin User View

The administration experience MUST include a list representing every current
Admin User. At minimum it exposes:

- name;
- ordinary Admin or Super Admin authority; and
- Active or Disabled state.

It exposes edit, Disable, Re-enable, and delete actions where the actor has
authority and the requested mutation preserves every invariant. It exposes
promotion only when the actor is an Active Super Admin and the target is an
Active ordinary Admin User. No demotion action exists. Deleted Admin Users do
not need to remain in the current list.

### Admin Invite View

The administration experience MUST include a list of Admin Invites across
Active, Claimed, and Revoked states. At minimum it exposes:

- creation time;
- current state; and
- Revoke for an Active Invite where authorized.

It also provides creation of a new Invite, with the complete URL shown only in
the creation result. Claimed and Revoked Invites expose no reactivation.

These view requirements do not prescribe a frontend framework, component
library, visual style, pagination, API, persistence structure, Invite-token
representation, or technical logging.

## Authoritative Current State

Every Admin mutation, promotion, bootstrap completion, and Invite claim MUST be
authorized and validated against authoritative current state when accepted. A
page or form loaded by a previously Active Admin User grants no authority after
that actor becomes Disabled, and stale state cannot bypass target authority,
Invite state, or the at-least-one-Active-Super-Admin invariant.
