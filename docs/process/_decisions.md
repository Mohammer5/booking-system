# Process Decisions

## Separate Routing From Explanation

`_index.md` exists to support routing and discoverability. `README.md` exists to
help a human understand the area. Keeping those roles separate makes each file
easier to maintain.

## Keep Status And Rationale Out Of `README.md`

`_status.md` and `_decisions.md` isolate information that changes for different
reasons than the core mental model. This avoids turning `README.md` into a
mixed-purpose document.

## Keep One Global Dictionary

The repository uses `docs/DICTIONARY.md` instead of per-folder glossaries so
terminology stays centralized and easier to keep consistent.

## Split Dictionary Terms By Conceptual Role

The dictionary keeps repository concepts separate from the meta/internal terms
used to classify, design, implement, operate, and document them. This preserves
one canonical terminology source without flattening different conceptual roles.

## Dictionary Coverage Requires An Area Pass

After substantively changing docs in an area, scan that area for stable terms,
add missing dictionary entries that meet the criteria, link important uses, and
remove stale links to removed entries.

## Preserve Conceptual Simplicity Across Docs And Implementation

Conceptual simplicity is more important than technical or editorial
convenience. Docs and implementation should not merge distinct responsibilities
because they are adjacent in workflow or convenient to explain together.

## Let Docs Mirror Responsibility Boundaries

When an area has clear conceptual parts, use one focused document per
responsibility or system part plus a separate composition document rather than
one umbrella document that mixes responsibilities.

## Keep Co-Located Doc Creation Manual

Creating new [co-located docs](../DICTIONARY.md#co-located-docs) changes the
repository's documentation shape. The workflow discovers and maintains
existing `*.docs.md` files but creates new ones only on explicit request.

## Keep Development Tracking Separate From Repository Truth

Markplane records work, order, status, plans, and notes. Canonical docs record
accepted repository truth. A tracked item can point to a doc, but neither a
task nor its implementation plan may redefine that truth by itself.
