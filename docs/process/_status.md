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

Known gaps:

- The template has no product-specific docs or source yet, so future projects
  will exercise how their own documentation areas and co-located docs evolve.
