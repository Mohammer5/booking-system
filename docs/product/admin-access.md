# Admin Access

## Responsibility

This document owns Admin User identity and access, Super Admin authority,
Admin User lifecycle and onboarding, first Admin bootstrap, Admin Invite
lifecycle, and the required Admin User and Admin Invite administration views.

## Not Responsible For

This document does not define Participant Course membership, Course Invite
behavior, Course structure, Module Selection policy, authentication-provider
technology, persistence, APIs, or user-interface implementation.

## Inputs

- an external authentication identity used in the administration context;
- first Admin bootstrap or an Active Admin Invite;
- the registering Admin User's explicitly supplied real name;
- an authorized Admin User mutation or Admin Invite action; and
- current Admin User and Admin Invite state.

## Outputs

- a distinct Admin User identity with ordinary or Super Admin authority;
- Active, Disabled, or deleted Admin User disposition;
- an Active, Claimed, or Revoked Admin Invite;
- authorization or refusal for an administrative action; and
- Admin User and Admin Invite data-table views with the accepted actions.

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
stable domain identity, real name, administrative access state, authority, and
lifecycle.

Being an Admin User MUST NOT automatically make that person a Participant.
Being a Participant MUST NOT automatically make that person an Admin User.
Admin access MUST NOT be represented as an `isAdmin` property or equivalent
capability on Participant.

While Active, an Admin User may administer:

- Courses, Groups, and Modules;
- Participants and Course Assignments;
- Course Invites;
- accepted Admin-assisted booking operations on Participants' Module
  Selections;
- other Admin Users according to the authorization rules below; and
- Admin Invites.

### External Authentication Identity

An [external authentication identity](../DICTIONARY.md#external-authentication-identity)
may establish access to an Admin User independently of any Participant
identity. The same provider identity MAY simultaneously back one Participant
and one Admin User without merging those domain entities. The administration
context determines that the Admin User identity and authority are being used.

External provider profile data is not authoritative Admin User data. In
particular, an Admin User's provider display name, email address, or other
personal data MUST NOT automatically become or merge a booking-system
identity. Current self-service identity linking and merging remain outside the
initial product.

## Real Name And Onboarding

Every Admin User MUST explicitly supply one required, human-readable
[Admin User real name](../DICTIONARY.md#admin-user-real-name) while completing
onboarding. Separate first name, last name, title, organization, and profile
metadata fields are not required.

The real name is a booking-system property and need not equal a display name
from Google, Microsoft, Apple, Facebook, or another authentication provider.
Provider data MAY eventually prefill the field as a convenience, but the Admin
User MUST explicitly supply or confirm the real name. An authorized Admin User
MAY edit it later under the mutation rules below.

## Authority And Lifecycle

Every existing Admin User has ordinary Admin or
[Super Admin](../DICTIONARY.md#super-admin) authority. Super Admin is a broader
authorization classification on an Admin User, not a separate identity entity.

An ordinary Admin User may be:

- Active;
- Disabled; or
- deleted.

A Disabled Admin User remains an Admin User but MUST NOT have administrative
access while Disabled. An authorized Admin User MAY re-enable a Disabled
ordinary Admin User. Deleting an ordinary Admin User is a distinct accepted
operation and MUST NOT be treated as another name for Disabled. Admin User
deletion MUST NOT imply Participant deletion, even when the same external
authentication identity backs both entities.

### Ordinary Admin User Authority

An ordinary Active Admin User MAY mutate any other ordinary Admin User by:

- editing their real name;
- disabling them;
- re-enabling them; or
- deleting them.

An ordinary Admin User MUST NOT mutate a Super Admin. In particular, they MUST
NOT edit the Super Admin's real name, disable or delete the Super Admin, or
alter Super Admin authority.

### Super Admin Authority And Protection

A Super Admin MAY mutate Admin Users regardless of the target Admin User's
ordinary administrative role, subject to the explicit self-protection rules.
The Super Admin MAY edit their own real name but MUST NOT disable themselves.
Whether the Super Admin may hard-delete themselves is deliberately
unspecified.

The initial product does not define promotion, transfer, replacement, or
additional-Super-Admin workflows. The only Super Admin that MUST exist is the
first Admin User created through bootstrap.

## First Admin Bootstrap

[First Admin bootstrap](../DICTIONARY.md#first-admin-bootstrap) is available
exactly when no Admin User has ever yet been created for the installation. It
does not depend on whether Participants already exist.

Before any Admin User has been created, visiting the administration
authentication entry point MUST replace the normal Admin login experience with
`Register admin`. The first person who successfully completes that flow:

1. authenticates through the accepted external authentication mechanism;
2. enters their required real name;
3. becomes the first Admin User; and
4. becomes the Super Admin.

Only the first successfully completed bootstrap registration receives the
initial Super Admin authority. Bootstrap MUST NOT reopen merely because
ordinary Admin Users are later Disabled or deleted. It MUST NOT introduce
password-based local authentication. Implementation-level concurrency
mechanics remain outside this specification.

## Admin Invites

An [Admin Invite](../DICTIONARY.md#admin-invite) is a security-sensitive path
toward creating one ordinary Admin User. It is not Course-specific and MUST
remain distinct from the reusable, Course-specific Course Invite.

### Independent Creation And Lifecycle

Any Active Admin User, ordinary or Super Admin, MAY create a new Admin Invite.
Multiple independently Active Admin Invites MAY coexist. Admin Invites do not
use the Course rule of at most one current Invite.

The complete Admin Invite lifecycle is:

- Active;
- Claimed; or
- Revoked.

An Active Admin Invite may be successfully claimed at most once. Successful
Admin User creation through that Invite permanently transitions it:

```text
Active -> Claimed
```

A Claimed Admin Invite MUST NOT be used again.

### Revocation

Any Active Admin User MAY Revoke any Active Admin Invite, regardless of who
created it. Revocation permanently transitions it:

```text
Active -> Revoked
```

A Revoked Admin Invite MUST NOT be used, re-enabled, or reactivated. If another
invitation is needed, an Active Admin User creates a new Admin Invite.

### No Automatic Expiration

An Admin Invite has no automatic expiration in the initial product. An Active
Admin Invite remains Active until it is successfully Claimed or manually
Revoked. The product has no expiration date, TTL, automatic cleanup, or timed
validity window for Admin Invites.

### Claiming And Invited Onboarding

Invited Admin User onboarding follows this conceptual flow:

```text
Open Active Admin Invite
        |
        v
Authenticate
        |
        v
Enter required real name
        |
        v
Confirm/complete Admin registration
        |
        +--> ordinary Active Admin User created
        |
        +--> Admin Invite becomes Claimed
        |
        v
Access Admin UI
```

Opening an Admin Invite, starting authentication, or partially completing
onboarding MUST NOT consume the Invite. It becomes Claimed only when Admin User
creation and onboarding succeed. An abandoned browser session or failed
authentication attempt therefore leaves the Invite Active.

Admin Invites are not person-specific or email-specific. An Invite MUST NOT
create a pending Admin User merely because it exists. What happens when an
external authentication identity already associated with an Admin User
attempts to claim another Admin Invite remains deliberately unspecified.

## Administration Views

### Admin User View

The administration experience MUST include a data-table list view representing
all current Admin Users. At minimum, the table MUST expose each Admin User's:

- real name;
- ordinary Admin or Super Admin authority; and
- Active or Disabled state.

The view MUST expose edit, Disable, Re-enable, and delete operations where the
acting Admin User has authority. Deleted Admin Users do not need to remain in
the current table unless a future historical or audit requirement requires it.

### Admin Invite View

The administration experience MUST include a data-table list view representing
Admin Invites across Active, Claimed, and Revoked states. It MUST provide
actions to create a new Admin Invite and Revoke an Active Admin Invite. Claimed
and Revoked Invites are terminal and MUST NOT expose reactivation. The product
does not define Admin Invite deletion.

These view requirements do not prescribe a frontend framework, component
library, visual style, pagination approach, table package, API, persistence
structure, invite-token representation, or whether a complete Invite URL can
be recovered later.
