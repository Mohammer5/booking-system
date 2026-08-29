---
id: PLAN-mdzku
title: Implementation plan for Create, list, and revoke Admin Invites
status: done
implements:
- TASK-wny83
related: []
created: 2026-08-29
updated: 2026-08-29
---

# Admin Invite Administration Implementation Plan

## Overview

Implement the authenticated administration half of the one-time Admin Invite
lifecycle. Any freshly resolved Active Admin creates independent Active
Invites, receives the raw fragment URL exactly once, lists only durable
non-secret metadata, and may Revoke any still-Active Invite. The database
stores only a SHA-256 digest, enforces terminal state transitions, and retains
Invite rows independently of later creator lifecycle.

The existing `admin-access` booking module owns policy. Application-private
Admin Invite browser, HTTP, D1, token, and hashing adapters remain within the
existing browser/Worker responsibilities. Claiming and invited onboarding are
deferred to `TASK-rrp92`, while this migration deliberately supports the
future guarded `Active -> Claimed` transition and tests its race with Revoke.

## Ground Truth

- `.markplane/backlog/items/TASK-wny83.md` — one-time secret, coexistence,
  list, terminal Revoke, concurrency, UI, and evidence requirements.
- `docs/product/admin-access.md#admin-invites` — canonical Active/Claimed/
  Revoked lifecycle, no expiry/recovery/reactivation/deletion, and authority.
- `docs/product/admin-access.md#admin-invite-view` — creation-time/state list
  and Active-only Revoke action.
- `docs/product/representative-scenarios.md#ad-admin-invite-url-loss` — loss is
  handled through Revoke plus replacement creation.
- `packages/booking/src/admin-access/*` — plain-data factory policy and public
  package interface conventions.
- `apps/booking-system-web/src/worker/admin-bootstrap/*` — fresh Admin context,
  narrow HTTP responses, D1 mapping, and composition conventions.
- `apps/booking-system-web/src/worker/course-access/courseInviteSecrets.js` —
  verified Worker Web Crypto 256-bit token and SHA-256 adapter pattern; Admin
  Invite code stays concept-owned instead of introducing a generic Invite
  abstraction.
- `apps/booking-system-web/src/browser/admin-bootstrap/*` and
  `BrowserApplication.jsx` — Active Admin route gate, German MUI, TanStack
  Query, accessible action, and direct-route composition patterns.
- `docs/architecture/browser-conventions.md#diagnostic-logging` — raw Admin
  Invite authority must never enter diagnostics or analytics.
- `docs/process/verification.md` — layered domain, Worker/D1, browser,
  responsive, focus, privacy, and axe ownership.

No adjacent `*.docs.md` exists for the inspected Admin domain, bootstrap,
authentication, Worker, browser, migration, or composition source.

## Approach

1. Add focused booking `admin-access` operations:
   - create one Active Admin Invite candidate only for an Active actor;
   - list all Invite metadata only for an Active actor;
   - Revoke only an Active Invite, with Claimed/Revoked terminal refusals;
   - delegate every accepted write to guarded persistence so stale actor or
     Invite snapshots cannot win; and
   - expose no expiry, recovery, reactivation, deletion, email target, claim,
     or Super Admin behavior.
2. Add `0008_admin_invites.sql`:
   - `id`, unique permanent `token_digest`, nullable creator reference with
     `on delete set null`, integer `created_at`, and constrained lifecycle;
   - no raw token, recoverable token, expiry, target, claimant, or payload;
   - immutable digest/creation metadata; and
   - transition enforcement allowing only `active -> claimed|revoked`.
3. Add narrow D1 persistence:
   - list deterministically by newest creation time and stable id;
   - guarded `insert ... select` requiring the actor still be Active;
   - guarded Revoke requiring a fresh Active actor and Active Invite;
   - classify stale actor and terminal/missing Invite without leaking tokens;
   - prove concurrent Revoke and a test-owned future Claim statement yield one
     terminal state with no partial mutation; and
   - retain Invites when a creator row is later removed.
4. Add application-private Admin Invite secrets and HTTP:
   - generate 32 random bytes as 64 lowercase hex characters with Worker Web
     Crypto and store only SHA-256 digest;
   - create `POST /api/admin/invites`, list `GET /api/admin/invites`, and
     revoke `POST /api/admin/invites/:inviteId/revocation`;
   - creation returns `201 { outcome, invite: { id, createdAt, state, url } }`
     where `/admin/invite#<token>` appears only in this response;
   - later list/revoke responses return only `{ id, createdAt, state }`;
   - every route freshly authenticates and resolves Active Admin state, uses
     `no-store`, ignores browser trust fields, and sanitizes technical errors;
   - compose token/hash/id/time/persistence capabilities into production and
     non-production Workers without a claim route.
5. Add the directly navigable `/admin/invites` browser view:
   - navigation from the Admin context and stable refresh behavior;
   - truthful empty/loading/error/list states with creation time and explicit
     text labels for Active, Claimed, and Revoked;
   - creation presents the URL in an accessible Dialog that warns it cannot be
     recovered after closing/refresh, supports one copy acknowledgement, and
     keeps the secret only in local transient component/mutation state;
   - close/reset erases that UI state while list invalidation retains only
     non-secret metadata;
   - Active rows alone expose a destructive Revoke confirmation with safe
     initial focus, Escape/cancel restoration, focused results, and stale/
     technical refusal; and
   - replacement recovery is explicitly a new Invite after Revoke, not a
     recovered URL.
6. Update canonical Admin product status, architecture/application/persistence/
   browser/runtime/package/module/verification docs, dictionary terminology,
   and routing indexes from deferred lifecycle to implemented administration.

## Non-Goals / Out Of Scope

- Public recognition, authentication continuation, claim, Admin onboarding,
  or Admin creation through the Invite (`TASK-rrp92`).
- Admin User list/edit/promotion/lifecycle (`TASK-45jmb`, `TASK-qhred`,
  `TASK-ikzih`).
- Secret recovery, encryption, email targeting/delivery, expiry, cleanup,
  reactivation, deletion, or generic Course/Admin Invite abstractions.
- Remote analytics/logging services, another workspace/package, or a boundary
  map permission change.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Digest-only persistence from creation | Later reads must never recover authority; future claim needs only exact recognition. |
| Fragment URL `/admin/invite#<token>` | Keeps the raw secret out of HTTP request URLs and referrers for the next ticket. |
| Nullable creator FK with `on delete set null` | Preserves accepted Invites without blocking later authorized creator deletion. |
| Database-enforced terminal transitions | Revoke/future Claim concurrency has one durable winner even across slices. |
| One-time Dialog state only | Refresh/close cannot reconstruct the URL, matching the loss contract. |
| Separate Admin token adapter | Shares a proven cryptographic pattern without prematurely unifying different Invite concepts. |

## Phases

### Phase 1: Domain And Durable Lifecycle

- [x] Add/export create/list/revoke operations and full lifecycle matrices.
- [x] Add migration, immutability/terminal constraints, and upgrade evidence.
- [x] Add guarded persistence, coexistence, creator retention, and races.

**Checkpoint**: Multiple Active Invites coexist; only one terminal transition
wins, and storage cannot reconstruct any URL.

### Phase 2: Authorized Secret-Safe HTTP

- [x] Add Admin-specific 256-bit token/SHA-256 adapters.
- [x] Add exact list/create/revoke routes and fresh Admin authorization.
- [x] Prove one-time URL serialization, no-store/privacy, and sanitization.

**Checkpoint**: Only successful creation exposes raw authority; all later
representations and failures are non-secret.

### Phase 3: German Admin Invite View

- [x] Add stable route/navigation and truthful query states.
- [x] Add one-time creation/copy warning Dialog and transient secret cleanup.
- [x] Add Active-only destructive Revoke with focus and stale/error states.
- [x] Prove refresh loss/replacement recovery, responsive layout, and axe.

**Checkpoint**: The complete browser lifecycle is operable without ever
recovering a lost URL.

### Phase 4: Documentation And Completion

- [x] Update canonical docs/status/indexes and complete dictionary coverage.
- [x] Run focused suites and one uninterrupted final `pnpm check`.
- [x] Complete task/plan, sync/check Markplane, and make one semantic commit.

**Checkpoint**: Product truth, implementation, evidence, tracking, and history
agree before `TASK-rrp92` begins.

## Testing Strategy

- Booking-domain Vitest owns authorization, candidate/state policy,
  coexistence, terminal outcomes, and absence of expiry/reactivation/deletion.
- Worker/D1 Vitest owns migration constraints, digest-only storage, guarded
  writes, fresh actor state, Revoke/Claim race, creator deletion, exact HTTP,
  one-time URL, production composition, and secret/error scans.
- Playwright owns empty/create/copy/close/refresh/list/revoke/create-replacement,
  terminal actions, direct route, desktop/360px, keyboard/Dialog/result focus,
  overflow, and axe without automating a provider.
- `pnpm check` is the final non-deployment acceptance command.

## Rollback Plan

Revert the one task commit and apply a forward migration only if deployed data
must later remove the additive table. No existing table is rewritten; stored
digests cannot reconstruct issued secrets.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is below the repository's 300-line source split threshold

## References

- `TASK-wny83`
- `TASK-rrp92`
- `docs/product/admin-access.md`
- `docs/architecture/authentication-and-sessions.md`
- `docs/architecture/applications.md`
- `docs/process/verification.md`
