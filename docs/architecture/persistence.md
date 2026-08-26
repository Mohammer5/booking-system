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
schema and application changes.

## Database Direction

The relational model uses SQLite-compatible SQL semantics. Cloudflare D1 is
the persistent database in deployed environments. A persistent local file such
as `database.sqlite` cannot be treated as Worker storage.

Local development and tests may use an isolated local SQLite/D1-compatible
database through Cloudflare's local development and testing facilities.

## Environment Isolation

Persistence must distinguish at least these environments when implementation
begins:

| Environment | Database responsibility |
| --- | --- |
| local/test | Disposable, deterministic state owned by local development or one test run. |
| staging | Pre-production test data in a dedicated D1 database. |
| production | Live data in a dedicated D1 database that regression tests never mutate. |

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

Application and schema rollout cannot be assumed to switch atomically.
Destructive migrations are not routine; any future coordinated or destructive
change requires an explicit exceptional deployment decision.

## Current State And Implementation Trigger

No D1 database, binding, schema, or migration exists today. Introduce the D1
configuration, separate staging and production bindings, version-controlled
migrations, and clean-state migration tests with the first real schema that
uses them. Do not create an empty migration framework before that schema
exists.
