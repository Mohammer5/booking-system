---
id: TASK-89cnu
title: Add NixOS development environment
status: done
priority: medium
type: chore
effort: medium
epic: null
plan: PLAN-7435x
depends_on: []
blocks: []
related: []
assignee: gerkules
tags:
- nix
- tooling
- development-environment
position: a8
created: 2026-08-27
updated: 2026-08-27
---

# Add NixOS development environment

## Description

Provide a repository-root, NixOS-first development shell so a developer with
Nix and flakes enabled can enter the existing Cloudflare-native development
workflow without installing host-global Node, pnpm, Chromium, Markplane,
Wrangler, workerd compatibility support, or Cloudflare tooling.

The environment is host tooling only. Project JavaScript dependencies remain
owned by `package.json` and `pnpm-lock.yaml`; the Worker/Vite/D1 runtime model,
application behavior, real-Google and deterministic-test split, canonical
`pnpm check`, and direct GitHub Actions environment remain unchanged.

## Acceptance Criteria

- [x] A committed root `flake.nix` and generated `flake.lock` evaluate for
      `x86_64-linux` and provide Node 24, pnpm 11.17.0, Chromium, Git, and a
      reproducibly pinned Markplane.
- [x] The shell exposes the lockfile-resolved workerd 1.20260826.1 as a
      Nix-compatible executable through `MINIFLARE_WORKERD_PATH`, without
      `nix-ld`, FHS emulation, or checkout mutation.
- [x] Playwright uses Nix Chromium without downloading another browser, while
      project-pinned Wrangler/Vite/Vitest/Cloudflare dependencies remain pnpm
      owned.
- [x] Normal local development can still load the ignored application `.env`;
      deterministic build, Worker-test, fixture, and browser paths remain
      independent of real Google credentials.
- [x] `pnpm install --frozen-lockfile`, Wrangler version reporting,
      `dev:prepare`, and `pnpm check` succeed inside `nix develop`, exercising
      Worker/D1 and browser paths without host-wide `nix-ld`.
- [x] Canonical architecture/process docs and root onboarding describe the
      accepted tooling boundary, with CI, remote Cloudflare resources, Docker,
      and the application runtime left unchanged.

## Notes

Implementation is explicitly authorized by `.instructions/instructions-00014.md`.
Keep this task standalone; it is tooling work rather than part of a product
epic.

Verification evidence on 2026-08-27:

- `nix flake check` evaluated the x86_64-linux packages and development shell.
- The shell reported Node 24.19.0, pnpm/corepack-pnpm 11.17.0, Markplane 0.1.2,
  Chromium 151.0.7922.173, workerd 2026-08-26, and project Wrangler 4.127.0.
- A clean, secret-free temporary worktree completed
  `pnpm install --frozen-lockfile` without Playwright browser installation.
  Upstream workerd emitted its non-fatal NixOS probe warning for the untouched
  `node_modules` binary, as expected.
- `dev:prepare` applied migration `0001_first_admin_foundation.sql`; an exec
  trace proved it launched the Nix-store workerd 1.20260826.1 executable three
  times and never launched the `node_modules` binary.
- `pnpm check` passed 9 local-rule tests, 12 boundary tests, 8 domain tests, 17
  Worker/D1 tests, both Vite builds, and the Chromium Playwright flow.
- `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV` and `NIX_LD` were unset in the shell.
- `markplane sync`, `markplane check`, and `git diff --check` passed.

## References

- `.instructions/instructions-00014.md`
- `package.json`
- `pnpm-lock.yaml`
- `docs/architecture/runtime-and-hosting.md`
- `docs/process/verification.md`
