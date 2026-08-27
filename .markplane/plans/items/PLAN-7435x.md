---
id: PLAN-7435x
title: Implement the NixOS development environment
status: done
implements:
- TASK-89cnu
related: []
created: 2026-08-27
updated: 2026-08-27
---

# Implement the NixOS development environment Implementation Plan

## Overview

Add one repository-root flake that supplies NixOS host tooling while preserving
the repository's existing pnpm-owned Cloudflare application runtime. Package
the exact non-NixOS-compatible workerd binary resolved by the lockfile as a
proper Nix derivation, point Miniflare at it, supply Nix Chromium to the
existing Playwright executable-path seam, document the boundary, and verify the
existing repository commands from inside the shell.

## Ground Truth

- `.instructions/instructions-00014.md` — authorized scope, required design,
  verification, documentation, tracking, and completion contract.
- `package.json` — Node `24.x`, pnpm `11.17.0`, and canonical root commands.
- `pnpm-lock.yaml` — exact `workerd` `1.20260826.1`, Wrangler `4.127.0`, and
  Cloudflare/Vite/Playwright dependency resolutions.
- `apps/booking-system-web/package.json` — normal development, migration,
  Worker-test, build, fixture, and Playwright server commands.
- `apps/booking-system-web/playwright.config.js` — existing
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` integration.
- `apps/booking-system-web/vite.config.js` — fixed normal-development origin at
  `http://localhost:5173`.
- `.github/workflows/ci.yml` — CI directly provisions Node, pnpm, and Playwright
  before running `pnpm check`.
- `.codex/config.toml` and `docs/process/project-tracking.md` — Markplane CLI/MCP
  ownership.
- `docs/architecture/runtime-and-hosting.md` and
  `docs/architecture/_decisions.md` — Worker/Vite runtime and Node/tooling
  separation.
- `docs/process/verification.md` and `docs/process/_decisions.md` — canonical
  `pnpm check` and CI ownership.

## Approach

- Target only `x86_64-linux`; make the output shape easy to extend without
  claiming an unverified platform.
- Pin nixpkgs through the generated flake lock and use its Node 24, Chromium,
  Git, and standard build helpers.
- Build pnpm 11.17.0 from the official registry tarball with a fixed hash and
  the Nix-provided Node 24 runtime, rather than accepting nixpkgs' currently
  newer pnpm.
- Package the official `@cloudflare/workerd-linux-64` 1.20260826.1 npm artifact
  with `autoPatchelfHook`; expose its immutable executable through
  `MINIFLARE_WORKERD_PATH` instead of patching `node_modules`.
- Package Markplane 0.1.2 from its official static Linux release archive with
  a fixed hash.
- Export Nix Chromium through the Playwright variable already supported by the
  application and disable duplicate browser downloads for Nix-shell users.
- Keep Wrangler, Vite, Vitest, Better Auth, Cloudflare plugins, React, and all
  other project dependencies out of the shell packages so pnpm remains their
  owner.
- Keep the shell hook mutation-free and do not globally disable application
  `.env` loading.

## Non-Goals / Out of Scope

- Docker, Compose, Dev Containers, `shell.nix`, or a second environment system.
- CI conversion to Nix or a competing repository verification command.
- Application/runtime/product/authentication/persistence behavior changes.
- Remote Cloudflare resources, deployment, releases, or secrets.
- Darwin or unverified additional Linux architecture support.

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Nix owns only host tooling | Preserves pnpm package ownership and the accepted Worker runtime model. |
| Fixed-source pnpm 11.17.0 derivation | Matches `packageManager` exactly even when nixpkgs moves ahead. |
| Patched official workerd npm binary | Matches the lockfile runtime exactly and avoids global `nix-ld` or mutable installs. |
| Official static Markplane 0.1.2 archive | Reproduces the workflow CLI without a global installer or a Rust build toolchain. |
| Existing Playwright environment seam | Supplies Nix Chromium without changing test architecture. |

## Phases

### Phase 1: Package the host toolchain

- [x] Add `flake.nix` with an explicit `x86_64-linux` development shell.
- [x] Define fixed-source pnpm, workerd, and Markplane derivations.
- [x] Export workerd and Chromium paths plus browser-download suppression.
- [x] Generate and inspect `flake.lock`.

**Checkpoint**: The flake evaluates and every required host executable reports
the expected version/path from `nix develop`.

### Phase 2: Persist repository truth

- [x] Add concise NixOS onboarding to `README.md`.
- [x] Update only canonical architecture/runtime and process
      status/decision/verification docs whose responsibilities changed.
- [x] Check indexes and dictionary coverage without creating a new docs surface
      or co-located docs.

**Checkpoint**: Docs clearly distinguish Nix host tooling from pnpm application
dependencies and preserve runtime, verification, CI, remote-infrastructure,
and Docker boundaries.

### Phase 3: Verify the existing workflow

- [x] Evaluate the flake and inspect all required tool versions/paths.
- [x] Run frozen dependency installation and project-pinned Wrangler reporting.
- [x] Run normal local D1 preparation inside the shell.
- [x] Run `pnpm check` without real Google credentials, Playwright browser
      installation, or global `nix-ld`.
- [x] Prove the packaged workerd path is executed by Worker/D1 and browser
      integration surfaces.
- [x] Run documentation and Markplane validation, review repository state, and
      exclude generated runtime artifacts.

**Checkpoint**: All required verification passes and the evidence is recorded
on TASK-89cnu before completion.

## Testing Strategy

- `nix flake check`
- `nix develop --command` version/path checks for Node, pnpm, Markplane,
  Chromium, workerd, and project-pinned Wrangler
- `nix develop --command pnpm install --frozen-lockfile`
- `nix develop --command pnpm --filter @booking-system/booking-system-web exec wrangler --version`
- `nix develop --command pnpm --filter @booking-system/booking-system-web run dev:prepare`
- `nix develop --command pnpm check`
- `markplane sync && markplane check`

## Rollback Plan

Revert the root flake/lock and responsibility-correct documentation/Markplane
updates together. No application schema, remote infrastructure, secrets, or
production state are introduced, so rollback does not require data migration.

## Pre-Approval Checklist

- [x] Ground Truth refs verified against current codebase
- [x] Cross-plan contracts are referenced, not redefined
- [x] No speculative code — all patterns derived from existing source
- [x] Plan is under ~200 lines

## References

- `.instructions/instructions-00014.md`
- `TASK-89cnu`
