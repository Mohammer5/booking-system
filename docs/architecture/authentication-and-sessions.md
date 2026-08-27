# Authentication And Sessions

## Responsibility

This document owns the initial technical architecture for establishing an
authenticated [external authentication
identity](../DICTIONARY.md#external-authentication-identity), maintaining its
[authentication session](../DICTIONARY.md#authentication-session), and
resolving the relevant booking-system identity at the application boundary.

## Not Responsible For

This document does not define Participant or Admin User lifecycle, profile,
authority, Course access, mutation authorization, final database table names,
or product policy. Those decisions remain with `packages/booking` and the
product specifications.

## Inputs

- a same-origin browser request and secure session cookie;
- a successful provider sign-in or explicitly non-production fixture sign-in;
- the participant-facing or administration application context; and
- authoritative current booking-domain state.

## Outputs

- an unauthenticated result or one stable external authentication principal;
- creation, continuation, or termination of a server-side session; and
- application resolution of that principal to the relevant current Participant
  or Admin User, when one exists.

## Adjacent Parts

[Applications](applications.md) owns the deployable composition boundary,
[runtime and hosting](runtime-and-hosting.md) owns the Worker environment,
[persistence](persistence.md) owns D1 and migrations, and
[verification](../process/verification.md) owns evidence that normal and
non-production authentication behave safely. The product [domain
model](../product/domain-model.md) owns the distinct booking-system identities
and their relationships.

## Accepted Composition

[Better Auth](https://www.better-auth.com/) is the chosen initial
[authentication layer](../DICTIONARY.md#authentication-layer). It will run
inside the `apps/booking-system-web` Cloudflare Worker and use the
application's D1 database for its technical user, account, and session records.
This fits the accepted Worker and D1 boundary without adding another identity
service or infrastructure platform.

The authentication layer answers only:

> Which stable external authentication principal is this request
> authenticated as?

It does not decide whether that principal currently has a Participant or Admin
User, whether either identity is Active, whether a Participant has a Course
Assignment, whether an Admin User is ordinary Admin or Super Admin, or whether
an operation is authorized. The application resolves those questions through
`packages/booking` against authoritative current state.

The application-facing authentication boundary collapses Better Auth state to
exactly one of these conceptual results:

```text
unauthenticated

authenticated {
  externalPrincipalId
}
```

`externalPrincipalId` is the only authentication value supplied to booking
behavior. Better Auth records, provider SDK types, OAuth details, cookies,
session implementation, provider profile properties, and provider identifiers
remain behind the application boundary. The booking-facing contract also
contains no Participant ID, Admin User ID, selected role, `isAdmin`,
`isSuperAdmin`, permission, Course Assignment, or provider-derived
authorization value.

Better Auth, OAuth and provider SDKs, cookie and session concepts, Cloudflare
authentication integration, and test-authentication machinery remain private
to the application. `packages/booking` must never import them.

## Technical Principal And Domain Identities

The Better Auth user ID is an application-private stable external principal,
not a Participant ID or Admin User ID:

```text
Better Auth user
  id = stable external principal ID

Participant
  id = booking-system Participant ID
  externalPrincipalId = Better Auth user ID
  name = booking-system profile property
  email = booking-system profile property
  state = Active | Disabled

Admin User
  id = booking-system Admin User ID
  externalPrincipalId = Better Auth user ID
  name = booking-system property
  state = Active | Disabled
  authority = Admin | Super Admin
```

The names in this diagram express the relationship, not final table or column
names. Authentication-provider name and email may prefill onboarding fields
but are not authoritative booking-system profile data.

An external principal may independently back zero or one Participant, zero or
one current Admin User, or both. A principal and session may exist before
either onboarding flow succeeds; that creates no pending domain identity and
does not weaken the rule that incomplete onboarding creates no Participant or
Admin User.

## One Session, Contextual Domain Resolution

One authentication session represents the external principal. The system does
not create separate participant and administration sessions or persist a
selected role in the session.

```text
authenticated external principal
        |
        +-- participant-facing operation -> resolve current Participant
        |
        +-- admin-facing operation ------> resolve current Admin User
```

Each request resolves the context-relevant domain identity and authorization
from authoritative current state. No Participant state, Admin User state,
Admin authority, Course Assignment, permission, role, or Course claim is
copied into the authentication session or cached in its cookie.

Consequently, disabling one domain identity does not disable the other identity
backed by the same principal. Deleting an Admin User does not inherently delete
the Better Auth user because the principal may still back a Participant.
Domain Disable and Delete operations normally leave the authentication session
intact; the next request is allowed or refused from freshly resolved domain
state.

## Session Model

Use Better Auth's database-backed opaque session model. The browser receives a
secure same-origin `HttpOnly` cookie whose opaque value identifies server-side
session state in D1. Sign-out terminates that authentication session.

The initial architecture has:

- D1-backed Better Auth sessions;
- no JWT-based authorization or session architecture;
- no KV session store;
- no domain permission, role, authority, or Course claims in the session; and
- no cookie-cached authorization state.

Database-backed opaque sessions are simple to revoke while keeping domain
authorization current. Exact session lifetime and refresh values are
implementation configuration, not durable architecture truth at this stage.

## Bootstrap And Onboarding Composition

Authentication establishes only the principal. First Admin bootstrap remains
an authoritative domain operation:

```text
authenticated external principal
        |
        v
resolve current Admin User
        |
        v
none exists for principal
        |
        v
has any Admin User ever been created? -- yes --> refuse bootstrap
        |
       no
        |
        v
Admin onboarding / Register admin
        |
        v
explicit booking-system Admin User name
        |
        v
authoritative atomic domain operation
        |
        v
first Active Super Admin created
```

Competing attempts are decided from authoritative current state.
Authentication alone never creates an Admin User.

Participant onboarding uses the same separation:

```text
authenticated external principal
        |
        v
resolve current Participant
        |
        v
none exists
        |
        v
Participant onboarding
        |
        v
explicit booking-system name and email
        |
        v
authoritative domain operation
        |
        v
Active Participant created
```

Authentication alone never creates a Participant or Course Assignment.

## Production Providers And Linking

The eventual production providers remain Google, Apple, Microsoft, and
Facebook behind the same stable-principal contract. Their real integrations
are deferred beyond `EPIC-m22qh` and `TASK-aeij8`. No local password
authentication is introduced, and provider concepts must not leak into
`packages/booking` when those integrations are later added.

For v1, Better Auth implicit account or provider linking is disabled. There is
no manual product linking workflow, no matching or merging by email or name,
and distinct external principals remain distinct. This does not prohibit a
future explicit feature in which several sign-in methods map to one stable
principal; it records only the conservative initial composition.

## Invite Continuation

Authentication and onboarding during an Invite flow preserve a validated
application destination and then return to the original Invite flow. They do
not accept or consume the Invite. A Course Invite composes conceptually as:

```text
recognized Course Invite
        |
        v
authenticate if necessary
        |
        v
return to Invite flow
        |
        v
Participant onboarding if necessary
        |
        v
explicit Join
        |
        v
revalidate Invite, Course, Participant, and Assignment
```

Future Admin Invite continuation follows the analogous separation.
Authentication or onboarding never joins a Course, consumes an Admin Invite,
or creates a Course Assignment merely because an Invite was opened.

Security-sensitive Invite secrets must not enter third-party OAuth URLs,
referrers, browser or technical logs, or analytics. Prefer server-side or
session-backed continuation state when practical. Exact routes and continuation
storage are deferred to implementation.

## Non-Production Authentication

The first epic uses a separate explicitly
[non-production authentication](../DICTIONARY.md#non-production-authentication)
composition. Better Auth test utilities or its then-current test-capable
composition are the preferred mechanism, provided official Better Auth
documentation still supports the required behavior when implementation begins.

Production and non-production authentication are different executable
compositions rather than one production composition conditionally exposing a
test route through a runtime flag:

```text
production composition
  +-- normal application
  +-- Better Auth
  X-- fixture-session establishment

explicit non-production composition
  +-- normal application
  +-- Better Auth
  +-- fixture-session establishment
```

The mechanism must:

- establish normal Better Auth application sessions for deterministic named
  fixture identities, beginning with `first-admin` and leaving room for fixed
  names such as `participant-a` and `participant-b` when those flows exist;
- let Playwright exercise the normal authenticated application and real domain
  authorization after session establishment;
- prevent arbitrary-principal impersonation, including a caller-supplied
  principal identifier;
- exist only in explicitly non-production composition;
- be absent or unavailable in production regardless of request headers,
  queries, or cookies, so production fails closed;
- require a CI-controlled secret or equivalently strong non-public gate when
  exposed to hosted staging or preview E2E;
- have automated regression evidence that production cannot activate it; and
- keep its secrets and tokens out of CI artifacts.

Production must not contain an activatable hidden authentication bypass. Exact
test-authentication route names are intentionally not selected here. Fixture
session establishment supplies authentication only; it never creates booking
identity, role, authority, or permissions.

## Worker Compatibility

Better Auth currently requires Worker-side Node compatibility support for
`AsyncLocalStorage`. When implementation begins, enable only the minimum
Cloudflare Worker compatibility mode required by the chosen Better Auth
version: prefer `nodejs_als` when sufficient and otherwise use
`nodejs_compat`. Verify the requirement against then-current official Better
Auth and Cloudflare documentation when dependencies are introduced.

This narrow compatibility requirement does not turn production into a
conventional Node server or permit unrelated Node-only application
assumptions.

## Persistence And Migration Ownership

Better Auth technical records and booking-domain records share the
application's D1 persistence boundary unless a concrete future need proves
otherwise. Sharing one database does not merge their conceptual ownership:
authentication and session records remain application-owned technical
persistence, while booking records remain domain-owned.

When introduced, Better Auth schema and migrations participate in the same
version-controlled migration, clean-state test, compatibility, and release
discipline as other application D1 changes. Local/test, staging, and production
data remain isolated, and production regression tests never mutate production
identity or session data.

## Current State And Implementation Trigger

This architecture is accepted but unimplemented. No application workspace,
Better Auth dependency, session store, provider integration, Worker
compatibility setting, D1 schema or migration, authentication route, test-auth
composition, or UI exists yet.

The first application implementation must verify then-current Better Auth and
Cloudflare compatibility and select exact concrete module/map declarations,
schema names, session lifetime and refresh values, authentication route names,
and local/test environment configuration required by implemented behavior. It
must preserve every contract above without turning those implementation
choices into product policy. Remote provider and other account-bound production
configuration is not a prerequisite for local MVP implementation; it follows
the accepted provider-integration timing and [release-hardening
lifecycle](../DICTIONARY.md#release-hardening).
