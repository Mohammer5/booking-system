# Architecture Status

Current baseline:

- No application or package workspace is declared.
- No product `src/` directory or product code exists.
- The repository uses modern ESM JavaScript and pnpm workspace globs.
- ESLint source-shape rules target future application and package source.
- The boundary converter implements deny-by-default workspace and module
  enforcement from explicit local maps.
- Local ESLint rules and boundary conversion have Node test suites.
- No architecture fitness function, secondary checker, inferred dependency
  map, runtime framework, or runtime dependency exists.

Workspace identities, dependency edges, responsibility modules, composition
files, package exports, frameworks, and runtime dependencies remain undeclared
until an explicitly authorized project change proves they are needed.
