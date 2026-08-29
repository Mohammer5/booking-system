# Verification

## Responsibility

This document owns the layered regression strategy, the canonical repository
verification command, pull-request [CI gate](../DICTIONARY.md#ci-gate), and the
evidence required before a change can be merged or released.

## Not Responsible For

This document does not own product behavior, application runtime composition,
production promotion order, or remote GitHub ruleset administration.

## Inputs

- repository and application changes;
- deterministic test data and isolated test environments; and
- the repository-declared Node and pnpm versions and lockfile.

## Outputs

- one canonical non-deployment verification result;
- the stable GitHub status check named `verify`; and
- layer-specific diagnostics when verification fails.

## Adjacent Parts

[Releases](releases.md) composes these checks with staging and production
promotion. [Runtime and hosting](../architecture/runtime-and-hosting.md) and
[persistence](../architecture/persistence.md) define the environments being
exercised.

## Layered Regression Harness

Each layer owns different evidence. Higher-level tests do not replace focused
lower-level tests, and the same assertion should not be copied into every
layer.

```text
repository/architecture tooling tests
        |
        v
pure unit/domain tests
        |
        v
Worker/API/D1 integration tests
        |
        v
local full-browser E2E tests
        |
        v
Cloudflare staging/preview E2E tests
        |
        v
small non-destructive production smoke tests
```

### Repository Tooling Tests

The current Node test suites own the repository's ESLint rules and boundary
converter behavior. They remain Node tests rather than being migrated to
Vitest for uniformity.

### Product And Worker Tests

For real application and domain behavior:

- Vitest owns fast product, transformation, validation, and frontend-logic
  tests that do not need a browser;
- Cloudflare's then-current official Workers Vitest integration owns tests that
  require the Workers runtime or bindings such as D1;
- the currently accepted integration package is
  `@cloudflare/vitest-plugin`, not the obsolete
  `@cloudflare/vitest-pool-workers` name;
- Worker integration tests exercise request handling, authorization,
  validation, bindings, serialization, errors, D1 queries and constraints, and
  migration behavior as applicable; and
- database tests construct deterministic isolated state from the
  version-controlled migration sequence, never from production D1.

For the first Admin foundation, focused domain tests own name validation and
bootstrap outcomes, while Worker/D1 integration tests own permanent bootstrap
history, atomic first-Admin concurrency, external-principal resolution, and
fresh current-Admin authorization. Browser tests own the composed registration
journey and a later principal's bootstrap refusal. The task implementation plan
assigns the detailed assertions without duplicating every invariant at every
layer.

For Course create/view, booking-domain Vitest owns minimal fields, timezone
validation/defaulting, nonunique names, Active outcome, and no-effect refusals.
Worker/D1 Vitest owns clean and upgrade migrations, stable persistence,
guarded stale-Admin acceptance, concurrent independent creation, exact HTTP
outcomes, and production composition. Playwright owns the German empty/create/
detail/refresh journey, validation and refusal focus, responsive layout,
pre-authorization privacy, and accessible route states.

For Course editing, booking-domain Vitest owns complete-field validation,
identity/relationship preservation, descriptive edits after scheduling
history, and permanent timezone-lock policy. Worker/D1 Vitest owns the atomic
guarded update, failed-write rollback, first-Module history retained after
direct deletion, exact HTTP/sanitization outcomes, and the two-sided race in
which a timezone edit and first Module creation cannot both win. Playwright
owns German editing and validation, direct refresh, first-Module locking,
truthful locked presentation with zero current Modules, stale conflict refresh,
responsive focus behavior, and axe scans.

For Group and future-Module creation, booking-domain Vitest owns Group
normalization, minimal structure outcomes, strict Course-local minute
resolution, DST gaps/overlaps, definite interval rules, injected-time
boundaries, and validation before persistence. Worker/D1 Vitest owns the
additive migration, permanent Course ownership, normalized-name concurrency,
guarded current-state writes, atomic first-Module scheduling history, exact
nested HTTP contracts, and no partial side effects. Playwright owns the German
Course-detail empty/create/list/refresh journeys, duplicate and time errors,
explicit overlap selection, exact-instant presentation, stale/technical
refusal focus, responsive layout, and axe scans.

For Module descriptive editing and rescheduling, booking-domain Vitest owns
complete text fields across upcoming/in-progress/ended/Cancelled Modules,
injected before/exact/after-current-start boundaries, new future interval
rules, shared Course-local DST gap/overlap resolution, stable identity, and
exact persistence inputs. Worker/D1 Vitest owns guarded text/schedule updates,
expected-interval and current-time acceptance, stale actor/Course/timezone/
cancellation races, trigger rollback, retained Selection references, and the
immediate shifted Selection deadline. Worker HTTP evidence owns both nested
`PUT` contracts, trust-field rejection, server-derived schedule editability,
privacy, exact outcomes, and technical sanitization. Playwright owns separate
German forms, real content/reschedule/DST/refresh behavior, bounded exact-
start/in-progress/ended/Cancelled locks with descriptive availability,
conflict focus, desktop/360px layout, unique form landmarks, and axe scans.

For Module cancellation, booking-domain Vitest owns Active actor/Course and
same-Course Scheduled eligibility, upcoming/exact-start/in-progress/exact-end/
ended boundaries, terminal repeat, one captured instant, stable fields, and
guarded persistence outcomes. Worker/D1 Vitest owns the state-only update,
retained Selection rows and references, exact authorization/deadline
classification, rollback, and cancellation races against Selection mutation,
rescheduling, and descriptive editing. Worker HTTP evidence owns the body-free
nested `POST`, privacy, exact outcomes, current server-derived availability,
Participant historical detail, and technical sanitization. Playwright owns
German destructive confirmation, real retained Participant history and
prohibited mutations, bounded in-progress/exact-end/terminal/technical states,
refresh, keyboard/Dialog/result focus, desktop/360px layout, and axe scans.

For permanent Module deletion, booking-domain Vitest owns Active actor/Course,
same-Course Scheduled/Cancelled eligibility, the complete upcoming/exact-start/
in-progress/ended retained-reference matrix, and the explicit absence of a
removed-reference or time rule. Worker/D1 Vitest owns the guarded delete,
restrictive composite foreign key, non-cascade preservation, permanent Course
timezone history after first/last/every deletion, stale actor/Course state,
trigger rollback, and the two-sided deletion/new-Selection race. Worker HTTP
evidence owns the body-free existing item `DELETE`, post-read reference
insertion, privacy, exact outcomes, production composition, and technical
sanitization. Playwright owns real future and Cancelled deletion, bounded ended
eligibility and historical blockers, last-row empty state and timezone refusal,
refresh, keyboard/Dialog/result focus, desktop/360px layout, and axe scans.

For terminal Course archival, booking-domain Vitest owns Active actor/Course,
the upcoming/in-progress/exact-end/ended/Cancelled Module matrix, one captured
instant, terminal state, no-rewrite result, and cross-responsibility read-only/
historical predicates. Worker/D1 Vitest owns the one guarded state update,
complete retained-row snapshot, stale actor/Course and structural/booking race
outcomes, rollback, Archived Participant access/privacy, revocation, and every
existing post-archive write refusal. Worker HTTP evidence owns the body-free
`POST`, current server-derived eligibility, exact outcomes, production
composition, post-read race, and technical sanitization. Playwright owns the
German blocked-then-allowed journey, complete Archived Admin action inventory,
private Participant own history until revocation, direct refresh, stale/error
focus, desktop/360px layout, and axe scans.

For Group editing and reversible lifecycle, booking-domain Vitest owns
complete Active/Archived fields, Course-local normalized Active-name rules,
injected time, the exact future/exact-start/in-progress/ended/Cancelled
archival matrix, identity/detail retention, and reactivation without Selection
restoration. Worker/D1 Vitest owns guarded complete updates, exact reference
and state classification, Active-name and archive/Selection races, rollback,
authorization, narrow HTTP/privacy contracts, and retained Archived selected-
Group detail. Playwright owns German field editing, allowed/blocked archival,
reactivation conflict/rename/success, refresh, retained Admin and bounded
Participant historical detail, stale/technical refusals, keyboard/Dialog/
result focus, desktop/360px layout, and axe scans.

For permanent Group deletion, booking-domain Vitest owns Active/Archived
eligibility, the complete upcoming/exact-start/in-progress/ended/Cancelled
retained-reference matrix, and the explicit absence of a past-reference rule.
Worker/D1 Vitest owns the guarded delete, restrictive foreign-key protection,
non-cascade behavior, exact private HTTP outcomes, stale actor/Course state,
technical rollback, and the two-sided deletion/new-Selection race. Playwright
owns German destructive confirmation, cancel/focus restoration, deletion after
real Selection removal, bounded historical/Cancelled blockers without private
Participant data, parent-owned success focus, refresh persistence,
desktop/360px layout, and axe scans.

For Participant registration, booking-domain Vitest owns required name,
complete trimmed-email validation, case-insensitive comparison, and the absence
of provider alias normalization. Worker/D1 Vitest owns the additive migration,
principal/email uniqueness and concurrency, fresh Participant resolution,
narrow HTTP outcomes, separate Admin/Participant identities, no partial
profile, and structural production fixture exclusion. Playwright owns the
German Google entry, explicit onboarding, validation/conflict, Active
zero-membership home, direct refresh, same-principal context switching,
sign-out, privacy, desktop/360px, keyboard/focus, and axe evidence.

For Participant profile maintenance, booking-domain Vitest owns the shared
name/email policy, distinct Active-Participant self and Active-Admin operations,
Active/Disabled Admin-target eligibility, and unchanged refusal results.
Worker/D1 Vitest owns guarded profile-only writes, complete-email uniqueness
and concurrency, stale actor/target rejection, exact self/Admin HTTP outcomes,
technical sanitization, and preservation of identity, principal, state,
Assignments, Selections, and same-principal Admin data. Playwright owns German
self/Admin edit journeys, stable direct routes and refresh, Disabled-target
presentation, local/duplicate/stale refusal and focus, privacy,
desktop/360px responsiveness, and axe evidence.

For Participant lifecycle, booking-domain Vitest owns Active-Admin and exact
Active/Disabled target policy, injected-time propagation, retained identity,
and future/exact-start/in-progress/exact-end/ended/Cancelled live-history
derivation. Worker/D1 Vitest owns atomic future-Scheduled-Selection removal
across all Courses, Active/Revoked Assignment preservation, same-principal
Admin isolation, guarded Re-enable, concurrency, stale refusal, failed-batch
rollback, exact HTTP outcomes, participant-side refusal, and production
authentication. Playwright owns German confirmation, current applicable
actions, global Disabled entry/profile/Course refusal, safe sign-out, Re-enable
access, future non-restoration, retained historical/live presentation, same-
principal Admin continuity, direct refresh, stale/technical focus,
desktop/360px responsiveness, and axe evidence.

For direct Course Assignment, booking-domain Vitest owns Active/Disabled target
eligibility, Active-assignment idempotence, current actor/Course refusal, and
membership-only outcomes. Worker/D1 Vitest owns the additive migration,
restrictive ownership, one-pair uniqueness and concurrency, ordered Participant
and membership reads, guarded current-state acceptance, narrow HTTP/privacy
contracts, and absence of partial identity or Module Selection effects.
Playwright owns zero-Assignment discovery, Course membership empty/list/assign
and repeat journeys, Disabled-target presentation, stale/technical refusal,
direct refresh, Admin-gate privacy, desktop/360px, Dialog keyboard/focus, and
axe evidence.

For Course Assignment lifecycle, booking-domain Vitest owns Active-Admin and
Active/Archived-Course revocation policy, exact injected-instant propagation,
idempotent repeat, retained-row reactivation, and the recomputed assigned-
Course and in-progress Module-access predicates. Worker/D1 Vitest owns guarded
reactivation with stable identity, concurrent results, atomic future-Scheduled-
Selection removal, exact-start/begun/Cancelled retention, other-Course
isolation, failed-batch rollback, current-state refusal, private HTTP
identifiers, and technical sanitization. Playwright owns confirmation and
focus, Active and Archived membership actions, immediate access loss and
restoration, absent removed Selections after reactivation, multi-Course
independence, stale/technical outcomes, desktop/360px responsiveness, and axe
evidence.

For assigned Participant Course access, booking-domain Vitest owns the shared
Active Participant/Assignment plus Active-or-Archived Course predicate,
eligibility filtering, stable
adapter order, and one private unavailable outcome. Worker/D1 Vitest owns
guarded ordered list/detail reads, current-state refusal, exact HTTP contracts,
missing/cross-Participant/unassigned identifier privacy, own-Selection-only
Archived history, revocation loss, technical-error sanitization, and the
explicit absence of Selection persistence. Playwright
owns truthful empty/loading/error/populated list states, one/multiple Course
ordering, stable detail/direct refresh, Module/Active-Group presentation,
unavailable privacy, pre-Active request refusal, sign-out, desktop/360px,
keyboard/focus, overflow, and axe evidence.

For Participant-managed Module Selection, booking-domain Vitest owns current
eligibility, exact `startsAt` closure, explicit Group choice, independent
overlapping Modules, stable replacement/removal outcomes, and derived
current-versus-historical meaning. Worker/D1 Vitest owns the additive
migration, same-Course ownership constraints, unique Participant/Module
identity, guarded current-state writes, exact HTTP outcomes, privacy, and no
partial side effects. Playwright owns no-default validation, independent
selection and replacement, refresh persistence, removal confirmation and
focus restoration, stale-deadline refusal, private own-Selection presentation,
responsive layout, and axe evidence.

For shared Course Invite management, booking-domain Vitest owns first-create,
disable/re-enable/replace transitions, stable current identity, absence of
expiry, predecessor invalidation, and Course-name-only recognition policy.
Worker/D1 Vitest owns the additive migration, 256-bit token/SHA-256 adapters,
one-current and current-only-recoverable constraints, guarded current-state
writes, concurrent create/replacement, atomic predecessor clearing, archive
races, authorization, exact no-store HTTP contracts, narrow public/Admin
representations, and sanitized technical failures. Playwright owns real Admin
create/retrieve/copy/disable/re-enable/replace, old/new/Archived and unknown
public states, fragment cleanup, session refresh, privacy, desktop/360px,
keyboard/Dialog/result focus, overflow, and axe evidence.

For shared Course Invite Join, booking-domain Vitest owns missing/Active/
Revoked Assignment translation, Active Participant/current Invite predicates,
stable identity reuse, and refusal without side effects. Worker/D1 Vitest owns
purpose-derived HMAC continuation, cookie attributes and tamper refusal,
body-free authenticated HTTP, atomic current-state revalidation, concurrent
and repeated acceptance, two-Participant reuse, Revoked no-reactivation,
production composition, narrow responses, and technical sanitization.
Authentication tests own fixed same-origin Google success/error destinations
and prove no Invite authority enters provider URLs. Playwright owns raw-token
cleanup, refresh/auth/onboarding continuation without automatic membership,
explicit German Join confirmation, normal private access only after success,
two-Participant reuse, repeat no-op, Disabled/Revoked/Invite/Course stale
refusals, privacy, desktop/360px, keyboard/Dialog/result focus, overflow, and
axe evidence without contacting Google's UI.

For Admin Invite administration, booking-domain Vitest owns independent
coexistence, current-actor authorization, no-expiry lifecycle, Active-only
revocation, and Claimed/Revoked terminal policy. Worker/D1 Vitest owns the
additive digest-only migration, 256-bit token/SHA-256 adapters, secret-safe
persistence and serialization, fresh authorization, one-time `no-store`
creation response, ordered non-secret list, concurrent claim/Revoke outcome,
creator deletion retention, and sanitized technical failures. Playwright owns
the real German empty/create/copy/close/refresh-no-recovery/list/revoke/repeat
journey, fresh replacement after URL loss, routed terminal/loading/error
states, response and browser-artifact secret scanning, desktop/360px layout,
keyboard/Dialog focus, and axe evidence.

For invited Admin onboarding, booking-domain Vitest owns privacy-preserving
recognition, required-name validation, current Active/Disabled and deleted-
principal policy, ordinary Active authority, and terminal outcome translation.
Worker/D1 Vitest owns existing-schema claim support, digest lookup, separately
purpose-signed continuation, exact no-store HTTP, atomic update-plus-insert,
rollback, same-Invite/same-principal/Revoke races, existing-principal no-
consumption, deleted-principal new identity, production composition, and
secret/error scanning. Authentication tests own fixed `/admin/invite` Google
success/error destinations and prove raw authority never enters provider URLs.
Playwright owns fragment cleanup, refresh and abandonment, authentication
initiation, invalid/explicit name, real ordinary-Admin success, existing and
Disabled refusal without consumption, returning-principal onboarding, common
terminal/unknown privacy, two fixed-principal competition, desktop/360px,
keyboard/result focus, overflow, and axe without contacting Google's UI.

For current Admin User directory and name maintenance, booking-domain Vitest
owns Active-actor listing, nonblank-name validation, the self/ordinary/Super
target matrix, Active/Disabled targets, edit-availability derivation, identity
preservation, and guarded outcome translation. Worker/D1 Vitest owns ordered
current rows, one guarded name-only update, fresh actor/target authority,
promotion/deletion/Disable races, duplicate-name independence, same-principal
Participant isolation, rollback, exact narrow no-store HTTP, production
composition, and technical sanitization. Playwright owns real fixed Super and
invited ordinary list/self/cross-edit journeys, ordinary-to-Super refusal,
second-Super and Disabled presentation, stale loss, direct refresh, responsive
table/card alternatives, required-name/provider copy, loading/empty/error/
unavailable states, privacy, keyboard/result focus, overflow, and axe.

For one-way Super Admin promotion, booking-domain Vitest owns the complete
Active/Disabled ordinary/Super actor and Active/Disabled/already-Super/self/
missing target matrix, server-affordance derivation, identity/relationship
preservation, guarded outcome translation, and absence of demotion. Worker/D1
Vitest owns the single authority-only guarded update, fresh actor/target
authorization, several coexisting Super Admins, concurrent same-target
competition, Admin Invite and same-principal Participant retention, exact
narrow no-store HTTP, production composition, technical rollback/sanitization,
and same-cookie current-authority resolution. Playwright owns real fixed first-
Super and invited-ordinary refusal/promotion, immediate promoted authority,
refresh persistence, no-demotion presentation, desktop table and narrow-card/
detail affordances, the German permanent confirmation, keyboard/Dialog cancel
restoration, focused success/stale results, bounded Disabled presentation,
privacy, overflow, and axe.

For Admin User Disable, Re-enable, and deletion, booking-domain Vitest owns the
Active/Disabled ordinary/Super/self/missing actor-target matrix, permitted-
action derivation, exact refusals, Re-enable identity/authority preservation,
and guarded outcome translation. Worker/D1 Vitest owns the ninth additive
history-preserving migration, state-only transitions, current-identity-only
deletion, fresh actor/target/authority guards, concurrent cross-Super attempts,
the last-Active-Super invariant, technical rollback, and unchanged Course,
Group, Module, Participant, Assignment, Selection, Course Invite, Admin Invite,
bootstrap-attribution, and same-principal Participant rows. HTTP evidence owns
exact command routes, narrow no-store representations, Disabled/deleted same-
session access, restored access, production composition, and new-Invite return
as a new ordinary identity. Playwright owns real fixed ordinary/Super permitted
and refused actions, German destructive non-cascade copy, Disable/Re-enable/
delete presentation, removed-row completion, post-action Admin access, shared-
Participant independence, new-Invite return, desktop table and 360px detail,
keyboard/Dialog cancellation and result/error focus, bounded stale/final-Super
and self-protection, privacy, overflow, and axe.

For administrative participation inspection, booking-domain Vitest owns the
complete injected-time live/historical predicate, exact start/end phases,
Disabled/Revoked/Archived/Cancelled transitions, valid in-progress return to
live meaning, ownership mismatches, and retained Archived selected-Group
identity/details. Worker/D1 Vitest owns normalized Course, Assignment/
Participant, Module, Group, and Selection composition, deterministic ordering,
Active and Archived Course reads, the lifecycle matrix, current and stale
Active-Admin guards on every statement, exact route/method/no-store behavior,
sanitized failure, production composition, and an unchanged narrow Participant
response without peers, Assignments, counts, or Admin data. Playwright owns the
real zero-participation Active/Archived Course journey, direct refresh,
loading/empty/unavailable/technical focus, responsive desktop table and 360px
list alternatives, stable Participant detail, future/in-progress/exact-ended/
Cancelled/Disabled/Revoked/Archived presentation, retained Archived Group
details, Participant privacy probes, keyboard focus, overflow, and axe.

The implemented integration uses project-pinned `@cloudflare/vitest-plugin`
with isolated D1 state and the version-controlled migration sequence.

### Browser Tests

Playwright is the initial browser E2E tool. Routine CI starts with Chromium
only; more browsers or devices require a demonstrated compatibility need.
Locator assertions allow ten seconds for production-like local Worker/D1
responses, while tests remain single-worker and retry-free so a real failure
is not hidden by automatic reruns.
On x86_64 NixOS, the development flake supplies Chromium and uses the existing
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` configuration seam; this local provision
does not change the Playwright project or CI browser installation.

Normal pull-request CI runs Playwright against a local production-like
application composed from Vite/static assets, the Worker API, and an isolated
local D1 database. Tests must start from deterministic state rather than a
developer's database. The fixture/Playwright server and migration preparation
use a dedicated generated Wrangler persistence root; resetting it must leave
normal manual-development state untouched. Representative flows should
eventually cover:

- an Admin User creating and configuring a Course;
- a Participant joining and accessing a Course;
- a Participant selecting a Module and Group, changing Group, and revoking
  future participation;
- invite-link and Course Assignment revocation behavior; and
- important authorization failures.

Detailed product invariants remain lower-level-test responsibilities.

Routine E2E must not automate Google, Apple, Microsoft, or Facebook login UIs.
The implemented direction is an explicitly non-production Better Auth
test-capable composition that establishes normal application sessions for
twelve fixed identities: `first-admin`, `later-admin`, `participant-a`,
`participant-b`, `invite-participant-a`, `invite-participant-b`,
`selection-participant`, `admin-invite-a`, `admin-invite-b`, `admin-invite-c`,
`admin-invite-d`, and `returning-admin`.
Playwright then exercises the normal authenticated application and real
booking-domain authorization; test authentication must not mock or bypass it or
permit arbitrary-principal impersonation.

Production composition must contain no activatable test-authentication route
or bypass and must fail closed regardless of headers, queries, or cookies when
test-only authentication is requested. A focused automated regression must
prove this structural property. Hosted staging or preview test-authentication
requires a CI-controlled secret or equivalently strong non-public gate. The
implemented Google provider has focused Worker-boundary evidence for
environment wiring, the one callback, and external application-destination
rejection without contacting Google's hosted UI. See [authentication and
sessions](../architecture/authentication-and-sessions.md#non-production-authentication).

The Admin browser flow uses fixed named fixture identities to prove the state
after authentication: the first name form is absent before authentication,
bootstrap still creates one Active Super Admin, later normal login resolves
authoritative Admin state, and Better Auth sign-out terminates the session and
returns to the unauthenticated entry. CI supplies only visibly fake test
provider configuration and never requires real Google credentials. The build,
Worker-test, and Playwright-server commands disable local `.env` loading so a
developer's provider secrets cannot become automated-test inputs or generated
preview artifacts.

The Participant browser flow proves authentication alone creates no booking
identity, mandatory profile input creates one Active Participant, duplicate
email and stale outcomes have no partial effect, no Course request occurs before
the Participant becomes Active, and the Active gate returns a truthful private
assigned-Course list or zero state. The same normal session resolves distinct
Participant/Admin identities. Real Google provider interaction for both
contexts remains a documented manual smoke in [authentication and
sessions](../architecture/authentication-and-sessions.md#manual-local-google-smoke).

The browser harness declares `@axe-core/playwright` and scans each critical
Admin state plus both application contexts at normal desktop and 360px-wide
viewports. Axe supplements rather than replaces assertions for
landmarks/headings, named list navigation, control names, keyboard-only
activation, visible focus, field/error association, Drawer/Dialog trapping and
restoration, result/error focus, direct navigation and refresh, Participant
onboarding/assigned-Course/zero-membership/privacy states, Participant
directory and Course membership/Assignment-lifecycle states, Participant
self/Admin profile editing and lifecycle, Course editing and permanent
timezone-lock presentation, Disabled-target detail, and absence of horizontal
overflow. The current 63-test browser suite also proves that one
fixed normal session remains usable while navigating between Participant and
Admin contexts, successful sign-out terminates that session, an Active Admin
can create, edit, and revisit a Course with Groups, a future Module, a
permanently locked timezone, and direct Participant membership, revoke and
reactivate that retained Assignment without
restoring removed future Selections, and preserve independent other-Course
access. It also proves global Participant Disable, safe Disabled sign-out,
same-principal Admin continuity, Re-enable without future-Selection
restoration, and retained historical/live presentation. An Active Participant
can access only assigned Active or Archived Courses while missing or inactive
Participant context causes no private Course-access request.
It also proves retained-identity Group editing, allowed and exact-blocked
archival, Active-name-conflicted then successful reactivation, and retained
Archived Group details/state in Participant history. Permanent Group deletion
is proven after a real Selection removal, with target-only persistence,
confirmation/cancel focus, refresh, and privacy-safe historical/Cancelled
reference blockers. It also proves Module descriptive editing, Course-local
pre-start rescheduling, DST gap and explicit overlap handling, exact/in-
progress/ended/Cancelled schedule locking without content lockout, stale-
schedule focus, refresh persistence, unique form landmarks, and deadline-
sensitive definite instants.
It also proves upcoming and in-progress Module cancellation, exact-end
refusal, terminal status, body-free trust boundaries, immutable schedules,
continued descriptive editing availability, retained Participant Group
history, prohibited Selection mutation, Dialog/error/success focus, and
refresh persistence.
It also proves permanent Module deletion after real Selection removal, real
Cancelled and bounded ended eligibility, privacy-safe current/historical
blockers, stale/technical errors, confirmation/cancel/result focus, last-row
empty state, permanent Course timezone refusal, and refresh persistence.
It also proves blocked then allowed terminal Course archival, exact-end and
future-Cancelled eligibility, no Archived structural action surfaces, retained
private Participant history, prohibited Selection mutation, later Assignment
revocation and access loss, direct refresh, stale/technical refusal, Dialog/
result focus, desktop/360px layout, and axe scans.

On browser-test failure, CI should retain short-lived useful diagnostics such
as the Playwright report, traces, screenshots, and relevant logs. Artifacts
must exclude secrets, tokens, and sensitive production data and should not be
uploaded without failure or debugging value.

### Hosted And Production Checks

The release gate runs Playwright against a real Cloudflare staging or preview
deployment. After production deployment, verification is limited to safe,
non-destructive smoke checks such as serving the application entrypoint or a
harmless readiness/read operation. Regression tests never create synthetic
Courses, Participants, bookings, authentication identities, or sessions in
production.

## Canonical Repository Command

`pnpm check` is the one comprehensive non-deployment verification entrypoint.
The current scripts include:

```sh
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm check
```

`pnpm test` composes the repository's Node tooling tests, booking-domain Vitest,
and Worker/D1 Vitest. `pnpm check` adds lint, the production Vite/Worker build,
and local Chromium Playwright E2E. Release CI must reuse the same underlying
surfaces rather than maintain a hidden alternative suite.

NixOS developers may run these commands inside `nix develop`, which supplies
host tools but does not install the pnpm dependency graph or run verification
automatically. `nix flake check` validates the normal flake outputs only; it is
not a second comprehensive repository command.

## Pull-Request CI Gate

The repository's GitHub Actions CI workflow currently:

- runs for pull requests targeting `main` and pushes to `main`;
- reads Node and pnpm versions from repository declarations;
- installs from `pnpm-lock.yaml` with `--frozen-lockfile`;
- installs the project-pinned Playwright Chromium and its runner dependencies;
- runs `pnpm check` in the uniquely named `verify` job;
- remains independent of the local Nix development environment;
- uses read-only repository permissions and no Cloudflare credentials; and
- cancels superseded verification for the same pull request or branch.

Cloudflare preview deployment is not required for each pull request. Local
Worker, D1, and browser verification is the current PR contract.

## External Main-Branch Protection

Repository files define but cannot activate GitHub branch protection. The
remote `main` ruleset must:

- require pull requests and a successful `verify` status before merge;
- prevent silent bypass of that required check; and
- prevent force-pushes and deletion unless a conscious governance decision
  explicitly permits them.

The workflow's presence does not prove these remote settings are active.

## Application Implementation Trigger

The change that introduces the first deployable application is incomplete
unless it, or a directly associated change, also adds real tests and
configuration for the behavior introduced: Vitest, the current Cloudflare
Workers Vitest integration, Playwright, the local application E2E harness,
migration tests, and expanded root verification composition as applicable.
Empty test configurations are not an acceptable substitute, and product
runtime code must not accumulate while these applicable regression surfaces
are postponed indefinitely.
