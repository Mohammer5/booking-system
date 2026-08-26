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

## Keep One Canonical Verification Entry Point

`pnpm check` composes all non-deployment verification so local work, pull
requests, and releases rely on the same evidence. Existing Node tests retain
ownership of ESLint tooling; future application layers extend the composition
instead of replacing those tests or adding a competing check-everything path.

## Layer Tests By Responsibility

Fast product tests, Workers/D1 integration tests, local browser tests, hosted
staging browser tests, and production smoke checks answer different questions.
Keeping those layers distinct avoids both browser-only coverage and duplicated
assertions at every level.

## Use GitHub Actions As The CI/CD Authority

One authority should decide whether production may change. GitHub Actions owns
the normal verification and release gates; Cloudflare supplies the runtime and
deployment target but does not independently auto-deploy `main`.

## Separate Merge Verification From Production Release

Pull requests and pushes to `main` establish merge confidence but never deploy
production. A release tag initiates a fresh full gate, proves the tagged commit
is contained in `main`, verifies a real Cloudflare pre-production version, and
only then promotes that same commit.

## Add Deployment Automation Only When It Can Deploy Reality

The repository gains useful CI immediately because lint and architecture
tooling tests already exist. Application test configuration and the release
workflow wait for the first real application so no empty suite or fictional
deployment can report misleading success.
