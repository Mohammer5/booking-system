# Releases

## Responsibility

This document owns the normal [release](../DICTIONARY.md#release) path from a
tag through repeated verification, Cloudflare
[staging](../DICTIONARY.md#staging) validation,
[production](../DICTIONARY.md#production) promotion, and a safe
post-[deployment](../DICTIONARY.md#deployment) smoke check.

## Not Responsible For

This document does not define product behavior, the application runtime
boundary, individual test assertions, or an emergency manual-deployment
procedure.

## Inputs

- a release tag matching the initial `v*` convention;
- a tagged commit already contained in `main`;
- the complete canonical verification surfaces; and
- environment-scoped Cloudflare configuration and credentials.

## Outputs

- a verified pre-production Worker version;
- a production deployment of that same release commit; and
- a non-destructive production smoke-test result.

## Adjacent Parts

[Verification](verification.md) owns the test layers and canonical check.
[Runtime and hosting](../architecture/runtime-and-hosting.md) owns the deployed
application shape, while [persistence](../architecture/persistence.md) owns D1
isolation and migration compatibility.

## Trigger And Main Containment

A normal push or merge to `main` never deploys production. Production release
starts when a release tag matching `v*` is pushed. That convention does not by
itself impose a broader semantic-version policy.

A tag points to a commit, not a branch. Before any deployment, release CI must
fetch `main` and prove that the tagged commit is an ancestor of `origin/main`.
The commit does not have to be the current tip of `main`, but it must already
have landed there. Failure of this containment check stops the release.

## Release Gate

```text
release tag
   |
   v
tag commit is contained in main
   |
   v
deterministic install and full verification
   |
   +-- lint and repository tests
   +-- unit tests
   +-- Worker/API/D1 and migration tests
   +-- production build
   +-- local browser tests
   |
   v
deploy same commit to Cloudflare staging/preview
   |
   v
Playwright against the hosted pre-production version
   |
   v
all green? -- no --> stop; production remains unchanged
   |
  yes
   |
   v
production migration and deployment
   |
   v
safe production smoke test
```

The release reruns the full regression gate rather than trusting historical PR
evidence. Every stage depends on all earlier stages; production is unchanged
when any containment, verification, build, staging deployment, or hosted E2E
step fails.

## Staging And Preview Contract

Before production promotion, release CI deploys the release commit through
Cloudflare's then-current supported Worker-version or preview mechanism. The
hosted candidate must use:

- the exact commit and production-style Vite output intended for production;
- the real Workers runtime;
- a clearly separate staging environment and D1 database; and
- non-sensitive test configuration and data.

If hosted E2E uses the explicitly non-production Better Auth session
establishment mechanism, staging or preview must additionally gate it with a
CI-controlled secret or equivalently strong non-public control. The production
composition must exclude or make that mechanism unavailable, and release
verification must prove requests cannot activate it in production.

Playwright then verifies the actual Cloudflare URL to expose routing, assets,
bindings, runtime, and environment failures that local tests cannot prove.
Preview URLs are not trusted with production secrets or production user data;
explicit access control may be added later if a concrete security need arises.

Release workflows must be serialized, or provide equivalent deterministic
ownership of shared staging state. A newer tag must not automatically cancel
an in-progress production release.

## Production Promotion And Data Safety

Staging and production use separate D1 databases. Destructive browser tests
never target production. Production migration and application rollout must
respect the migration-compatibility contract because schema and code cannot be
assumed to switch atomically.

Better Auth technical schema changes use the same version-controlled,
clean-state-tested, rollout-compatible migration discipline as booking-domain
schema changes. Production regression tests must not create or mutate
production authentication identities or sessions.

After deployment, only safe smoke checks run against production. They may
confirm that the application, static entrypoint, readiness surface, or a
harmless read operation responds. They must not create synthetic product data.

## Deployment Authority And Secrets

GitHub Actions is the normal authority that decides whether production may be
deployed. Cloudflare Git integration or Workers Builds must not independently
auto-deploy pushes to `main`; Cloudflare is the runtime target, not a second
release gate. Manual emergency deployment may remain operationally possible
outside this normal path.

Cloudflare account identification and a least-privilege deployment API token
belong in GitHub secrets or environment configuration, never source. Separate
GitHub `staging` and `production` environments should hold environment-specific
configuration where useful. The accepted automatic release path does not add a
manual production-approval click unless a later requirement changes that
policy.

Google provider behavior is implemented locally, but remote staging and
production Google credentials, domains, and callback configuration remain
deferred to release hardening. Apple, Microsoft, and Facebook provider
integrations remain wholly deferred. When remote provider configuration is
introduced, its environment-specific secrets follow this same non-source,
least-privilege release handling. Test-authentication secrets and session
tokens must never be persisted in CI artifacts.

Wrangler must be a project-pinned development dependency and CI must use the
locked project version through repository scripts or `pnpm exec wrangler`.
Vite, Vitest, Playwright, and Cloudflare integration versions follow the same
reproducibility rule.

## Current State And Release-Hardening Trigger

A locally buildable application now exists, but no remote Cloudflare
environment, release workflow, or deployment exists. The repository therefore
does not contain a workflow that pretends to deploy. MVP implementation may
continue through local acceptance without account-bound Cloudflare
infrastructure or a remote release pipeline. Their absence before release
hardening is intentional rather than an unresolved local-verification gap.

After the MVP is feature-complete and accepted locally, [release
hardening](../DICTIONARY.md#release-hardening) begins. Before the first real
release is possible, that phase must establish:

- real Cloudflare staging or pre-production infrastructure;
- real Cloudflare production infrastructure;
- separate remote staging and production D1 databases;
- environment-specific deployment configuration;
- least-privilege deployment credentials and environment-scoped secrets;
- the tag-triggered GitHub Actions release workflow;
- hosted staging Playwright verification; and
- the production promotion and safe smoke-test path.

None of these surfaces may be omitted before the first production release.
Once established, every release still traverses the full tag, main-containment,
deterministic verification, real staging, hosted E2E, same-commit promotion,
and production smoke gate defined above.
