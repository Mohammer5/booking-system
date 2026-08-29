# Docs Status

The indexed docs system is active for the product, process, and architecture
areas. Each area has a human-oriented overview, routing index, current status,
rationale, and focused topic docs.

The indexed product area now defines the accepted, implementation-agnostic
booking-system domain and behavior. It has a human-oriented overview, routing
index, current status, rationale, focused responsibility docs, explicit
non-goals, and representative scenarios.

The repository has accepted an architecture and delivery direction:

- one Cloudflare Worker-based application at `apps/booking-system-web`, owning
  the browser/Vite experience, static assets, `/api/*`, technical adapters, and
  composition root;
- a React-based browser experience using `react` and `react-dom`, React Router
  Declarative Mode, TanStack Query server state, React Hook Form form mechanics,
  German-first i18next localization, accepted browser-private Material UI as
  the component and accessible visual foundation, and domain-oriented
  functional composition with selectively used Ramda;
- one conceptual domain package at `packages/booking`, with Admin access,
  Course structure, Course access, and Module participation as internal
  responsibility modules;
- Vite-built frontend assets and same-origin API composition;
- D1 persistence with SQLite-compatible semantics and isolated environments;
- Better Auth inside the Worker with D1-backed opaque sessions, one stable
  external principal per session, context-specific domain identity resolution,
  no session-cached booking authorization, and Google as the implemented
  normal local provider with explicit no-linking configuration;
- GitHub Actions CI/CD, Vitest, the Workers Vitest integration, and Playwright;
- a root x86_64-linux Nix development shell for host developer tooling, with
  project JavaScript and Cloudflare dependencies still pnpm-owned; and
- release-tag production promotion after real Cloudflare staging verification.

The accepted delivery sequence is:

1. use the accepted Cloudflare Worker, Workers Static Assets, and D1
   architecture;
2. implement the MVP and validate it locally with Worker/D1-compatible
   semantics;
3. after local acceptance, complete [release
   hardening](DICTIONARY.md#release-hardening) by provisioning account-bound
   infrastructure, credentials, and the remote release path;
4. validate the release candidate in real Cloudflare staging; and
5. promote the same verified release to production.

Remote Cloudflare environments and remote staging/production D1 databases are
therefore not prerequisites for MVP implementation. The operational
prerequisites for the first deployable application are resolved for
pre-implementation planning, and planning may proceed to creation of the real
implementation backlog in Markplane. Release hardening and hosted staging
verification remain mandatory before the first production release.

The local application foundation, Course creation/editing, Group reversible
lifecycle/permanent deletion, Module creation/editing/cancellation/deletion,
terminal Course archival with private read-only history,
Participant registration/profile/lifecycle
maintenance, Course Assignment creation/lifecycle, assigned Participant
Course access, shared Course Invite management/recognition/Join, Admin Invite
administration/onboarding, Admin User directory/name maintenance/promotion, and
Participant Module Selection slices are now
implemented:

- `@booking-system/booking` at `packages/booking` owns the implemented
  `admin-access` first-bootstrap and Admin Invite create/list/revoke/
  recognition/claim plus current Admin User list/name-edit/promotion behavior
  plus `course-structure` Course, Course-wide Group,
  future Module creation, lifetime descriptive editing, pre-start
  rescheduling, terminal cancellation with retained Selection history,
  permanent deletion with exact retained-reference and timezone-history policy,
  guarded Course editing with its permanent timezone lock and terminal
  no-rewrite archival,
  Group complete editing/archival/reactivation/permanent deletion with exact
  retained-Selection policy, and Course-local definite-time creation policy, plus
  `course-access` Participant registration, fresh context, Course Assignment
  creation/revocation/reactivation, assigned Active/Archived-Course list/detail, and
  self/Admin profile-edit plus Participant Disable/Re-enable policy, together
  with one-current Course Invite lifecycle, minimal recognition, and explicit
  Join policy, and
  `module-participation` Participant selection eligibility, replacement,
  removal, and current-versus-historical presentation policy;
- `@booking-system/booking-system-web` at `apps/booking-system-web` owns the
  React `/` Participant Google entry/onboarding/home, `/admin` administration
  flow, Participant directory, nested Course index/create/detail/update routes,
  Participant lifecycle, Course membership and Assignment interaction, and
  Course editing plus Group/Module creation forms, Group edit/lifecycle/delete
  cards, separate Module descriptive/schedule forms plus cancellation and
  deletion Dialogs, terminal Course archival and Archived read-only detail,
  and retained selected-Group history, plus the Participant
  `/courses/:courseId`
  detail, explicit Module
  Selection controls, `/profile` self-service and
  `/admin/participants/:participantId` administration, Active-Course Invite
  controls, the public `/invite` continuation/Join route, directly navigable
  `/admin/invites` administration with one-time creation results, public
  `/admin/invite` signed continuation and ordinary-Admin onboarding,
  `/admin/users` current Admin directory and stable
  `/admin/users/:adminUserId` name detail/edit plus permanent Super Admin
  promotion confirmation, and query-driven
  assigned-Course home, Worker/API
  handling, Better Auth composition, D1
  persistence, Vite/Workers Static Assets integration, and local runtime;
- eight version-controlled migrations create the Better Auth/Admin foundation,
  Courses, additive Group/Module schema with permanent first-Module scheduling
  history, constrained Participants, constrained Course Assignments, and
  same-Course Module Selections, constrained Course Invites, and digest-only
  terminal Admin Invites, with clean-
  state construction and
  data-preserving upgrade evidence;
- production and explicit non-production Worker compositions structurally
  separate fixed fixture-session establishment from production, while their
  manual-development and fixture/Playwright D1 state use separate generated
  Wrangler roots;
- the `/admin` browser flow starts fixed-destination Google sign-in, requires
  authentication before the first-Admin name form, and supports Better Auth
  sign-out in every authenticated Admin-route outcome;
- the `/` browser flow starts fixed-destination Google sign-in, explicitly
  collects the booking-system Participant name/email, resolves current
  Participant state fresh, and supports refresh, zero/one/multiple assigned
  Active or Archived Courses, private Course detail, and sign-out without
  public discovery;
- `/`, `/invite`, `/admin`, `/admin/users`, `/admin/invites`,
  `/admin/participants`, `/admin/courses`,
  `/admin/users/:adminUserId`,
  `/admin/participants/:participantId`, `/admin/courses/new`,
  `/admin/courses/:courseId`, Participant `/profile`, and Participant
  `/courses/:courseId` are direct/refresh-safe German MUI contexts within one
  responsive shell; one principal/session can reach distinct Participant and
  Admin User identities without a persisted role;
- each Course HTTP request freshly resolves Active Admin state. Course
  creation and editing plus nested Group creation/edit/lifecycle and Module
  create/edit/reschedule/cancel/delete and Course-archival writes use guarded D1
  acceptance so a stale actor or Course creates no row, partial edit, or
  scheduling-history side effect. A Course-timezone edit and concurrent first
  Module creation recheck each other so exactly one timezone interpretation
  can win;
- the Participant directory lists every fully registered Active or Disabled
  Participant independently of membership, while guarded direct Assignment or
  reactivation accepts only current Active Admin/Active Course/registered-
  Participant state, preserves one Participant/Course identity, and creates no
  Module Selection;
- guarded Assignment revocation accepts Active or Archived Courses, atomically
  changes the retained row to Revoked and removes only future Scheduled-Module
  Selections, retains exact-start/begun Scheduled and Cancelled selections,
  changes no other Course, and immediately removes Participant access. Active-
  Course reactivation reuses the row without restoring removed selections;
- guarded Participant Disable atomically changes the retained Participant row
  and removes only future Scheduled-Module Selections across every Course;
  exact-start/begun/ended Scheduled and all Cancelled Selections, Active or
  Revoked Assignments, profile/principal data, Course structure, and any same-
  principal Admin User remain. Guarded Re-enable restores only eligible access
  without restoring removed Selections;
- Participant self-edit and Admin Participant-detail writes use the existing
  case-insensitive complete-email constraint and guarded profile-only updates;
  they recheck current actor/target state, preserve Participant identity,
  lifecycle, Assignments, Selections, external principal, and same-principal
  Admin User data, and leave a duplicate or stale loser unchanged;
- Participant Course list/detail reads derive the Participant only from the
  authenticated principal and guard D1 reads by current Active Participant,
  Active Assignment, and Active or Archived Course state. They expose ordered
  Modules, Active Groups plus any own selected Archived Group, and only the
  current Participant's own Selection when present,
  including that selected Group's retained details/state when Archived,
  never rosters, peer profiles, emails, counts, Assignments, Admin data, or a
  public catalogue;
- guarded Selection set/change/remove writes recheck the Participant,
  Assignment, Course, Scheduled Module, Active same-Course Group, and exact
  `startsAt` deadline at acceptance; replacement preserves one stable
  Participant/Module Selection identity, while refusal creates no partial
  effect;
- guarded Module cancellation changes only one still-Scheduled same-Course row
  before its exact `endsAt`, rechecking current Active Admin/Course state at
  acceptance. It retains the original interval, content, identity, and every
  Selection row; current Selection writes then refuse the Cancelled state and
  Participant detail derives retained choices as historical;
- guarded Module deletion removes only a same-Course Scheduled or Cancelled row
  in an Active Course with no currently retained Selection. The restrictive
  Selection foreign key gives concurrent deletion/Selection creation one valid
  winner, success cascades nothing, and permanent first-Module Course history
  remains set after the last or every current Module is gone;
- guarded Course archival changes only one current Active Course after every
  Scheduled Module has reached exact end or later; future Cancelled Modules do
  not block. All structure and participation rows remain unchanged, Archived
  Admin detail removes every structural action except Assignment revocation,
  and private Participant history persists only while the Assignment is Active;
- guarded Course Invite creation, disablement, re-enablement, and replacement
  recheck current Active Admin/Course/Invite state. D1 stores one recoverable
  current token plus SHA-256 recognition digests, atomically clears predecessor
  authority on replacement, and preserves one coherent current Invite. The
  fragment-based public route immediately moves raw authority into Invite-only
  session storage, cleans the address bar, and replaces the raw value after
  recognition with a signed `HttpOnly` digest continuation. Fixed Google/
  onboarding return creates no membership; separate body-free Join atomically
  creates one Assignment, repeats Active membership, and refuses Disabled,
  Revoked, unavailable, or Archived state without change;
- guarded Admin Invite creation/list/revocation rechecks the current Active
  Admin at acceptance. D1 stores only a unique SHA-256 digest, stable identity,
  creation time, optional creator reference, and Active/Claimed/Revoked state;
  the complete fragment URL exists only in the `no-store` creation response.
  Any Active Admin may Revoke an Active row, while constraints and triggers
  make Claimed and Revoked terminal and concurrent claim/Revoke choose one
  complete winner;
- Admin Invite recognition moves one raw fragment token into an Admin-specific
  purpose-signed `HttpOnly` digest continuation, then cleans browser authority.
  Fixed Google return and refresh consume nothing. Final explicit-name
  acceptance uses one guarded D1 batch whose winning terminal update gates the
  ordinary Active Admin insert; existing Active/Disabled principals, deleted-
  principal return, same-Invite/same-principal competition, Revoke races, and
  insert rollback leave one coherent outcome and create no Participant;
- the Admin User directory lists every current Active or Disabled Admin with
  narrow name/state/authority data and server-derived name-edit/promotion
  availability.
  One guarded name-only update permits Active self edits, ordinary-to-ordinary
  edits, and Super-Admin edits of ordinary or Super targets, while current
  actor state, target existence, and authority changes are rechecked in D1;
  identity, principal, lifecycle, authority, relationships, same-principal
  Participant data, and duplicate-name independence remain unchanged;
- an Active Super Admin can promote another Active ordinary Admin through one
  explicit action. A guarded authority-only D1 update rechecks actor and target
  state/authority, preserves identity/profile/principal/relationships and any
  same-principal Participant, coherently refuses concurrent losers, and makes
  the promoted authority visible to an already-established session on its next
  current-domain resolution;
- the stable Course detail lists and creates Course-wide Groups with unique
  normalized Active names and future Scheduled Modules, resolves local minute
  input through the Course IANA timezone, rejects DST gaps, requires an
  explicit overlap occurrence, displays definite instants, and creates no
  Module Selection. It also edits the Course's complete name, description, and
  timezone, presenting the timezone as permanently read-only after the first
  successful Module even when no Module remains;
- the same stable Course detail edits Active or Archived Group name/details,
  archives only without a future Scheduled-Module Selection, reactivates the
  retained identity subject to authoritative Active-name uniqueness, and
  permanently deletes either state only when no retained Selection references
  it; deletion uses no invented past-reference audit and mutates no related row;
- free MUI Core and Emotion are pinned for browser use; one application theme
  and `CssBaseline` now style the complete `/admin` flow with responsive,
  visible-focus, semantic-status, and non-color-only presentation;
- Playwright scans critical Admin, Course, and shell states with axe and
  explicitly verifies desktop/narrow layout, keyboard activation, semantic
  navigation, Drawer/Dialog focus trapping and restoration, labels/names,
  field-error association, direct/refresh behavior, Group/Module empty and
  creation states, Course editing and permanent timezone locking, zero-current-
  Module lock presentation, DST gap/overlap handling, stale/technical refusals,
  Participant onboarding/zero membership, dual-context identity, sign-out,
  Participant privacy, global zero-membership discovery, Course membership
  empty/list/assign/idempotent-repeat states, Disabled targets, Assignment
  revoke/repeat/reactivate confirmation and focus, Archived refusal,
  multi-Course isolation, access loss/restoration, retained-history copy,
  Participant Disable/Re-enable confirmation, global access refusal, safe
  sign-out, future non-restoration, retained historical/live presentation,
  same-principal Admin isolation,
  stale/technical refusals, assigned-Course list/detail/refresh/privacy,
  explicit no-default selection, overlapping-Module selections, change/remove
  confirmation and focus, stale-deadline refusal, truthful own current/history
  presentation, self/Admin profile editing including Disabled targets,
  duplicate/stale refusal, Group edit/archive/reactivate/delete dialogs,
  retained-reference blockers, Module descriptive/reschedule/locked-state
  forms, Module cancellation/history/deadline states, Module deletion/
  historical blockers/zero-current timezone lock, terminal Course archival/
  Archived read-only history/revocation, direct refresh, and overflow;
- Playwright also proves real shared-Invite creation, repeated retrieval and
  copy, disable/re-enable/replacement, permanent predecessor invalidation,
  Archived recognition, unknown-token privacy, fragment cleanup, session
  continuation/refresh, fixed authentication/onboarding return, explicit Join,
  two-Participant reuse, repeat no-op, Revoked/Disabled/stale refusal,
  destructive Dialog focus, technical sanitization, responsive layout, and
  axe results. Admin Invite evidence covers empty/create/copy, one-time URL
  loss across dialog close and refresh, non-secret list state, revoke/repeat,
  replacement after loss, terminal results, desktop/narrow layout, focus, and
  axe. Invited Admin evidence additionally covers fragment cleanup, refresh and
  abandonment, fixed Google continuation without raw authority, explicit-name
  validation, ordinary-Admin creation, existing/Disabled refusal without
  consumption, deleted-principal return, two-principal competition, stale and
  unavailable privacy, responsive layout, focus, and axe;
- Admin User browser evidence additionally covers the real fixed Super and
  invited ordinary directory, self and cross-Admin edits, ordinary-to-Super
  refusal, responsive table/card alternatives, direct refresh, required-name
  validation, Disabled and second-Super presentation, stale outcomes, focus,
  privacy, overflow, and axe. Promotion evidence adds actor-specific actions,
  a permanent one-way German confirmation, ordinary/Disabled/self/already-
  Super refusal, real multi-Super success, same-session fresh authority,
  dialog focus restoration, responsive stale results, and axe;
- both workspace boundary maps are registered in ESLint with exact module,
  workspace, composition, third-party, and test-only permissions;
- the root Nix flake supplies NixOS developer-host tooling: Node, pnpm,
  Chromium, Markplane, Git, a patched lockfile-matched workerd, and the CA
  bundle used by Miniflare for local outbound HTTPS, without changing the
  application runtime or GitHub Actions environment; and
- the canonical `pnpm check` now runs repository, domain, Worker/D1, migration,
  build, and Chromium browser evidence.

Apple, Microsoft, and Facebook providers, Admin-assisted Module Selection,
Admin User lifecycle capabilities, remote Google credentials and production
callback/domain configuration, remote Cloudflare staging/production resources,
release
automation, deployment credentials, and production deployment remain absent.
The account-bound release surfaces are intentionally deferred until release
hardening. No co-located `*.docs.md` file exists.

Further project-specific docs should be added only when accepted project truth
gives them a concrete responsibility.
