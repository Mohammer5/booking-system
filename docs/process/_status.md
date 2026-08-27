# Process Status

Current reality:

- Global docs are routed through `docs/_index.md` and area `_index.md` files.
- `README.md` is the mandatory human entrypoint in every docs folder.
- Conceptual-simplicity guidance is required for boundary, decomposition,
  terminology, and docs-structure tasks.
- The dictionary separates repository concepts from meta/internal terminology.
- Substantive docs changes require a dictionary coverage pass over the affected
  area.
- Contradictions noticed during docs routing are surfaced even when
  contradiction-finding was not explicitly requested.
- [Co-located docs](../DICTIONARY.md#co-located-docs) are optional and new ones
  are created manually rather than automatically.
- Repository-local Markplane tracking is active for development work and is
  separate from canonical repository truth and product runtime data.
- GitHub Actions runs the current canonical `pnpm check` gate for pull requests
  targeting `main` and pushes to `main` through the stable `verify` job.
- Layered local application verification is implemented through domain Vitest,
  Workers Vitest with D1, the production build, and Chromium Playwright in the
  canonical `pnpm check`. The tag-gated release policy remains unimplemented.
- Account-bound Cloudflare infrastructure and the remote release pipeline are
  intentionally deferred until [release
  hardening](../DICTIONARY.md#release-hardening), after the MVP is
  feature-complete and accepted locally.

Known gaps:

- Remote GitHub branch protection requiring `verify` cannot be proven by
  repository files and still requires separate external configuration; it is
  not part of the Cloudflare operational-prerequisite decision.
- Hosted staging verification and production smoke checks do not exist; they
  belong to later release hardening rather than local acceptance.
- No Cloudflare staging or production environment or release workflow exists.
  Their absence is intentional until release hardening and is not a
  pre-implementation deficiency.
