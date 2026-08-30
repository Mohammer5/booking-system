# Architecture Status

## Accepted Direction

- Cloudflare is the intended production platform.
- The initial deployment is one conceptually named booking-system web
  application workspace at `apps/booking-system-web`, with one application
  package manifest, running in Cloudflare Workers.
- Vite builds frontend assets served through Workers Static Assets, with
  frontend and `/api/*` requests composed at one same-origin deployment.
- The web application owns the browser experience, static assets, Worker and
  `/api/*` handling, private technical adapters, and its composition root; no
  separate `apps/api` application is planned initially.
- Browser-facing and Worker/API-facing code remain distinct internal
  responsibilities. They may share declarations in the application manifest,
  but explicit source boundaries keep their implementation dependencies
  separate and their source/build graphs determine their respective outputs.
- The initial browser experience is React-based, with `react` and `react-dom`
  as foundational browser dependencies. It uses `react-router` in Declarative
  Mode for stable URL-to-view navigation, `@tanstack/react-query` for server
  state, `react-hook-form` for transient form mechanics, and `i18next` with
  `react-i18next` for localization. `classnames`, `debug`, and `ramda` remain
  optional and are introduced only for a concrete use.
- Material UI is the accepted browser component library and visual foundation.
  Free MUI Core components, one repository-owned theme, responsive Material
  interaction patterns, and a WCAG 2.2 AA-oriented accessibility baseline
  remain browser-private; MUI X Community requires a concrete need, and paid
  MUI components are excluded.
- Every independently navigable browser view receives a route, without turning
  incidental UI state into routes. Frontend routes support direct navigation
  and refresh through the same-origin deployment; `/api/*` remains Worker/API
  owned.
- Authenticated Admin information architecture uses exactly four top-level
  resource collections—Courses, Participants, Admin Users, and Admin Invites—
  with Course Participant/Assignment, Group, and Module collections nested
  beneath Course. Collection state is URL-owned and Worker-paginated; details
  own one resource and compact relationship summaries rather than complete
  child collections.
- German is the initial frontend language. Stable semantic translation keys,
  language-independent route paths, and language-neutral domain outcomes allow
  later languages without changing the architecture.
- JavaScript follows domain-oriented functional composition inside vertical
  slices: explicit narrow dependencies, instruction-shaped workflows, visible
  conceptual decisions, selective functional techniques, and late
  abstraction remain subordinate to existing architecture boundaries.
- Ramda is accepted selectively in browser/application code,
  runtime-compatible Worker/application workflows, and `packages/booking`
  domain code. Each workspace declares it only when real source uses it and
  its boundary map permits that source responsibility to import it.
- `packages/booking` is the intended initial conceptual domain package, with
  `admin-access`, `course-structure`, `course-access`, and
  `module-participation` as distinct internal responsibility modules rather
  than separate workspaces.
- Deployed relational persistence uses D1 with SQLite-compatible SQL semantics.
- Local/test, staging, and production persistence are isolated; staging and
  production use separate D1 databases.
- Better Auth is the intended application-owned authentication layer inside
  `apps/booking-system-web`, backed by the application's D1 database.
- The application-to-booking authentication seam exposes only
  `externalPrincipalId`; domain identity, state, authority, and permissions are
  resolved fresh from booking persistence rather than authentication claims.
- Authentication uses one database-backed opaque cookie session per stable
  external principal. Each request resolves the context-relevant Participant
  or Admin User and its authorization from authoritative current domain state;
  domain role and permission snapshots do not enter the session.
- Implicit provider linking is disabled in v1. Deterministic browser tests use
  a separately composed, explicitly non-production Better Auth session
  mechanism that must be structurally unavailable in production.
- Google is the implemented normal provider for local development. Its Client
  ID, Client Secret, and Better Auth secret enter only through Worker runtime
  environment configuration; account linking is explicitly disabled.
- First Admin bootstrap availability is permanent historical state independent
  of current Admin User rows, and consuming bootstrap plus creating the first
  Active Super Admin is one atomic persistence outcome.
- The implemented application slices have a same-origin Admin entry, Google
  sign-in and Better Auth sign-out, bootstrap/current-context HTTP, and
  freshly authorized Course index/create/detail/update plus nested Group
  creation/edit/archival/reactivation/deletion and Module creation/descriptive-
  edit/pre-start-reschedule/cancellation/deletion HTTP, plus fresh
  Participant context, explicit onboarding and
  self-profile maintenance, the global Admin Participant directory and stable
  profile detail plus Disable/Re-enable HTTP, Course Assignment list/create/
  reactivate/revoke HTTP, and private assigned Participant Course list/detail
  HTTP for Active or Archived Courses, shared Course Invite management and
  public recognition/signed-continuation/explicit-Join HTTP, authenticated
  Admin Invite create/list/revoke and public recognition/signed-continuation/
  atomic-claim HTTP, current Admin User list/detail/name-edit, body-free
  promotion/Disable/Re-enable HTTP, and guarded identity deletion HTTP, plus
  terminal body-free Course archival HTTP.
  Application destinations remain fixed and browser input cannot select
  principal, authority, Assignment identity/state, lifecycle state,
  normalized email, definite instant, or permanent scheduling history.
- The initial infrastructure boundary is Worker, Workers Static Assets, and D1.
- MVP implementation and local acceptance use Worker/D1-compatible tooling,
  configuration, and semantics from the beginning; a conventional
  long-running Node server or unrelated database is not an interim
  architecture.
- On x86_64-linux, Nix supplies reproducible developer-host tooling while
  `package.json` and `pnpm-lock.yaml` continue to own application dependencies;
  the development shell is not a second application runtime.
- Account-bound Cloudflare Worker environments, remote staging and production
  D1 databases, deployment credentials, and release infrastructure are
  intentionally deferred until [release
  hardening](../DICTIONARY.md#release-hardening), after the MVP is
  feature-complete and accepted locally.

## Current Implementation

- `@booking-system/booking` and `@booking-system/booking-system-web` are real
  modern-ESM workspaces with one manifest each.
- The booking package exposes the first-bootstrap/fresh-context and Admin
  Invite create/list/revoke/recognize/claim plus current Admin User list/
  name-edit/one-way-promotion/Disable/Re-enable/delete `admin-access`
  operations and server-affordance policy, plus
  `course-structure` factories for Course creation/editing, Course-wide Group
  creation/editing/archival/reactivation/permanent deletion, and future Module
  creation, lifetime descriptive editing, pre-start rescheduling, and terminal
  before-end cancellation with retained Selection history plus permanent
  unreferenced deletion and terminal no-rewrite Course archival;
  `course-access` factories for fresh
  Participant context,
  registration, self/Admin Participant profile maintenance, Participant
  Disable/Re-enable, Course Assignment creation/revocation/reactivation, and
  current assigned Active/Archived-Course
  list/detail access, together with Course Invite create/disable/re-enable/
  replace, minimal-recognition, and explicit Join policy, plus
  `module-participation` factories for Participant Selection set/change/remove
  and derived current/history presentation.
  Course-local time resolution and complete-email
  normalization remain internal to their owning responsibility modules.
- The web application has distinct `browser`, `worker`, and `authentication`
  responsibilities plus thin browser, production Worker, and non-production
  Worker compositions.
- The Worker now owns one private `admin-collections` contract for strict
  pagination, search, filter, and sort parsing across Courses, global
  Participants, Admin Users, Admin Invites, Course Assignments, Groups, and
  Modules. D1 reads bind user-controlled values, choose ordering only from
  resource-owned static maps with ID tie-breakers, count after filters, and
  return requested page metadata. Course-owned lists include guarded parent
  context; Group and Module item reads enforce same-Course ownership; the
  focused Course detail returns retained relationship counts and an
  authoritative archival affordance; and Participant options are bounded and
  include Course-specific Assignment state or explicit absence. Existing
  mutations and Invite-secret handling are unchanged, and no schema migration
  or speculative index was required.
- React Router serves the independently navigable `/` Participant entry,
  public `/invite` continuation and Join,
  Participant `/profile` and `/courses/:courseId` detail,
  `/admin` administration entry, public `/admin/invite` onboarding,
  `/admin/invites`, `/admin/users`, stable `/admin/users/:adminUserId`,
  `/admin/participants`, stable
  `/admin/participants/:participantId` detail/edit, and nested
  `/admin/courses`, `/admin/courses/new`, `/admin/courses/:courseId`,
  Course Participant collection/detail, and Course Group collection/create/
  detail views. Legacy browser participation paths replace-redirect to the
  Participant paths.
  An authoritatively resolved Active Admin now receives a replace redirect from
  `/admin` to `/admin/courses` and an authenticated layout whose named sticky
  desktop navigation contains exactly Courses, Participants, Admin Users, and
  Admin Invites. The same resources share the shell's one narrow modal Drawer
  with the Participant/Admin context switch; all non-Active and public Admin
  Invite states remain outside that resource layout. Identity, authority,
  self-detail, and sign-out stay outside the resource list, with one page-level
  main landmark, the existing skip link, and stable route titles. Courses,
  global Participants, Admin Users, and Admin Invites now share one
  browser-private normalized collection-state concept: applied state is URL-
  owned, queries carry the complete state, wide views use semantic sortable
  tables, and narrow views render named cards for the same Worker page. Each
  resource retains its own allowlisted filters, sorts, fields, and actions;
  Admin User lifecycle controls remain detail-owned and one-time Admin Invite
  URLs remain mutation-local. The Participant route resolves current state,
  offers fixed-destination Google entry, requires
  explicit name/email onboarding when missing, and returns an Active
  Participant to a query-driven zero/one/multiple assigned-Course home without
  public discovery. Its stable detail exposes relevant Course, Module, Active-
  Group, and own Selection data only, with explicit set/change/remove controls
  before the Module starts in an Active Course; Archived detail is explicitly
  read-only and every retained Selection is historical, while a selected
  Archived Group still retains its details/state. The Admin Participant directory includes
  registered zero-Assignment Participants and links to guarded profile-only
  maintenance plus the one current Disable/Re-enable action for Active and
  Disabled targets. The Participant gate presents a freshly Disabled target
  with safe sign-out and mounts no private Participant view. Stable Course
  detail owns complete Course editing, its permanent timezone lock, linked
  child-resource counts, and terminal Course archival. Stable nested Module
  collection/create/detail routes own create/edit/reschedule/cancel/delete
  interactions and retained read-only history. Course
  membership is independently navigable: the URL-owned Course Participant collection
  renders one server page of retained Assignment/Participant rows as a semantic
  table or narrow card list with exact search, filters, sorting, and pagination.
  Its stable Participant detail owns Assignment lifecycle and presents
  no/live/historical per-Module Selections with retained Archived selected-
  Group details. Direct Assignment and assisted Selection target dialogs share
  a bounded server-search picker, and Archived Courses remain historical and
  read-only except for accepted Active-Assignment revocation. The former broad
  all-Course participation overview and its Worker batch read are retired.
  Course Groups are likewise independently navigable through a URL-owned,
  server-paginated collection plus stable create and detail routes. Group detail
  owns complete fields, editing, archival, reactivation, deletion, exact
  retained-reference/name-conflict refusals, and focus. Guarded item reads
  enforce same-Course ownership and fresh Active-Admin state; Archived Course
  Group collection/detail remain visible and read-only, while direct creation
  presents the same restriction without mounting its form.
  Active Course detail additionally owns the one-current shared Invite URL,
  copy and lifecycle controls. The public Invite route captures a token from a
  URL fragment, removes it from the address bar, replaces it after recognition
  with a signed `HttpOnly` digest continuation, and carries that continuation
  through fixed Google authentication and Participant onboarding. It renders
  no private Course context before a separate explicit Join confirmation.
  Membership cards expose only current
  permitted revoke/reactivate actions with confirmation and accurate retention
  copy. The Admin Invite route lists non-secret creation time and explicit
  Active/Claimed/Revoked state, exposes Revoke only for Active rows, and keeps
  each complete fragment URL only in the transient successful creation Dialog.
  The public Admin Invite route cleans raw fragment authority, continues with
  a separately purpose-signed `HttpOnly` digest cookie through fixed Google
  return, resolves current Admin state, requires an explicit name, and presents
  common unavailable, existing-principal, stale, and ordinary-Admin success
  states without mounting administration data.
- The Admin User directory renders a semantic table on desktop and card list at
  narrow width, while stable detail exposes explicit authority/state and only
  server-derived permitted name, promotion, and lifecycle actions. The shared
  German promotion Dialog explains the permanent one-way change and owns
  keyboard, cancel-restoration, stale-error, and success focus. Success and
  stale outcomes reconcile directory, detail, and current-Admin caches without
  making provider data authoritative or exposing demotion.
  Shared lifecycle dialogs explain access loss, non-cascade, preserved
  identity/authority on Re-enable, and permanent current-identity deletion plus
  new-Invite return. They preserve cancel/error/success focus, and deletion
  moves success above the removed row or back to the directory.
- TanStack Query owns remote Admin, Admin User, Admin Invite, Course, Participant profile,
  Assignment, and Module Selection state;
  React Hook Form owns the Admin-name, Course, Group create/edit, Module, and Participant-
  onboarding/profile forms; and German-first slice-owned i18next resources own
  all browser copy.
  Native local date/time fields and MUI radio groups expose IANA-zone DST
  gap/overlap resolution without a date library or MUI X. The current-Admin
  page is a nested route gate, so no Course query mounts before an Active Admin
  resolves. Participant entry is the equivalent nested current-context gate,
  so list/detail queries mount only after an Active Participant resolves.
- Free MUI Core 9.4.0 and its Emotion styling dependencies are pinned in the
  application manifest. One browser-owned theme and `CssBaseline` establish
  typography, spacing, surfaces, responsive breakpoints, and visible focus;
  both shell contexts and the complete `/admin` experience use direct MUI Core
  components.
- Browser-only boundary permissions and production-build graphs keep MUI and
  Emotion out of booking, Worker, persistence, and authentication source and
  out of the built Worker output.
- Vite and the Cloudflare Vite plugin build the browser and Worker outputs;
  Workers Static Assets provides SPA fallback while `/api/*` runs Worker-first.
- Better Auth 1.7.2 uses D1-backed normal sessions and crosses into booking
  behavior only as `externalPrincipalId`. Google sign-in uses the one normal
  `/api/auth/callback/google` provider callback and returns to the fixed
  `/admin`, `/admin/invite`, `/invite`, or `/` application context. Twelve
  fixed non-production fixture identities use a separate executable
  composition.
- Nine version-controlled D1 migrations implement the authentication/Admin
  foundation plus additive Course, Group/Module, Participant, Course
  Assignment, same-Course Module Selection, Course Invite, Admin Invite, and
  history-preserving Admin deletion schemas. Manual
  development and fixture/Playwright runs use
  separate generated Wrangler persistence roots, so test preparation cannot
  invalidate a running development database. Atomic
  `D1Database.batch()` preserves exactly-one first bootstrap; guarded Course,
  Group, and Module inserts recheck Active Admin and applicable Course state at
  write acceptance. Guarded Course updates change all three editable fields,
  require the expected current timezone, and permit a timezone change only
  before permanent first-Module history. Module insertion rechecks the Course
  timezone used for schedule resolution, so a concurrent edit and first Module
  cannot both win with inconsistent instants. Constraints preserve stable
  ownership and normalized
  Active Group uniqueness, while a Module-insert trigger records permanent
  Course scheduling history atomically. Participant principal and whole-email
  uniqueness constraints make one insert the complete registration outcome.
  Guarded profile-only updates reuse the same unique comparison key, recheck
  an Active self actor or Active Admin plus registered Active/Disabled target,
  and leave identity, state, principal, Assignments, Selections, and
  same-principal Admin data unchanged. They require no schema migration.
  Guarded Admin User Disable/Re-enable change only target state; guarded delete
  removes only the current identity. Every command freshly rechecks actor,
  target, ordinary/Super authority, self-protection, and an Active-Super
  remainder inside the accepting SQL statement. Historical bootstrap/Admin-
  Invite actor IDs remain unchanged, as do all booking and same-principal
  Participant rows.
  Atomic guarded Participant Disable removes only future Scheduled Selections
  across all Courses before changing the retained Participant state; exact-
  start/begun/ended Scheduled, Cancelled, Assignment, same-principal Admin,
  stale, and failed-batch data remains. Guarded Re-enable changes only the
  retained Participant and restores no removed Selection.
  Assignment foreign keys and a unique Participant/Course pair preserve one
  ordinary membership. A guarded upsert rechecks current Active Admin, Active
  Course, and registered Active/Disabled target state while reusing a Revoked
  row. Atomic guarded revocation deletes only future Scheduled Selections and
  changes that retained row in Active or Archived Courses; exact-start/begun,
  Cancelled, other-Course, repeated, stale, and failed-batch data remains.
  Separate narrow
  Participant Course reads join current Active Participant, Active Assignment,
  and Active or Archived Course state, order list/Module/Group data
  deterministically, and restrict Participant Groups to Active state plus any
  own selected Archived Group without adding a migration.
  A separate Admin participation batch independently guards every Course,
  Assignment/Participant, Module, Group, and retained Selection statement with
  the same current Active Admin ID and requested Course. The Worker derives
  Selection meaning from those rows and one captured instant; no Selection
  status is stored and no Participant contract is widened.
  Guarded Selection replacement/removal rechecks current Participant,
  Assignment, Course, Module, Group, and deadline state in SQL; one unique
  Participant/Module pair preserves stable identity while composite references
  prevent cross-Course Module/Group ownership.
  Guarded Group updates and lifecycle transitions reuse the existing schema,
  recheck Active Admin/Course, expected Group state, normalized Active-name
  uniqueness, and exact future Scheduled-Selection references, and never
  rewrite a Selection. The accepting predicates, partial unique index, and
  existing Active-Group Selection guard give one valid winner to concurrent
  archive/Selection and conflicting-name attempts.
  Permanent Group deletion reuses the schema and one guarded delete to recheck
  Active Admin/Course state and the absence of every retained Selection. The
  restrictive Selection foreign key arbitrates a concurrent new reference;
  success cascades nothing and no removed-reference audit is introduced.
  Guarded Module cancellation changes only same-Course Scheduled state while
  rechecking Active Admin/Course and exact before-`endsAt` acceptance. It
  retains schedule, content, identity, and every Selection row; existing
  Selection guards and restrictive references arbitrate concurrent mutation,
  while descriptive editing remains available after cancellation.
  Permanent Module deletion reuses one guarded delete and the restrictive
  Selection foreign key to recheck Active Admin/Course and zero retained
  references. Success removes only the Module row and leaves permanent Course
  scheduling history set; deletion/new-Selection races have one valid winner.
  Terminal Course archival reuses the schema and one guarded update to recheck
  Active Admin/Course plus zero Scheduled Modules with `ends_at` after the
  accepted instant. Success changes only Course state; current Active-Course
  guards freeze every related write except explicit Assignment revocation, and
  archive/Module races have one valid winner.
- Both explicit workspace boundary maps are registered in ESLint. The boundary
  converter denies undeclared third-party imports and supports exact test-only
  and composition-interface permissions.
- Repository, domain, Worker/D1, migration, production-composition, build, and
  Chromium E2E verification are integrated into `pnpm check` and CI. Critical
  Admin, Course, Participant, and shell states receive axe scans plus explicit
  desktop/narrow, keyboard, modal focus/trapping/restoration, semantic
  navigation, name/label, error-association, direct/refresh, privacy, stale
  refusal, onboarding/zero-membership/sign-out, same-principal dual-context,
  Participant directory and Course membership/Assignment states, Disabled
  targets, Participant Disable/Re-enable, global refusal and safe sign-out,
  future non-restoration, retained historical/live presentation, same-
  principal Admin isolation, Assignment revoke/repeat/reactivate, Archived
  refusal, access loss/restoration, multi-Course isolation, idempotent repeat,
  assigned-Course list/detail/refresh, current-state loss, identifier privacy,
  self/Admin Participant profile editing,
  Disabled-target detail, duplicate/stale profile refusal, explicit no-default
  Module Selection,
  overlapping-Module independence, replacement/removal, confirmation focus,
  stale-deadline refusal, truthful current/history presentation, Group/Module
  creation, Module descriptive editing/pre-start rescheduling/locked states,
  Module cancellation/deadline/retained-history states,
  Module deletion after Selection removal, ended/Cancelled eligibility,
  privacy-safe blockers, and permanent zero-current-Module timezone lock,
  Group editing/allowed-or-blocked archival/reactivation, permanent
  deletion after removal, historical/Cancelled reference blockers, and retained
  historical details, Course editing, permanent timezone locking with zero current
  Modules, DST gap/overlap, exact-instant, and overflow assertions.
- The root flake supplies Node 24, pnpm 11.17.0, Git, Markplane, Chromium, and
  a Nix-patched official workerd 1.20260826.1 binary for x86_64-linux. It points
  Miniflare and Playwright at the Nix executables and supplies Miniflare with
  the Nixpkgs CA bundle for local outbound HTTPS, without patching the checkout
  or changing Cloudflare runtime semantics.

Optional `classnames`, `debug`, and `ramda` dependencies remain absent because
current source has no concrete use for them. Apple, Microsoft, and Facebook
integration, remote Google credentials and production callback/domain
configuration, production deployment, remote Cloudflare environments and D1
databases, deployment credentials, and release infrastructure remain absent.
Release hardening and real staging verification remain mandatory before the
first production release.

The accepted Admin collection/detail normalization is tracked by
`EPIC-ruijc`. Its canonical convention, authenticated Admin navigation layout,
Worker collection contracts, and four top-level browser collections are
implemented. Course Participant collection/detail navigation, compatibility
redirects, bounded Participant pickers, and broad-overview retirement are also
implemented. Course Participant, Group, and Module collection/create/detail
navigation, their responsive URL-owned collections, and all embedded-
management removal have landed. Focused Course detail now owns only Course
data/lifecycle/Invite actions, a semantic breadcrumb, and three linked retained
counts whose unfiltered child totals are verified equal.
