# Plan 027: Make the packed ESM and CommonJS entry points work with the documented install contract

> **Executor instructions**: Treat the packed tarball—not a source checkout—as
> the product under test. Follow the red/green sequence below and preserve both
> public entry styles and the legacy UMD filename. If a STOP condition occurs,
> report the evidence instead of silently changing the package contract.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- package.json pnpm-lock.yaml vite.config.ts README.md scripts test/unit/build-output.test.ts`
> Reinspect the emitted import/require prelude if any build or dependency file
> changed. This plan's evidence was collected from commit `316dd61`.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH — this changes what is bundled and the physical CommonJS filename, while intentionally preserving the public API
- **Depends on**: none
- **Category**: bug / packaging / compatibility
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

The README promises that optional card dependencies are needed only for the
features a consumer uses. The published root entry cannot currently satisfy
that promise: Vite externalizes every optional feature package, while the root
barrel statically imports every card. Both emitted bundles therefore resolve
all feature packages as soon as `@inkling/editor` is loaded, even when the
consumer never renders those cards.

The CommonJS condition has a second independent failure. `package.json` marks
the package as `"type": "module"` but maps `require` and `main` to
`dist/editor.umd.js`. Node interprets that `.js` file as ESM before it can run
the UMD wrapper. A true CJS artifact must use `.cjs` (or live under a nested
CommonJS package boundary).

Koenig's current Vite configuration provides useful compatibility evidence:
it externalizes React/ReactDOM but bundles the feature stacks. Adopt that
runtime property, not Koenig's weaker TypeScript settings or its unchanged
`.umd.js` packaging mistake.

## Current-state evidence

- `package.json` has `"type": "module"`, `main: "dist/editor.umd.js"`, and an
  `exports["."].require` condition pointing to the same `.js` file.
- `vite.config.ts` externalizes markdown-it and its plugins, CodeMirror,
  emoji-mart, fast-average-color, Yjs, and y-websocket in addition to React.
- `dist/editor.js` contains top-level static imports for those packages.
  `dist/editor.umd.js` contains unconditional `require(...)` calls for them in
  its wrapper prelude.
- `README.md:15-23` says consumers can install only the optional peers for the
  cards they use and that the base editor continues to install and work when
  they are absent.
- `test/unit/build-output.test.ts` checks CSS handling and the existence of the
  `.umd.js` artifact, but never installs the packed package in a clean consumer
  or executes either export condition.
- `package.json` already declares React and ReactDOM as true runtime peers.
  They are the only packages the compatibility baseline should continue to
  resolve from the consuming application.
- The reference Koenig build externalizes React and ReactDOM only. This avoids
  load-time failure for feature packages, at the cost of a larger distribution
  bundle.
- `pnpm audit --prod` reported no known vulnerabilities during this audit.
  This plan is about availability and package semantics, not an advisory.

## Compatibility contract

Preserve all of the following:

1. `import {InklingEditor} from '@inkling/editor'` works in an ESM consumer
   with a browser-shaped DOM environment.
2. `require('@inkling/editor')` works in a CommonJS consumer with the same DOM
   environment.
3. Consumers that reference `dist/editor.umd.js` directly do not lose that
   physical artifact in this release.
4. React and ReactDOM remain peer dependencies and are not bundled.
5. No exported component, node, command, CSS class, or root export is renamed.
6. Consumers do not have to install card-specific packages merely to import
   the root module.
7. Optional card behavior remains available; this is not authorization to cut
   markdown, code, emoji, collaboration, image-color, or any other feature.

The intentional tradeoff is distribution size: feature runtimes become part
of Inkling's compiled assets so root import remains dependable. A future
subpath/dynamic-import architecture may recover that size, but it is a
separate breaking-risk project and is not a prerequisite for restoring the
current README contract.

## Scope

**In scope**:

- `package.json`, `pnpm-lock.yaml`, and `vite.config.ts`
- A small deterministic build/verification script under `scripts/`
- `test/unit/build-output.test.ts` and a clean packed-consumer smoke fixture
- README installation, package-format, and optional-dependency documentation
- Build output naming and compatibility copying

**Out of scope**:

- Declaration-file publishing (plan 028)
- Splitting every card into a new npm subpath or asynchronous chunk
- Changing React's peer range
- Replacing Vite, pnpm, or the one-package repository structure
- Cutting optional cards or collaboration
- Checking generated `dist/` into git if it is currently ignored

## Commands you will need

| Purpose            | Command                                            | Expected on success                                                           |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Baseline build     | `pnpm build`                                       | exits 0 and emits both canonical artifacts plus the legacy compatibility file |
| Build-output tests | `pnpm test:unit -- test/unit/build-output.test.ts` | all assertions pass                                                           |
| Packed consumer    | `pnpm verify:package`                              | clean ESM import and CJS require both pass without feature packages installed |
| Type/lint gates    | `pnpm typecheck && pnpm lint`                      | both exit 0                                                                   |
| Full unit gate     | `pnpm test:unit`                                   | all tests pass                                                                |
| Format gate        | `pnpm format && pnpm format:check`                 | exits 0                                                                       |

## Git workflow

- Branch: `advisor/027-fix-published-runtime-contract`
- Commit 1: `test(package): reproduce packed entry failures`
- Commit 2: `fix(package): bundle feature runtimes and emit cjs`
- Commit 3: `docs(package): document the compatible runtime contract`
- Do not commit generated temp consumers, npm/pnpm stores, or `dist/` unless
  repository policy already tracks it.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a failing packed-consumer verifier before changing the build

Create `scripts/verify-packed-package.mjs` and expose it as
`pnpm verify:package`. The script must:

1. Create a temporary directory outside the repository tree with
   `fs.mkdtemp()` and remove it in `finally`.
2. Run the repository's pack command and capture the exact tarball path rather
   than guessing its name. Prefer `pnpm pack --pack-destination <temp>`.
3. Create two tiny consumers under the temp directory. Because Inkling's
   browser library injects its CSS at module evaluation, give both scripts the
   same minimal deterministic DOM shim (`document.createElement('style')` and
   `document.head.appendChild`) before loading the package. This is a module-
   resolution harness, not a claim that the editor supports DOM-free SSR:
   - ESM: `package.json` with `type: module`; install the shim, then use dynamic
     `import()` for the package root and assert `InklingEditor` (plus one
     representative command) is defined.
   - CJS: a `.cjs` script that installs the shim before calling
     `require('@inkling/editor')` and performs the same root-export assertion.
4. Install the tarball plus compatible React and ReactDOM versions. Do **not**
   install markdown-it, CodeMirror, emoji-mart, fast-average-color, Yjs, or
   y-websocket explicitly. Use an isolated store/cache argument if repository
   CI conventions require it; never mutate the root lockfile.
5. Execute both consumers with the repository-supported Node version. Do not
   install jsdom merely to make root loading pass; a full DOM implementation
   could obscure which dependency or top-level side effect is responsible.
6. Print a short phase label and preserve child stderr on failure, without
   printing environment variables or registry credentials.

First run it against the unchanged package. Capture in the commit/PR notes the
actual failures (expected: unresolved external package on root import and/or
`ERR_REQUIRE_ESM` for the require condition). Do not weaken the script to make
the baseline pass.

Also extend `test/unit/build-output.test.ts` with structural assertions that
will go green later:

- canonical CommonJS output is `editor.umd.cjs`;
- the legacy `editor.umd.js` file still exists;
- neither ESM nor UMD/CJS prelude contains static imports/requires for the
  feature packages;
- React and ReactDOM remain external references.

Keep packed execution in the standalone script rather than spawning installs
from Vitest.

**Verify (expected red)**: `pnpm build && pnpm verify:package`. Record the
failure. If both modes already pass on the drifted revision, stop and reassess
instead of applying the proposed bundle changes blindly.

### Step 2: Define the dependency policy from runtime ownership

Retain `react` and `react-dom` in `peerDependencies`, with their current
optional metadata behavior only if that is already intentional. For every
feature package currently externalized, choose one coherent ownership model:

- The compatibility baseline for this plan is **bundled by Inkling**.
- Keep the packages available to the build as `devDependencies` (or as normal
  `dependencies` only if another shipped, non-bundled artifact genuinely
  resolves them at runtime).
- Remove misleading optional peer declarations for packages that are fully
  bundled and never resolved from the consumer.

Update the lockfile with the repository package manager. Do not hand-edit it.
Do not introduce duplicate versions merely to emulate Koenig; retain Inkling's
currently tested versions unless the build proves a version is incompatible.

Document the decision next to Vite's `external` function/list so a future
cleanup does not re-externalize feature packages without a packed-consumer
test. The final external set should be React, ReactDOM, and their JSX runtime
entry points as required by the existing build.

**Verify**: `pnpm build`. Inspect the first part of both output files with
`sed`/`rg`; feature packages must not appear as top-level imports or UMD
factory parameters. Their string names may legitimately occur inside bundled
license comments or code, so assert executable import/require structure, not a
naive zero-string rule.

### Step 3: Emit a real CommonJS filename while retaining the old artifact

Configure Vite/Rollup so the UMD/CommonJS-compatible library artifact is
emitted canonically as `dist/editor.umd.cjs`. Update:

- `package.json.main` to `./dist/editor.umd.cjs`;
- `package.json.exports["."].require` to `./dist/editor.umd.cjs`;
- any README examples that name the canonical UMD file.

Retain `dist/editor.umd.js` as a byte-equivalent legacy compatibility artifact
for direct-path consumers and existing deployment scripts. If Vite cannot emit
two names for one output in a single library build, add a small
`scripts/copy-legacy-umd.mjs` post-build script using `node:fs/promises`:

- copy `.cjs` to `.js` deterministically;
- copy/update the sourcemap if sourcemaps are emitted, ensuring the legacy
  file's `sourceMappingURL` points to a file that exists;
- fail loudly if the canonical source artifact does not exist;
- do not add a nested `dist/package.json` solely to reinterpret `.js`, because
  that would make the old direct-path file behave differently for ESM users.

The legacy `.js` file is for browser/script-loader and direct-file
compatibility. Node's `require` condition must always select `.cjs`.

Update the build-output test so it verifies both artifacts contain the same
runtime body (ignoring only source-map trailer differences if necessary).

**Verify**:

```bash
pnpm build
node -e "const p=require('./package.json'); if (!p.main.endsWith('.cjs')) process.exit(1)"
pnpm test:unit -- test/unit/build-output.test.ts
```

All must pass.

### Step 4: Make the packed smoke test a release gate

Run `pnpm verify:package` against the rebuilt tarball. Strengthen the verifier
to check:

- ESM root import succeeds with no feature-package installation;
- CJS root require succeeds with no `ERR_REQUIRE_ESM`;
- one representative optional-feature export, such as a card node class, is
  present from both module modes (construction/rendering is not necessary in
  Node);
- `require.resolve('@inkling/editor')` ends in `.cjs`;
- the ESM resolution path ends in `editor.js`;
- tarball contents include JS, CSS, package metadata, and the legacy UMD
  compatibility file, but do not include source tests, the temp consumer, or
  local credentials.

Add the script to the same CI/release workflow that runs `pnpm build`, if a
workflow exists in the repository. Do not run it on every fast unit-test shard
if that would repeatedly install the same tarball; one packaging job is
sufficient.

**Verify**: `pnpm verify:package` → both consumer modes and tarball assertions
pass.

### Step 5: Record and control the bundle-size tradeoff

Measure the pre-change and post-change raw and gzip sizes of `editor.js` and
`editor.umd.cjs`. Put the numbers in the PR description or a small documented
baseline test; do not claim this change is size-neutral.

Add a generous regression ceiling only if the project already has a bundle
budget convention. The threshold should catch accidental duplication, not
prevent necessary compatibility work. Inspect the bundle or Rollup visualizer
if the same large package appears twice. Do not deduplicate by externalizing it
again without an alternate runtime loading contract and packed tests.

### Step 6: Correct installation and format documentation

Update `README.md` so it says:

- React and ReactDOM are consumer peers;
- card and collaboration runtimes are bundled for root-import compatibility;
- optional **configuration/features** may remain inactive until used, but no
  consumer package installation is required for them;
- the package exposes ESM and CommonJS entry conditions;
- `dist/editor.umd.js` remains as a legacy browser/direct-path artifact, while
  Node CommonJS resolves `.cjs`.

Remove the current optional-peer installation matrix if it is no longer true.
Do not promise tree-shaking of every card: the root barrel statically exposes
the complete editor.

If release notes are maintained, flag the larger bundle and explain that no
JS/TS API changed.

### Step 7: Run full verification

Run, in order:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm build
pnpm test:unit -- test/unit/build-output.test.ts
pnpm verify:package
pnpm test:unit
```

Review `git status --short` and confirm no tarball, temporary consumer,
generated store, or credential file remains.

## Test plan

| Layer                 | Required cases                                                                   |
| --------------------- | -------------------------------------------------------------------------------- |
| Structural build test | `.cjs` canonical output, legacy `.js` output, CSS retained, only React externals |
| Packed ESM consumer   | root import with React peers only; representative exports exist                  |
| Packed CJS consumer   | root require with React peers only; resolution selects `.cjs`                    |
| Tarball contents      | expected JS/CSS/package files included; repo-only/temp files excluded            |
| Regression            | full unit suite and type/lint/build gates                                        |

## Acceptance criteria

- A clean browser-targeted application can import the package root after
  installing only the documented React peers.
- The CommonJS condition can be executed in a browser-shaped harness without
  `ERR_REQUIRE_ESM`.
- Feature packages are not load-time externals of either published root entry.
- `exports.import`, `exports.require`, and `main` point to files with correct
  Node semantics.
- The legacy `dist/editor.umd.js` artifact still ships.
- README statements match the packed tarball behavior.
- Bundle-size impact is measured and disclosed.
- All verification commands pass and no temporary artifacts remain.

## STOP conditions

- A downstream compatibility contract explicitly requires feature packages to
  stay external and can demonstrate a working install/loading mechanism.
- Bundling creates multiple Lexical or React runtimes; React must remain
  external and only one editor runtime may execute.
- The package's supported browser matrix cannot run the bundled output.
- A hard release-size budget would be exceeded and the product owner has not
  approved the tradeoff.
- The old `.umd.js` path is known to be imported as Node ESM code that would be
  broken by copying the UMD/CJS body. Preserve evidence and design a separate
  compatibility entry instead.
- The packed verifier passes before changes because the package contract has
  drifted; re-audit and rewrite this plan against the new outputs.

## Rollback plan

Revert the build/dependency/doc commits together. Do not revert only the
package export map while leaving emitted filenames changed. If bundle size is
the reason for rollback, keep the packed-consumer test as a failing regression
and open a replacement plan for explicit feature subpaths/dynamic imports;
otherwise the original availability bug will silently return.
