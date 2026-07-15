# Plan 028: Publish bundled TypeScript declarations that match the real root API

> **Executor instructions**: Execute plans 025, 026, and 027 first. Generate
> declarations from the final public surface and validate the packed tarball in
> clean consumer projects. Do not make Lexical a peer or expose source aliases
> merely to make declaration generation pass.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- package.json pnpm-lock.yaml vite.config.ts tsconfig.json src/index.ts src/components src/nodes test/typecheck scripts`
> Plans 025–027 are expected drift. Stop only if their accepted public contract
> differs from the prerequisites below.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — declaration publishing can expose internal aliases or force undeclared third-party types into consumers
- **Depends on**: plans 025, 026, and 027
- **Category**: developer-experience / packaging / TypeScript
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

`@inkling/editor` is implemented in strict TypeScript and its root barrel
exports a large API, but the package publishes no `.d.ts` files and has no
`types` export condition. TypeScript consumers therefore receive JavaScript
with no usable public contract. Adding declarations before plans 025 and 026
would freeze many accidental `any`, `unknown`, and open-record boundaries;
adding them without a packed-consumer test could instead publish declarations
that resolve only inside this repository because of `@/` aliases or bundled
Lexical packages.

The goal is one supported root type entry aligned with the runtime export map,
not a promise that every source file is a public subpath.

## Current-state evidence

- `package.json` has no `types` field and no `types` condition under
  `exports["."]`.
- The current `dist/` output contains JavaScript and CSS but no `.d.ts` files.
- `tsconfig.json` is configured for application/library checking with
  `noEmit`; it is not a declaration-build configuration.
- `src/index.ts` is the intended public barrel. Internal source imports use the
  `@/` path alias, which must not leak into the published declaration graph.
- Runtime Lexical and card feature packages are bundled by design (and plan
  027 makes that contract explicit). A consumer should not be forced to add a
  second Lexical installation just so TypeScript can resolve Inkling's public
  declarations.
- React and ReactDOM remain peers; React types may legitimately remain external
  type references.
- Plans 025 and 026 define named card datasets, commands, editor props, initial
  state, and external-control contracts that should appear in the published
  declaration surface.

## Tool choice and version guard

> **Execution note (2026-07-15, batch 5)**: `unplugin-dts` + API Extractor
> hit this plan's STOP condition — API Extractor 7.58.9 bundles the TS 5.9
> compiler and crashes on this repo's TypeScript 6 declaration output
> (`AstSymbolTable` "Cannot assign isExternal=true" on the Lexical re-export
> graph; upstream microsoft/rushstack#3614). The bundle is instead produced
> by `scripts/build-types.mjs` using `dts-bundle-generator@9.5.1`, which runs
> on the repo's own TypeScript. Two of its collision bugs are handled in the
> script/source: React default-vs-namespace alias rewriting, and renaming the
> base `AudioNode` class to `BaseAudioNode` (lib.dom occupies the global
> name). All other contract points are unchanged.

Use the current official declaration plugin, `unplugin-dts` (the project
formerly known as `vite-plugin-dts`), with its Vite entry:

```ts
import dts from 'unplugin-dts/vite'
```

At planning time the official repository documents `bundleTypes`,
`tsconfigPath`, `pathsToAliases`, `insertTypesEntry`, and API Extractor
integration. Pin a version compatible with the repository's supported Node,
Vite, and TypeScript versions; do not copy an old `vite-plugin-dts` snippet
from a blog. The official sources to re-check during execution are:

- <https://github.com/qmhc/unplugin-dts>
- <https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports>

If those APIs have changed, resolve the current official docs before editing
configuration and update this plan's exact option spelling in the PR notes.

## Public declaration contract

The completed package must provide:

1. `package.json.types` and `exports["."].types` pointing to an existing root
   declaration file.
2. A declaration entry whose values/types correspond to `src/index.ts` and the
   same root runtime entry.
3. No repository-only `@/` import specifiers, absolute local paths, `src/`
   references, or test/demo imports.
4. No requirement that consumers install a second copy of bundled Lexical or
   optional card runtimes solely for type resolution.
5. External React type references compatible with the declared React peer.
6. Correct resolution under both modern `moduleResolution: "Bundler"` and
   Node's `NodeNext` mode.
7. Named public editor and card payload types from plans 025/026, rather than a
   hand-written declaration façade that can drift from implementation.

## Scope

**In scope**:

- `package.json`, lockfile, `vite.config.ts`, and a dedicated declaration
  tsconfig
- `src/index.ts` export hygiene only where required by public declarations
- Packed-package verification script from plan 027
- New clean TypeScript consumer fixtures/scripts
- README TypeScript usage and package-format documentation

**Out of scope**:

- Publishing deep `src/*` subpaths
- Adding a handwritten ambient `declare module '@inkling/editor'`
- Disabling strictness, `skipLibCheck`-only acceptance, or replacing errors
  with `any`
- Making Lexical a runtime peer as a shortcut
- Redesigning the editor API beyond plans 025/026
- Shipping source `.tsx` files to consumers

## Commands you will need

| Purpose                | Command                          | Expected on success                               |
| ---------------------- | -------------------------------- | ------------------------------------------------- | ---- | ----- | ----------------------------- | ---------- |
| Root typecheck         | `pnpm typecheck`                 | exit 0                                            |
| Library build          | `pnpm build`                     | emits JS/CSS and root declarations                |
| Declaration inspection | `rg -n "@/                       | /Users/                                           | src/ | test/ | demo/" dist --glob '\*.d.ts'` | no matches |
| Packed consumer gate   | `pnpm verify:package`            | ESM, CJS, Bundler TS, and NodeNext TS checks pass |
| Lint/format            | `pnpm lint && pnpm format:check` | both exit 0                                       |
| Full units             | `pnpm test:unit`                 | all tests pass                                    |

## Git workflow

- Branch: `advisor/028-publish-declaration-files`
- Commit 1: `test(types): add packed consumer declaration fixtures`
- Commit 2: `build(types): emit bundled public declarations`
- Commit 3: `docs(types): document the published api contract`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add failing clean-consumer type checks

Extend the temporary packed-package verifier from plan 027 or add a companion
`scripts/verify-packed-types.mjs`. Reuse the same packed tarball and isolated
temporary directory; do not maintain a checked-in nested lockfile.

Create two consumer configurations:

**Bundler consumer**:

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  }
}
```

**NodeNext consumer**:

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noEmit": true
  }
}
```

Install the tarball, TypeScript, React, ReactDOM, and their type packages. Do
not install Lexical, `@lexical/*`, markdown-it, CodeMirror, emoji-mart,
fast-average-color, Yjs, or y-websocket explicitly.

The shared `consumer.tsx` must:

- import `InklingEditor`, `InklingComposer`, representative node factories,
  and named types only from `@inkling/editor`;
- instantiate valid props including serialized initial state, markdown
  transformers, a typed register callback, and at least one card insert
  command payload introduced by plans 025/026;
- use `satisfies` so accidental widening is visible;
- include a few `@ts-expect-error` cases for invalid callback and payload
  shapes, proving the package is not effectively `any`;
- avoid importing from any deep or undocumented path.

First run the fixture against the unchanged packed package and capture the
expected missing-declaration error. This is the red test.

### Step 2: Add a declaration-only build configuration

Create `tsconfig.build.json` extending the root config. Keep strictness and the
same JSX/module target, but narrow `include` to the public source graph and
exclude demo, tests, plans, coverage, and build artifacts. Configure
declaration generation through the plugin rather than turning the normal
`pnpm typecheck` into an emitting command.

Important constraints:

- `rootDir`/include must be consistent so the declaration root is stable.
- Do not set `skipLibCheck: true` solely to suppress generated public errors.
- Do not disable `declarationMap` reflexively. Choose it based on package size
  and source publication: if source files are not shipped and maps would point
  to missing local paths, omit declaration maps; otherwise verify every map
  target is valid inside the tarball.
- Exclude generated declaration output from source typechecking to prevent
  recursive inclusion.

Add `unplugin-dts` and the exact API Extractor package it requires as pinned
development dependencies using pnpm, then update the lockfile. Verify their
Node engine ranges against the repository CI version before committing.

### Step 3: Generate a single bundled root declaration

Add the Vite declaration plugin after the existing React plugin. Configure it
with the dedicated tsconfig and an output directory matching `dist`.

Use bundled/API-Extractor mode so the published root does not expose dozens of
implementation-relative declaration files. Configure package bundling for the
types of runtime libraries Inkling owns and bundles. Start with the exact
Lexical and `@lexical/*` packages referenced by the public graph; include card
runtime packages only if they appear in exported signatures.

Do not assume `bundledPackages` accepts globs—use the current documented exact
package semantics. Generate once, then inspect the declaration graph:

```bash
pnpm build
find dist -name '*.d.ts' -maxdepth 3 -print
rg -n "from ['\"](@/|\.\./src|/Users/)|reference path|@lexical|from ['\"]lexical['\"]" dist --glob '*.d.ts'
```

Interpret results carefully:

- `@/`, absolute filesystem paths, and `src/` are always defects.
- React type imports are expected.
- Lexical imports are acceptable only if the final package deliberately
  declares Lexical as a compatible type/runtime dependency. That is **not**
  this plan's baseline; prefer inlining/bundling the necessary types.
- Private implementation types should be inlined or removed from exported
  signatures, not exported merely to appease the generator.

If API Extractor reports forgotten exports, decide whether each type is truly
part of an exported signature. Export a named type from `src/index.ts` when it
is a real public contract; otherwise adjust the public signature to an already
public structural type. Never add an `any` façade.

### Step 4: Align package metadata with conditional exports

Add:

```json
{
  "types": "./dist/editor.d.ts",
  "exports": {
    ".": {
      "types": "./dist/editor.d.ts",
      "import": "./dist/editor.js",
      "require": "./dist/editor.umd.cjs"
    }
  }
}
```

Use the actual filename emitted by Step 3 if the tool chooses a different
stable root. Keep `types` first in the conditional object for resolvers that
honor condition order. Preserve plan 027's CSS/package export behavior and
legacy UMD artifact.

Do not add wildcard exports for `./dist/*` or `./src/*`. If consumers already
depend on an explicitly documented CSS path, preserve that exact export/path.

Extend build-output tests to parse `package.json` and assert every declared
entry exists after build.

### Step 5: Make the packed consumer prove type ownership

Run both clean-consumer TypeScript configurations with `skipLibCheck: false`.
They must pass without installing Lexical or optional feature packages.

Then add negative resolution checks:

- rename/remove the declaration file in a copy of the unpacked tarball and
  prove the fixture fails, confirming it is not accidentally reading the
  source workspace;
- inspect `tsc --traceResolution` only when debugging, and keep the trace out
  of git;
- ensure package-manager workspace linking is disabled so the consumer cannot
  resolve undeclared packages from the repository root.

The positive compile must consume the installed tarball path. A source alias
compile in `test/typecheck/` remains useful for plans 025/026 but is not
evidence of a publishable declaration package.

### Step 6: Add declaration-quality assertions

Add a lightweight script or build test that fails when:

- no root `.d.ts` is emitted;
- `package.json.types` or `exports["."].types` points to a missing file;
- a declaration contains `@/`, an absolute developer path, `test/`, or
  `demo/`;
- source-only files are unexpectedly packed;
- the public editor props from plan 026 or representative card dataset/command
  types from plan 025 disappear.

Do **not** assert that the declaration contains zero textual `any` occurrences:
third-party or intentionally generic library types may use `any`, and a
substring gate creates false confidence. Instead, the clean consumer's
`@ts-expect-error` cases should prove that key Inkling-owned boundaries reject
incorrect values.

### Step 7: Document TypeScript consumption

Update README with a compact TypeScript example importing public props/types
from the root. State the supported entry point and module-resolution modes.
Remove any implication that consumers should import internal node source
paths.

If declaration bundling necessarily leaves an external type dependency, list
it explicitly and explain why. This is a STOP-and-review outcome for Lexical,
not a documentation-only decision.

### Step 8: Run all release gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm build
pnpm verify:package
pnpm test:unit
```

Inspect the final tarball, not only `dist/`. Confirm no API Extractor temp
files, declaration rollup reports, local paths, or fixture directories are
published accidentally.

## Test plan

| Layer                | Required evidence                                                |
| -------------------- | ---------------------------------------------------------------- |
| Source typecheck     | existing strict project plus plans 025/026 fixtures pass         |
| Build structure      | root `.d.ts` exists; metadata targets exist; no internal aliases |
| Bundler consumer     | valid public JSX/commands compile; invalid shapes are rejected   |
| NodeNext consumer    | same root API resolves under Node conditional exports            |
| Dependency isolation | consumers omit bundled Lexical/card packages and still compile   |
| Tarball              | declaration files included; source/test/temp files excluded      |

## Acceptance criteria

- The packed package exposes a real declaration entry through both `types`
  metadata locations.
- Both strict clean consumers compile with `skipLibCheck: false`.
- Representative wrong public prop and command payloads fail to compile.
- Declarations contain no workspace aliases or absolute local paths.
- Consumers need only documented peer/type dependencies.
- Runtime ESM/CJS verification from plan 027 still passes.
- Documentation imports exclusively from `@inkling/editor`.

## STOP conditions

- Plans 025 or 026 are incomplete and generated declarations would expose
  their known `any`/open-record contracts.
- Declaration rollup requires making Lexical a peer or dependency visible to
  consumers. Report the unresolved types and evaluate duplicate-runtime risk
  before changing package ownership.
- API Extractor/unplugin-dts does not support the repository's TypeScript 6 or
  Node version. Use the current official compatibility guidance; do not pin an
  unmaintained plugin silently.
- The generated root omits runtime exports or invents type exports not backed
  by `src/index.ts`.
- Either clean consumer resolves packages from the monorepo/root instead of
  its isolated install.
- Making a private implementation type public would materially expand the API;
  request review rather than exporting it automatically.

## Rollback plan

Revert plugin/config, package metadata, lockfile, tests, and docs as one unit.
Do not leave a `types` path pointing to a missing file. Keep the clean-consumer
fixture if feasible so a replacement declaration approach has the same
acceptance gate.
