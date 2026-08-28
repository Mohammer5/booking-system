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

The local application foundation, Course-structure creation, Participant
registration, and direct Course Assignment slices are now implemented:

- `@booking-system/booking` at `packages/booking` owns the implemented
  `admin-access` behavior plus `course-structure` Course, Course-wide Group,
  future Module, and Course-local definite-time creation policy, plus
  `course-access` Participant registration, fresh context, and direct Course
  Assignment policy;
- `@booking-system/booking-system-web` at `apps/booking-system-web` owns the
  React `/` Participant Google entry/onboarding/home, `/admin` administration
  flow, Participant directory, nested Course index/create/detail routes,
  Course membership and Assignment interaction, and Group/Module creation
  forms, plus Worker/API handling, Better Auth composition, D1 persistence,
  Vite/Workers Static Assets integration, and local runtime;
- five version-controlled migrations create the Better Auth/Admin foundation,
  Courses, additive Group/Module schema with permanent first-Module scheduling
  history, constrained Participants, and constrained Course Assignments, with
  clean-state construction and data-preserving upgrade evidence;
- production and explicit non-production Worker compositions structurally
  separate fixed fixture-session establishment from production, while their
  manual-development and fixture/Playwright D1 state use separate generated
  Wrangler roots;
- the `/admin` browser flow starts fixed-destination Google sign-in, requires
  authentication before the first-Admin name form, and supports Better Auth
  sign-out in every authenticated Admin-route outcome;
- the `/` browser flow starts fixed-destination Google sign-in, explicitly
  collects the booking-system Participant name/email, resolves current
  Participant state fresh, and supports refresh, zero membership, and sign-out
  without public Course discovery;
- `/`, `/admin`, `/admin/participants`, `/admin/courses`,
  `/admin/courses/new`, and stable Course detail routes are direct/refresh-safe
  German MUI contexts within one responsive shell; one principal/session can
  reach distinct Participant and Admin User identities without a persisted
  role;
- each Course HTTP request freshly resolves Active Admin state, and Course
  creation plus nested Group/Module writes use guarded D1 inserts so a stale
  actor or Course creates no row or scheduling-history side effect;
- the Participant directory lists every fully registered Active or Disabled
  Participant independently of membership, while guarded direct Assignment
  accepts only current Active Admin/Active Course/registered-Participant state,
  preserves one Participant/Course pair, and creates no Module Selection;
- the stable Course detail lists and creates Course-wide Groups with unique
  normalized Active names and future Scheduled Modules, resolves local minute
  input through the Course IANA timezone, rejects DST gaps, requires an
  explicit overlap occurrence, displays definite instants, and creates no
  Module Selection;
- free MUI Core and Emotion are pinned for browser use; one application theme
  and `CssBaseline` now style the complete `/admin` flow with responsive,
  visible-focus, semantic-status, and non-color-only presentation;
- Playwright scans critical Admin, Course, and shell states with axe and
  explicitly verifies desktop/narrow layout, keyboard activation, semantic
  navigation, Drawer/Dialog focus trapping and restoration, labels/names,
  field-error association, direct/refresh behavior, Group/Module empty and
  creation states, DST gap/overlap handling, stale/technical refusals,
  Participant onboarding/zero membership, dual-context identity, sign-out,
  Participant privacy, global zero-membership discovery, Course membership
  empty/list/assign/idempotent-repeat states, Disabled targets, Assignment
  stale/technical refusals, and overflow;
- both workspace boundary maps are registered in ESLint with exact module,
  workspace, composition, third-party, and test-only permissions;
- the root Nix flake supplies NixOS developer-host tooling: Node, pnpm,
  Chromium, Markplane, Git, a patched lockfile-matched workerd, and the CA
  bundle used by Miniflare for local outbound HTTPS, without changing the
  application runtime or GitHub Actions environment; and
- the canonical `pnpm check` now runs repository, domain, Worker/D1, migration,
  build, and Chromium browser evidence.

Apple, Microsoft, and Facebook providers, Course/Group/Module editing and
lifecycle, Participant profile/lifecycle administration, Assignment lifecycle
and participant-facing Course access, Selection, Invite, later Admin
capabilities, remote Google credentials and production callback/domain
configuration, remote Cloudflare staging/production resources, release
automation, deployment credentials, and production deployment remain absent.
The account-bound release surfaces are intentionally deferred until release
hardening. No co-located `*.docs.md` file exists.

Further project-specific docs should be added only when accepted project truth
gives them a concrete responsibility.
