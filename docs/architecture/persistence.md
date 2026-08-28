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
User row exists now. Counting current Admin Users is therefore not adequate.
The implemented `admin_bootstrap_history` table has one constrained singleton
row. Its nullable foreign key records the first Admin while that row exists and
uses `ON DELETE SET NULL`, so later Admin deletion preserves the permanent
historical fact.

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

The first Admin slice exposes only narrow capabilities to read permanent
bootstrap history, resolve a current Admin User by stable external principal,
and claim the first Admin atomically. The claim uses one atomic D1 `batch()`
containing the Admin insert and singleton-history insert; database constraints
decide stale and concurrent losers and roll back the complete batch on failure.
These capabilities do not justify a generic repository,
`DatabaseService`, unit of work, generic CRUD/data-access package, or shared
infrastructure package. The initial booking schema is limited to the Admin User
state, permanent bootstrap history, and integrity constraints required by this
slice. The implemented Course slice separately owns narrow list, stable-detail,
and guarded-create capabilities over `courses`, `groups`, and `modules`. The
implemented `course-access` slices own narrow Participant fresh-resolution,
directory/detail, constraint-backed registration, guarded self/Admin
profile-only updates, guarded Participant lifecycle, guarded direct-Assignment,
and assigned Active-Course list/detail capabilities over `participants`,
`course_assignments`, `courses`, `groups`, and `modules`. The Participant
Course reads join current Active Participant, Active Assignment, and Active
Course state before returning private data. The implemented
`module-participation` slice owns guarded Selection set/change/remove over
`module_selections`. The same `course-access` persistence owns retained-row
Assignment reactivation and atomic revocation with exact future-Selection
removal; Invite schemas remain deferred to their owning slices.

## Environment Isolation

The persistence lifecycle must distinguish at least these environments:

| Environment | Database responsibility |
| --- | --- |
| local development | Disposable state owned by manual local development. |
| automated test | Deterministic generated state owned by one test run and isolated from manual development. |
| staging | Once provisioned during release hardening, pre-production test data in a dedicated remote D1 database. |
| production | Once provisioned during release hardening, live data in a dedicated remote D1 database that regression tests never mutate. |

Staging and production must never share a D1 database. Local or staging E2E
tests must not point at production data. Automated local fixture/Playwright
preparation must also use a generated persistence root separate from manual
development, so resetting a test run cannot invalidate or replace a running
developer database.

## Migration Contract

For the implemented schema and every later schema change:

- every schema change is a version-controlled migration;
- applying the full sequence constructs the current schema on a clean database;
- CI exercises that clean migration path and fails when it cannot construct
  the expected schema;
- deployed schema changes remain compatible with the application versions
  present during rollout; and
- undocumented manual production schema changes are not a normal path.

Better Auth schema and migrations participate in this same version-controlled,
clean-state-tested, rollout-compatible discipline. Production
regression tests never mutate production authentication, identity, session, or
booking data.

Application and schema rollout cannot be assumed to switch atomically.
Destructive migrations are not routine; any future coordinated or destructive
change requires an explicit exceptional deployment decision.

## Current State And Persistence Lifecycle

The application has local/test D1 bindings and six version-controlled
migrations. `0001_first_admin_foundation.sql` creates the Better Auth `user`,
`session`, `account`, and `verification` technical tables and indexes plus
`admin_users` and `admin_bootstrap_history`. `0002_courses.sql` adds the
booking-owned `courses` table with stable identity, required name/timezone,
optional description, and constrained Active/Archived state.
`0003_groups_and_modules.sql` adds permanent Course scheduling history plus
Course-owned Groups and Modules. `0004_participants.sql` adds registered
Participants. `0005_course_assignments.sql` adds retained ordinary Course
membership. `0006_module_selections.sql` adds Participant Module Selections
with same-Course ownership constraints. No remote D1 database exists.

### Implemented First Schema

The first schema includes:

- SQLite/D1-compatible schema design;
- version-controlled migrations;
- deterministic local/test persistence;
- clean-state migration verification;
- Worker/D1-compatible persistence integration; and
- local/test database bindings and configuration needed by implemented
  behavior.

The second additive migration preserves the first schema during upgrade. A
single guarded `insert ... select ... where exists` accepts Course creation
only while the acting Admin row is still Active; duplicate names have no
uniqueness constraint and independent accepted submissions retain distinct
Course identities.

The third additive migration preserves existing Course data with
`has_ever_had_module = 0`, adds stable Group/Module identities and restrictive
Course foreign keys, and prevents ownership changes through triggers. A
partial unique index enforces one Active normalized Group name per Course while
allowing later Archived-name conflicts. Group and Module inserts recheck both
the current Active Admin and Active Course in SQL. A successful Module insert
updates one-way Course scheduling history through an `after insert` trigger in
the same statement; a refused guarded write or failed interval constraint
leaves both Module rows and history unchanged. Module instants are stored as
integer epoch milliseconds and returned as exact ISO instants.

Course editing requires no schema migration. One guarded update rechecks the
current Active Admin and Active Course, the Course timezone read by the
application, and permanent `has_ever_had_module` history while changing the
complete name, description, and timezone fields atomically. Descriptive edits
remain possible after scheduling history, but a timezone change does not; a
directly deleted first, last, or only Module cannot clear that history. The
guarded Module insert also rechecks that the Course still has the timezone used
to resolve its local schedule. Consequently, a concurrent timezone edit and
first Module creation cannot both succeed with inconsistent definite instants,
and either refusal leaves all Course fields, Module rows, and history unchanged.

Group field and reversible lifecycle operations also require no schema
migration. One guarded complete-field update preserves Group identity, Course
ownership, lifecycle state, and every Selection while rechecking the current
Active Admin/Course, expected Group state, and Active-name uniqueness.
Archival is one guarded Active-to-Archived update with a `not exists` check for
a retained Selection joined to a Scheduled Module whose `starts_at` is later
than the accepted instant. Reactivation is one guarded Archived-to-Active
update that rechecks the partial Active-name invariant. Neither action updates
or deletes `module_selections`. The existing guarded Selection write requires
an Active Group, so a concurrent archive and future Selection cannot both win;
the partial unique index likewise arbitrates concurrent conflicting edits or
reactivations. Refusal and trigger failure leave every Group field/state and
Selection unchanged.

The fourth additive migration preserves all existing application data and adds
one `participants` table with stable Participant identity, one row per external
principal, required nonblank name, retained trimmed email, a unique lowercase
whole-email comparison key, and constrained Active/Disabled state. One insert
is the complete registration outcome: the principal and normalized-email
constraints decide repeated, concurrent, and duplicate-email attempts without
pending identity or partial profile state. Participant profile maintenance
requires no further migration: guarded updates reuse the same constraint and
change only name, retained email, and its comparison key. Self-service
rechecks the current Active Participant; Admin service rechecks a current
Active Admin and registered Active or Disabled target. A stale or conflicting
write changes nothing and never mutates identity, principal, state,
Assignments, Selections, or same-principal Admin data.
Participant lifecycle also requires no migration. Disable uses one guarded D1
batch to delete every target Selection joined to a Scheduled Module with
`startsAt > now` across all Courses and then change the same still-Active
Participant to Disabled. Exact-start, in-progress, exact-end, ended, and every
Cancelled-Module Selection remain, as do all Assignment states and same-
principal Admin data; a refused or failed batch removes nothing. Re-enable is
one guarded Disabled-to-Active update and never reconstructs a Selection.

The fifth additive migration preserves all existing application data and adds
one `course_assignments` table with stable identity, constrained Active/Revoked
state, restrictive Participant/Course foreign keys, permanent ownership, and
one unique Participant/Course pair. A guarded insert rechecks the current
Active Admin, Active Course, and fully registered Active or Disabled target at
write acceptance. The unique pair makes repeated and concurrent Active
assignment idempotent, while a conflict update reactivates the retained row
without changing its identity. A refused write creates no identity or Module
Selection. Assignment lifecycle requires no schema migration: one guarded D1
batch revokes an Assignment in an Active or Archived Course and removes only
its Scheduled Selections with `startsAt > now`. Exact-start and begun
Scheduled Selections, all Cancelled Selections, and all other-Course data stay
retained. Repeated revocation is idempotent, and any failed batch rolls both
the Selection removal and Assignment transition back.

The sixth additive migration preserves existing application data and adds one
`module_selections` table with stable identity, restrictive ownership, one
unique Participant/Module pair, and composite references requiring the Module
and selected Group to belong to the recorded Course. Guarded set/change/remove
statements recheck an Active Participant, Active Assignment and Course,
Scheduled Module with `now < startsAt`, and—when setting—an Active same-Course
Group. Replacement updates only the Group and preserves Selection identity;
refused or stale writes leave existing state unchanged. Participant Course
detail joins only the requesting Participant's Selection and derives its live
or historical meaning from current state and time rather than storing a
status.

The full migration sequence is applied to clean isolated state in Worker tests
and before browser E2E. The schema is designed for eventual D1 deployment. A
remote staging or production D1 database is not required at this point; its
absence during local MVP development is intentional.

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
