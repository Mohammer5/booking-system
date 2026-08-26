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
- The layered application verification and tag-gated release policies are
  accepted but remain unimplemented because no application exists.

Known gaps:

- Remote GitHub branch protection requiring `verify` cannot be proven by
  repository files and still requires external configuration.
- No Vitest, Workers integration, Playwright suite, Cloudflare staging or
  production environment, or release workflow exists yet.
