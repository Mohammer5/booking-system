# Persistence

## Responsibility

This document owns relational persistence semantics, database environment
isolation, and schema-evolution constraints.

## Not Responsible For

This document does not define product data or invariants, application routing,
test-layer ownership, or release orchestration beyond database-safety
constraints.

## Inputs

- application persistence operations expressed against SQLite-compatible SQL;
- version-controlled migrations once a schema exists; and
- environment-specific database bindings.

## Outputs

- isolated local/test database state;
- a dedicated [staging](../DICTIONARY.md#staging) D1 database; and
- a dedicated [production](../DICTIONARY.md#production) D1 database.

## Adjacent Parts

[Runtime and hosting](runtime-and-hosting.md) owns the Worker application that
uses persistence. [Verification](../process/verification.md) owns migration and
integration tests. [Releases](../process/releases.md) owns safe promotion of
schema and application changes. [Authentication and
sessions](authentication-and-sessions.md) owns the technical identity/session
semantics stored through this persistence boundary.

## Database Direction

The relational model uses SQLite-compatible SQL semantics. Cloudflare D1 is
the persistent database in deployed environments. A persistent local file such
as `database.sqlite` cannot be treated as Worker storage.

Local development and tests may use an isolated local SQLite/D1-compatible
database through Cloudflare's local development and testing facilities.

Better Auth technical user, account, and session records and booking-domain
records use the application's D1 persistence boundary unless a future concrete
need proves otherwise. Sharing D1 does not merge their ownership:
authentication records remain application-owned technical persistence and
booking records remain conceptually domain-owned.

## First Admin Bootstrap Persistence

First Admin bootstrap availability is a durable historical fact: it answers
whether an Admin User has ever successfully been created, not whether an Admin
User row exists now. Counting current Admin Users is therefore not an adequate
implementation because legitimate later deletion must not reopen bootstrap.
The exact table, column, and schema representation of that history remain
implementation choices.

The first bootstrap claim must produce one atomic authoritative persistence
outcome that either:

- creates exactly one Active Admin User with Super Admin authority and
  permanently records bootstrap as consumed; or
- refuses with bootstrap unavailable without creating an Admin User or
  consuming bootstrap.

The persistence design and database constraints must preserve that outcome
under concurrent or stale attempts. No accepted state may record bootstrap as
consumed without the first Admin User creation, and two requests must not both
successfully create the first Admin User.

The first slice needs only narrow capabilities to read permanent bootstrap
history, resolve a current Admin User by stable external principal, and claim
the first Admin atomically. Their exact function and query names remain
implementation choices. They do not justify a generic repository,
`DatabaseService`, unit of work, generic CRUD/data-access package, or shared
infrastructure package. The initial booking schema is limited to the Admin User
state, permanent bootstrap history, and integrity constraints required by this
slice; future Course, Group, Module, Invite, Participant, Course Assignment,
and Module Selection schema waits for the work that needs it.

## Environment Isolation

The persistence lifecycle must distinguish at least these environments:

| Environment | Database responsibility |
| --- | --- |
| local/test | Disposable, deterministic state owned by local development or one test run. |
| staging | Once provisioned during release hardening, pre-production test data in a dedicated remote D1 database. |
| production | Once provisioned during release hardening, live data in a dedicated remote D1 database that regression tests never mutate. |

Staging and production must never share a D1 database. Local or staging E2E
tests must not point at production data.

## Migration Contract

Once a schema exists:

- every schema change is a version-controlled migration;
- applying the full sequence constructs the current schema on a clean database;
- CI exercises that clean migration path and fails when it cannot construct
  the expected schema;
- deployed schema changes remain compatible with the application versions
  present during rollout; and
- undocumented manual production schema changes are not a normal path.

Better Auth schema and migrations participate in this same version-controlled,
clean-state-tested, rollout-compatible discipline when introduced. Production
regression tests never mutate production authentication, identity, session, or
booking data.

Application and schema rollout cannot be assumed to switch atomically.
Destructive migrations are not routine; any future coordinated or destructive
change requires an explicit exceptional deployment decision.

## Current State And Persistence Lifecycle

No D1 database, binding, schema, or migration exists today.

### When The First Real Schema Exists

Introduce the following with the first real schema that uses them:

- SQLite/D1-compatible schema design;
- version-controlled migrations;
- deterministic local/test persistence;
- clean-state migration verification;
- Worker/D1-compatible persistence integration; and
- local/test database bindings and configuration needed by implemented
  behavior.

The first schema must already be designed for eventual D1 deployment. Do not
create an empty migration framework before that schema exists. A remote staging
or production D1 database is not required at this point; its absence during
local MVP development is intentional.

### During Release Hardening

[Release hardening](../DICTIONARY.md#release-hardening) creates:

- one dedicated remote staging D1 database;
- one dedicated remote production D1 database;
- their account-specific bindings and configuration; and
- environment-specific deployment configuration.

This later provisioning changes timing, not persistence technology or safety.
D1 remains the deployed persistence target, staging and production never share
a database, tests never mutate production, and the version-controlled and
rollout-compatible migration contract remains unchanged.
