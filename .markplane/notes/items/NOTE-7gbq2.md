---
id: NOTE-7gbq2
title: Local functional completion execution contract and coverage matrix
status: draft
type: analysis
related:
- TASK-t8jzz
- TASK-6sxq3
tags:
- roadmap
- coverage
- execution-contract
- local-acceptance
created: 2026-08-27
updated: 2026-08-27
---

# Local functional completion execution contract and coverage matrix

## Context

This note routes implementation sessions through the dependency-ordered local
v1 roadmap. It is planning state, not a product specification: the linked
canonical docs remain authoritative, and a backlog task never authorizes
implementation by itself.

## Local Functional Completion

Local functional completion means every normative v1 behavior is usable by its
Admin or Participant through the German-first responsive MUI browser
application, backed by current domain authorization, D1-compatible persistence,
and the accepted same-origin React/Vite/Worker composition, with all focused
and representative local verification passing from a fresh database.

It excludes all current product non-goals in
`docs/product/non-goals.md` and all release-hardening work: remote Cloudflare
staging/production resources, remote D1, credentials/secrets, release
automation, hosted staging Playwright, production promotion, and production
smoke tests. Google is sufficient locally; Apple, Microsoft, and Facebook stay
deferred.

## MUI, UI, And Accessibility Contract

- MUI is accepted but not implemented until `TASK-ic4fu`. Use free MUI Core;
  MUI X Community only for a demonstrated need such as date/time entry; never
  Pro/Premium/commercial components.
- MUI and its styling dependencies stay browser-private. They never enter
  `packages/booking`, Worker/domain authorization, persistence, or
  authentication source. Boundary maps and runtime graphs must prove this.
- One repository-owned theme establishes typography, spacing, layout,
  responsive behavior, visible focus, and familiar Material interaction.
  Do not create a competing design system or wrappers around every MUI
  component; shared UI requires repeated concrete use and one owner.
- Every browser task owns German i18n plus applicable loading, empty, success,
  validation, error, unavailable, notification, and destructive-confirmation
  states. Independently navigable views support direct navigation and refresh.
- Applicable WCAG 2.2 AA behavior includes semantic labels/names, keyboard
  operation, predictable dialog and post-action focus, visible focus, and no
  color-only communication. Axe-style scans supplement explicit behavior
  assertions; desktop and narrow/mobile are both acceptance surfaces.

## Test-Layer Selection Contract

| Behavior owned | Required primary evidence |
| --- | --- |
| Pure booking policy, validation, derived state, definite-time rules | Vitest in `packages/booking`; inject clocks/definite instants, never sleep |
| D1 schema, migrations, persistence, atomicity, concurrency, Worker/API authorization/serialization | Cloudflare Worker Vitest against isolated D1-compatible state built from all migrations |
| Routes, forms, navigation, dialogs, focus, responsive behavior, privacy, complete journeys | Playwright against the explicit non-production Worker composition |
| Accessibility | Axe-style Playwright scans plus explicit semantics, accessible-name, keyboard, visible-focus, dialog-focus/restoration assertions |
| Architecture/import changes | ESLint, boundary tests, canonical boundary docs, and production build/runtime-graph evidence |
| Fixture changes | Fixed-identity tests and structural proof that production cannot activate/import fixture session establishment |
| OAuth wiring | Structural/configuration tests and documented manual local smoke; never automate Google's hosted UI |
| Every implementation task | Focused applicable layers above and final `pnpm check` before completion |

Browser acceptance never substitutes for domain/atomicity tests, and unit tests
never complete a browser-visible criterion.

## Epic Order, Parallel Lanes, And Critical Path

| Wave | Epic | Outcome |
| --- | --- | --- |
| Completed | `EPIC-m22qh` completed foundation subset plus `TASK-t65sy` and `TASK-89cnu` | Existing application, Google Admin sign-in, D1/Worker/test and Nix foundation |
| 1 | `EPIC-566gf` Accessible application experience | MUI/theme/accessibility, then responsive Admin/Participant shells |
| 2 | `EPIC-m22qh` Core booking happy path | Course/Group/Module creation, Participant onboarding, Assignment/access, Participant Selection |
| 3A | `EPIC-bh5dj` Participant profiles and membership lifecycle | Profile, Assignment revoke/reactivate, Participant Disable/Re-enable |
| 3B | `EPIC-i2x79` Course content lifecycle | Course/Group/Module edits and lifecycle, terminal archival |
| 3C | `EPIC-hc9uu` Admin identities and invitations | May progress after Wave 1; converges after representative booking records exist for no-cascade proof |
| 4A | `EPIC-ziadc` Course invites and joining | Invite management, secure continuation, explicit Join |
| 4B | `EPIC-h8fpz` Administrative participation | Complete historical read model and assisted Selection mutation |
| 5 | `EPIC-hikpy` Local functional acceptance | Final fixtures/migrations, A–AI browser/accessibility regression, docs and local acceptance |
| Deferred | `EPIC-ifkev` Release hardening | Selectable only after `TASK-6sxq3` is done |

The convergence critical path is:

```text
TASK-ic4fu -> TASK-dfq2k
  -> core Course + Participant lanes -> TASK-jvqrk
  -> Participant/Assignment and Course lifecycle lanes -> TASK-fzniz
  -> Invite/Admin-participation/Admin-identity convergence
  -> TASK-h37zt -> TASK-t8jzz -> TASK-6sxq3
  -> EPIC-ifkev becomes eligible
```

Independent ready tasks may run in parallel when their explicit dependencies
are done; the diagram is a convergence path, not an instruction to serialize
unrelated lanes.

## Rule For Choosing The Next Task

1. Run `markplane sync` and read `.markplane/.context/summary.md`.
2. Consider only a backlog task whose complete `depends_on` set is `done` and
   whose epic is not deferred by this note. The lowest deterministic position
   is the default choice; use priority only to break equally ready work.
3. Re-read the task's cited canonical docs and current code. Create and attach
   a fresh code-grounded Markplane implementation plan immediately before
   implementation; planned task bodies deliberately have `plan: null`.
4. Obtain current explicit implementation authorization. A task or plan is
   delivery state, never authorization by itself.
5. Complete the whole vertical task, its docs, appropriate test layers, and
   `pnpm check` in one conceptual semantic commit before selecting downstream
   work.
6. Never select `EPIC-ifkev` until `TASK-6sxq3` and every local-completion epic
   are done.

The first ready task is `TASK-ic4fu`; both dependencies are already done.

## Task Directory By Epic

| Epic | Tasks in deterministic order |
| --- | --- |
| `EPIC-566gf` | `TASK-ic4fu`, `TASK-dfq2k` |
| `EPIC-m22qh` | completed `TASK-aeij8`; `TASK-ubm2q`, `TASK-6tfxd`, `TASK-7uxjj`, `TASK-z6hut`, `TASK-qk47b`, `TASK-jvqrk` |
| `EPIC-bh5dj` | `TASK-ca46j`, `TASK-smtvk`, `TASK-25j4s` |
| `EPIC-i2x79` | `TASK-7n2my`, `TASK-kmm36`, `TASK-vyj7r`, `TASK-2u7z6`, `TASK-vwciv`, `TASK-3zcmt`, `TASK-fzniz` |
| `EPIC-ziadc` | `TASK-k2ckf`, `TASK-5gny6` |
| `EPIC-hc9uu` | `TASK-wny83`, `TASK-rrp92`, `TASK-45jmb`, `TASK-qhred`, `TASK-ikzih` |
| `EPIC-h8fpz` | `TASK-49if4`, `TASK-2nh3b` |
| `EPIC-hikpy` | `TASK-h37zt`, `TASK-t8jzz`, `TASK-6sxq3` |

## Product Specification Coverage

Anchors below locate canonical truth. “Primary” owns delivery/closure;
secondary IDs are cross-capability evidence, not alternate specifications.

### Product Overview And Focused-Specification Boundaries

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `README.md#product-goal`, `#core-mental-model`, `#conceptual-relationships`, `#specification-composition` | `TASK-t8jzz` | every capability task |
| `domain-model.md#responsibility`, `#not-responsible-for`, `#inputs`, `#outputs`, `#adjacent-parts` | `TASK-t8jzz` | every domain-owning task |
| `admin-access.md#responsibility`, `#not-responsible-for`, `#inputs`, `#outputs`, `#adjacent-parts` | `TASK-t8jzz` | Admin identity/invite tasks |
| `course-access.md#responsibility`, `#not-responsible-for`, `#inputs`, `#outputs`, `#adjacent-parts` | `TASK-t8jzz` | Participant/access/invite tasks |
| `course-structure.md#responsibility`, `#not-responsible-for`, `#inputs`, `#outputs`, `#adjacent-parts` | `TASK-t8jzz` | Course/Group/Module lifecycle tasks |
| `module-participation.md#responsibility`, `#not-responsible-for`, `#inputs`, `#outputs`, `#adjacent-parts` | `TASK-t8jzz` | Selection and lifecycle tasks |

### Domain Model

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `domain-model.md#canonical-vocabulary` | `TASK-t8jzz` | all capability tasks |
| `domain-model.md#external-authentication-identity` | `TASK-7uxjj` | `TASK-45jmb`, `TASK-h37zt` |
| `domain-model.md#participant` | `TASK-7uxjj` | `TASK-ca46j`, `TASK-25j4s` |
| `domain-model.md#participant-onboarding` | `TASK-7uxjj` | `TASK-5gny6` |
| `domain-model.md#admin-user` | `TASK-45jmb` | `TASK-aeij8`, `TASK-rrp92` |
| `domain-model.md#super-admin` | `TASK-qhred` | `TASK-aeij8`, `TASK-ikzih` |
| `domain-model.md#course` | `TASK-ubm2q` | `TASK-7n2my`, `TASK-fzniz` |
| `domain-model.md#group` | `TASK-6tfxd` | `TASK-kmm36`, `TASK-vyj7r` |
| `domain-model.md#module` | `TASK-6tfxd` | `TASK-2u7z6`, `TASK-vwciv`, `TASK-3zcmt` |
| `domain-model.md#course-assignment` | `TASK-z6hut` | `TASK-smtvk`, `TASK-2nh3b` |
| `domain-model.md#module-selection` | `TASK-jvqrk` | `TASK-49if4`, `TASK-2nh3b` |
| `domain-model.md#course-invite` | `TASK-k2ckf` | `TASK-5gny6` |
| `domain-model.md#admin-invite` | `TASK-wny83` | `TASK-rrp92` |
| `domain-model.md#conceptual-relationships` | `TASK-t8jzz` | all capability tasks |
| `domain-model.md#hard-invariants` and `#identity-and-profile` | `TASK-ca46j` | `TASK-45jmb`, `TASK-7uxjj`, `TASK-t8jzz` |
| `domain-model.md#structure-and-membership` | `TASK-smtvk` | `TASK-6tfxd`, `TASK-z6hut` |
| `domain-model.md#selection-validity-and-history` | `TASK-jvqrk` | `TASK-25j4s`, `TASK-smtvk`, `TASK-49if4` |
| `domain-model.md#time-and-lifecycle` | `TASK-fzniz` | `TASK-2u7z6`, `TASK-vwciv`, `TASK-kmm36` |
| `domain-model.md#administration-and-invitations` | `TASK-ikzih` | `TASK-rrp92`, `TASK-5gny6` |
| `domain-model.md#authoritative-acceptance` | `TASK-t8jzz` | every mutation task |
| `domain-model.md#minimal-state-model` | `TASK-t8jzz` | every lifecycle task |
| `domain-model.md#identity-and-naming` | `TASK-ca46j` | `TASK-45jmb`, `TASK-kmm36` |
| `domain-model.md#normal-empty-and-partial-states` | `TASK-dfq2k` | `TASK-ubm2q`, `TASK-7uxjj`, `TASK-qk47b` |

### Admin Access

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `admin-access.md#admin-user-identity` and `#external-authentication-identity` | `TASK-45jmb` | `TASK-7uxjj`, `TASK-ikzih` |
| `admin-access.md#name-and-onboarding` | `TASK-rrp92` | `TASK-aeij8`, `TASK-45jmb` |
| `admin-access.md#admission-to-administration` | `TASK-rrp92` | `TASK-aeij8` |
| `admin-access.md#authority-and-lifecycle` and `#ordinary-admin-user-authority` | `TASK-ikzih` | `TASK-45jmb` |
| `admin-access.md#super-admin-promotion` | `TASK-qhred` | — |
| `admin-access.md#super-admin-administration-and-self-protection` | `TASK-ikzih` | `TASK-qhred` |
| `admin-access.md#at-least-one-active-super-admin` | `TASK-ikzih` | — |
| `admin-access.md#no-cascades` | `TASK-ikzih` | `TASK-t8jzz` |
| `admin-access.md#first-admin-bootstrap` | `TASK-aeij8` | `TASK-t65sy`, `TASK-ic4fu` |
| `admin-access.md#admin-invites` | `TASK-wny83` | `TASK-rrp92` |
| `admin-access.md#independent-creation-and-lifecycle` | `TASK-wny83` | `TASK-rrp92` |
| `admin-access.md#url-visibility-and-loss` | `TASK-wny83` | — |
| `admin-access.md#pre-onboarding-visibility` | `TASK-rrp92` | — |
| `admin-access.md#claiming-and-invited-onboarding` | `TASK-rrp92` | `TASK-h37zt` |
| `admin-access.md#existing-and-deleted-admin-users` | `TASK-rrp92` | `TASK-ikzih` |
| `admin-access.md#administration-views` and `#admin-user-view` | `TASK-45jmb` | `TASK-qhred`, `TASK-ikzih`, `TASK-49if4` |
| `admin-access.md#admin-invite-view` | `TASK-wny83` | — |
| `admin-access.md#authoritative-current-state` | `TASK-t8jzz` | all Admin mutation tasks |

### Course Access

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `course-access.md#external-authentication-and-participant-identity` | `TASK-7uxjj` | `TASK-ca46j` |
| `course-access.md#participant-registration-and-onboarding` | `TASK-7uxjj` | `TASK-5gny6` |
| `course-access.md#participant-profile` and `#profile-editing` | `TASK-ca46j` | `TASK-7uxjj` |
| `course-access.md#participant-global-access-state`, `#disable`, `#re-enable`, `#administration-while-disabled` | `TASK-25j4s` | `TASK-z6hut`, `TASK-smtvk` |
| `course-access.md#participant-administration` | `TASK-z6hut` | `TASK-ca46j`, `TASK-25j4s` |
| `course-access.md#administrative-assignment` | `TASK-z6hut` | `TASK-smtvk` |
| `course-access.md#course-assignment-through-admin-assisted-booking` | `TASK-2nh3b` | `TASK-smtvk` |
| `course-access.md#shared-course-invite` | `TASK-k2ckf` | `TASK-5gny6` |
| `course-access.md#exact-current-invite-lifecycle` | `TASK-k2ckf` | — |
| `course-access.md#reuse-and-forwarding` | `TASK-5gny6` | `TASK-k2ckf` |
| `course-access.md#join-flow` | `TASK-5gny6` | `TASK-7uxjj` |
| `course-access.md#recognized-invite-visibility` | `TASK-k2ckf` | `TASK-5gny6` |
| `course-access.md#assignment-revocation-and-reactivation` | `TASK-smtvk` | `TASK-fzniz` |
| `course-access.md#course-access-and-visibility` and `#active-course` | `TASK-qk47b` | `TASK-jvqrk`, `TASK-49if4` |
| `course-access.md#archived-course` | `TASK-fzniz` | `TASK-smtvk` |
| `course-access.md#participant-privacy` and `#no-public-discovery` | `TASK-qk47b` | `TASK-k2ckf`, `TASK-49if4` |
| `course-access.md#admin-user-visibility` | `TASK-49if4` | `TASK-z6hut`, `TASK-fzniz` |
| `course-access.md#multiple-courses` | `TASK-smtvk` | `TASK-25j4s`, `TASK-qk47b` |
| `course-access.md#authoritative-current-state` | `TASK-t8jzz` | all access mutation tasks |

### Course Structure And Lifecycle

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `course-structure.md#course-structure` and `#new-course-state` | `TASK-ubm2q` | — |
| `course-structure.md#course-timezone` | `TASK-7n2my` | `TASK-6tfxd`, `TASK-3zcmt` |
| `course-structure.md#groups` and `#data-contract-and-course-wide-meaning` | `TASK-6tfxd` | — |
| `course-structure.md#editing-and-active-name-uniqueness` | `TASK-kmm36` | — |
| `course-structure.md#active-and-archived-lifecycle` | `TASK-kmm36` | `TASK-49if4` |
| `course-structure.md#hard-deletion` (Group) | `TASK-vyj7r` | — |
| `course-structure.md#no-capacity` | `TASK-t8jzz` | `TASK-jvqrk`, `TASK-2nh3b` |
| `course-structure.md#modules`, `#data-contract` (Module), and `#creation-and-temporal-meaning` | `TASK-6tfxd` | `TASK-2u7z6` |
| `course-structure.md#descriptive-edits` and `#schedule-edits` | `TASK-2u7z6` | — |
| `course-structure.md#cancellation` | `TASK-vwciv` | — |
| `course-structure.md#hard-deletion-1` (Module) | `TASK-3zcmt` | — |
| `course-structure.md#course-lifecycle` and `#active-course` | `TASK-fzniz` | all structural tasks |
| `course-structure.md#no-hard-deletion-or-reactivation` | `TASK-fzniz` | — |
| `course-structure.md#archival-preconditions` | `TASK-fzniz` | `TASK-vwciv` |
| `course-structure.md#structurally-read-only-archived-course` | `TASK-fzniz` | `TASK-smtvk` |
| `course-structure.md#authoritative-current-state` | `TASK-t8jzz` | all lifecycle tasks |

### Module Participation

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `module-participation.md#participation-state` | `TASK-jvqrk` | — |
| `module-participation.md#exact-live-and-historical-meaning` | `TASK-49if4` | `TASK-jvqrk`, lifecycle tasks |
| `module-participation.md#participant-booking-eligibility`, `#changing-the-selected-group`, `#removing-participation`, `#startsat-deadline` | `TASK-jvqrk` | `TASK-2u7z6` |
| `module-participation.md#admin-assisted-booking` and `#existing-active-participant-and-membership` | `TASK-2nh3b` | `TASK-smtvk` |
| `module-participation.md#eligibility-and-deadline`, `#set-selected-group-semantics`, `#removal`, `#coherent-refusal` | `TASK-2nh3b` | `TASK-jvqrk` |
| `module-participation.md#lifecycle-effects-on-selections`, `#course-assignment-revocation`, and `#assignment-reactivation-in-progress` | `TASK-smtvk` | `TASK-49if4` |
| `module-participation.md#participant-disable` and `#participant-re-enable-in-progress` | `TASK-25j4s` | `TASK-49if4` |
| `module-participation.md#module-cancellation-and-course-archival` | `TASK-vwciv` | `TASK-fzniz`, `TASK-49if4` |
| `module-participation.md#scheduling-conflicts` | `TASK-jvqrk` | `TASK-t8jzz` |
| `module-participation.md#concurrent-and-stale-changes` | `TASK-t8jzz` | all mutation tasks |
| `module-participation.md#history-attendance-and-notifications` | `TASK-49if4` | `TASK-t8jzz` |

### Product Decisions, Status, And Non-Goals

| Canonical section | Primary | Useful secondary |
| --- | --- | --- |
| `docs/product/_status.md` complete accepted v1/current implementation | `TASK-6sxq3` | `TASK-t8jzz` |
| `_decisions.md#separate-membership-from-module-participation` | `TASK-jvqrk` | `TASK-z6hut` |
| `_decisions.md#absence-means-non-participation` | `TASK-jvqrk` | — |
| `_decisions.md#require-participant-onboarding-and-booking-system-profile-data` | `TASK-7uxjj` | `TASK-ca46j` |
| `_decisions.md#use-reversible-participant-disabling-instead-of-deletion` | `TASK-25j4s` | — |
| `_decisions.md#keep-authentication-principals-separate-from-domain-identities` | `TASK-7uxjj` | `TASK-45jmb` |
| `_decisions.md#keep-groups-course-wide` | `TASK-6tfxd` | `TASK-jvqrk` |
| `_decisions.md#keep-the-core-data-contracts-minimal` | `TASK-ubm2q` | `TASK-6tfxd` |
| `_decisions.md#require-unique-active-group-names-within-a-course` | `TASK-kmm36` | `TASK-6tfxd` |
| `_decisions.md#use-one-shared-reusable-course-invite` | `TASK-k2ckf` | `TASK-5gny6` |
| `_decisions.md#reveal-only-the-course-name-for-recognized-invites` | `TASK-k2ckf` | — |
| `_decisions.md#retain-revoked-course-assignments` | `TASK-smtvk` | — |
| `_decisions.md#derive-live-participation-from-surrounding-state` | `TASK-49if4` | all lifecycle tasks |
| `_decisions.md#validate-state-changing-actions-at-acceptance` | `TASK-t8jzz` | every mutation task |
| `_decisions.md#use-iana-course-timezones-and-definite-instants` | `TASK-7n2my` | `TASK-6tfxd`, `TASK-2u7z6` |
| `_decisions.md#keep-module-scheduling-future-facing` | `TASK-2u7z6` | `TASK-6tfxd` |
| `_decisions.md#permit-cancellation-only-before-module-end` | `TASK-vwciv` | — |
| `_decisions.md#delete-groups-and-modules-by-retained-references` | `TASK-vyj7r` | `TASK-3zcmt` |
| `_decisions.md#allow-reversible-group-archival` | `TASK-kmm36` | — |
| `_decisions.md#preserve-courses-through-structurally-read-only-archival` | `TASK-fzniz` | — |
| `_decisions.md#block-course-archival-until-scheduled-modules-end` | `TASK-fzniz` | `TASK-vwciv` |
| `_decisions.md#enable-multiple-super-admins-through-promotion` | `TASK-qhred` | — |
| `_decisions.md#protect-super-admin-authority-and-availability` | `TASK-ikzih` | — |
| `_decisions.md#use-separate-one-time-admin-invites` | `TASK-wny83` | `TASK-rrp92` |
| `_decisions.md#show-admin-invite-secrets-only-at-creation` | `TASK-wny83` | — |
| `_decisions.md#complete-admin-invite-claims-atomically` | `TASK-rrp92` | — |
| `_decisions.md#keep-admin-user-disabledelete-effects-local` | `TASK-ikzih` | — |
| `_decisions.md#use-one-module-selection-for-assisted-booking` | `TASK-2nh3b` | `TASK-jvqrk` |
| `_decisions.md#require-focused-administration-views` | `TASK-49if4` | `TASK-z6hut`, `TASK-45jmb` |
| `_decisions.md#exclude-workflow-heavy-and-audit-features` | `TASK-t8jzz` | — |
| `non-goals.md#identity-participant-and-admin-lifecycle` | `TASK-t8jzz` | `TASK-ca46j`, `TASK-ikzih` |
| `non-goals.md#invitations-and-accounts` | `TASK-t8jzz` | `TASK-k2ckf`, `TASK-wny83` |
| `non-goals.md#module-and-group-modeling` | `TASK-t8jzz` | `TASK-6tfxd` |
| `non-goals.md#booking-workflows-and-history` | `TASK-t8jzz` | `TASK-jvqrk`, `TASK-2nh3b` |
| `non-goals.md#adjacent-product-concerns` | `TASK-t8jzz` | `TASK-49if4` |
| `non-goals.md#implementation-and-technology` | `TASK-6sxq3` | `TASK-ic4fu` |

## Architecture And Process Coverage

| Contract | Primary | Useful secondary |
| --- | --- | --- |
| `architecture/applications.md#accepted-initial-boundary` one app and same-origin HTTP | `TASK-dfq2k` | all browser/Worker tasks |
| `architecture/runtime-and-hosting.md#accepted-deployment-shape` and direct SPA routing | `TASK-dfq2k` | `TASK-6sxq3` |
| `architecture/persistence.md#migration-contract` and isolated D1 | `TASK-h37zt` | every persistence task |
| `architecture/authentication-and-sessions.md#technical-principal-and-domain-identities` and `#one-session-contextual-domain-resolution` | `TASK-7uxjj` | `TASK-45jmb`, `TASK-25j4s` |
| `architecture/authentication-and-sessions.md#providers-and-linking` | `TASK-7uxjj` | `TASK-t65sy` |
| `architecture/authentication-and-sessions.md#invite-continuation` | `TASK-5gny6` | `TASK-rrp92` |
| `architecture/authentication-and-sessions.md#non-production-authentication` | `TASK-h37zt` | `TASK-t8jzz` |
| `architecture/packages.md#accepted-initial-package` and `module-organization.md#vertical-slices` | `TASK-t8jzz` | every feature task |
| `architecture/javascript-conventions.md#architecture-before-technique` | `TASK-t8jzz` | every code task |
| `architecture/browser-conventions.md#material-ui-and-accessible-interaction` | `TASK-ic4fu` | every browser task |
| `architecture/browser-conventions.md#routing-and-navigation`, `#server-state`, `#forms-and-validation`, `#internationalization` | `TASK-dfq2k` | every browser task |
| `architecture/boundaries.md#change-rule` and `architecture/eslint.md#dependency-boundaries` | `TASK-ic4fu` | every dependency/module task |
| `process/conceptual-simplicity.md#boundary-rule` and late abstraction | `TASK-ic4fu` | every implementation task |
| `process/verification.md#layered-regression-harness` and `#canonical-repository-command` | `TASK-t8jzz` | every implementation task |
| `process/project-tracking.md#working-rules` fresh execution plans/ready work | `TASK-6sxq3` | this note |
| `process/releases.md#current-state-and-release-hardening-trigger` | `TASK-6sxq3` | `EPIC-ifkev` |

## Representative Scenario Coverage A–AI

| Scenario | Primary | Useful secondary |
| --- | --- | --- |
| A Participant Onboarding Without An Invite | `TASK-7uxjj` | — |
| B Course Invite Continues Through Onboarding | `TASK-5gny6` | `TASK-7uxjj` |
| C Participant Profile Editing | `TASK-ca46j` | — |
| D External Authentication Principals | `TASK-7uxjj` | `TASK-45jmb` |
| E Normal Participation | `TASK-jvqrk` | — |
| F Participant Disable | `TASK-25j4s` | — |
| G Participant Re-enable | `TASK-25j4s` | `TASK-49if4` |
| H Shared Invite And Minimal Visibility | `TASK-5gny6` | `TASK-k2ckf` |
| I Recognized Unusable Course Invite | `TASK-k2ckf` | `TASK-5gny6` |
| J Repeated And Revoked Invite Use | `TASK-5gny6` | `TASK-smtvk` |
| K Assignment Revocation | `TASK-smtvk` | — |
| L Assignment Reactivation In Progress | `TASK-smtvk` | `TASK-49if4` |
| M New Course | `TASK-ubm2q` | — |
| N Course Timezone And DST | `TASK-7n2my` | `TASK-6tfxd`, `TASK-3zcmt` |
| O Backdated Module Refusal | `TASK-2u7z6` | `TASK-6tfxd` |
| P Module Deadline And Schedule Immutability | `TASK-2u7z6` | `TASK-jvqrk`, `TASK-2nh3b` |
| Q Module Cancellation Boundary | `TASK-vwciv` | — |
| R Module Deletion | `TASK-3zcmt` | — |
| S Group Archival During An In-Progress Module | `TASK-kmm36` | `TASK-49if4` |
| T Group Reactivation And Name Conflict | `TASK-kmm36` | — |
| U Group Deletion | `TASK-vyj7r` | — |
| V Archived Course Is Read-Only | `TASK-fzniz` | `TASK-smtvk` |
| W Live And Historical Selection Transitions | `TASK-49if4` | all lifecycle tasks |
| X First Admin Bootstrap | `TASK-aeij8` | `TASK-ic4fu` |
| Y Super Admin Promotion | `TASK-qhred` | — |
| Z Super Admin Protection | `TASK-ikzih` | — |
| AA Admin Invite Claim | `TASK-rrp92` | `TASK-wny83` |
| AB Existing Admin Claims Another Invite | `TASK-rrp92` | — |
| AC Deleted Admin Returns | `TASK-rrp92` | `TASK-ikzih` |
| AD Admin Invite URL Loss | `TASK-wny83` | — |
| AE Concurrent Admin Invite Claim | `TASK-rrp92` | — |
| AF Admin Disable Or Deletion Does Not Cascade | `TASK-ikzih` | — |
| AG Admin-Assisted Booking | `TASK-2nh3b` | `TASK-49if4` |
| AH Stale Actions Lose To Current State | `TASK-t8jzz` | `TASK-5gny6`, `TASK-jvqrk`, `TASK-ikzih` |
| AI Overlapping Modules | `TASK-jvqrk` | `TASK-t8jzz` |

## Conclusions

The task set has one owner for every local v1 capability and scenario. Existing
completed foundation evidence is preserved, existing happy-path tasks are
enriched rather than duplicated, and lifecycle/admin/invite work is split into
focused vertical tickets. Cross-cutting acceptance tasks verify composition but
do not absorb feature implementation.

## Final Acceptance Checklist

- [ ] Every task has one epic, complete metadata, `plan: null` until selection,
      cited truth, focused UI/test requirements, and an acyclic dependency set.
- [ ] `TASK-ic4fu` through `TASK-2nh3b` are done with focused evidence and one
      conceptual semantic commit each.
- [ ] A fresh D1 database applies the entire migration chain and all fixed
      deterministic identities/states work without arbitrary impersonation.
- [ ] Production cannot establish a fixture session; no test/provider/Invite
      secret appears in source, logs, OAuth URLs, referrers, or artifacts.
- [ ] Every Admin and Participant operation is browser-usable through direct,
      refresh-safe German MUI routes at desktop and narrow/mobile widths.
- [ ] Scenario A–AI mappings have appropriate domain, Worker/D1, Playwright,
      accessibility, stale/concurrent, privacy, and exact-time evidence.
- [ ] Manual real-Google Admin and Participant setup/journeys are documented;
      provider UI remains outside automation.
- [ ] `pnpm check`, `markplane sync`, `markplane check`, docs/index/dictionary
      review, and `git diff --check` pass.
- [ ] Canonical implementation/status/setup docs match the locally accepted
      application and all local-completion epics are closed.
- [ ] `TASK-6sxq3` is done before `EPIC-ifkev` becomes selectable; no remote
      Cloudflare or release-hardening work occurred during local completion.
