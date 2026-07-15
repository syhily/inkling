# Plan 037: Delete the seams nothing varies across

> **Executor instructions**: This plan is pure deletion. Every seam listed
> below was verified to have exactly one implementation or zero callers on the
> planning commit; the designs are decided, so do not re-open them. Work in the
> five deletion clusters given in [Steps](#steps) — one commit per cluster —
> and run `pnpm typecheck` plus the affected test files after each cluster so a
> breakage is attributable to exactly one seam. The two documented exceptions:
> `urlTransformMap` is KEPT (comment added naming its out-of-repo consumer),
> and the header `version` property is KEPT as serialized data (only the
> renderer version-dispatch machinery dies).
>
> **Drift check (run first)**:
> `git diff --stat 1cad78b..HEAD -- src/html/renderer src/nodes/base/InklingDecoratorNode.ts src/nodes/base/generate-decorator-node.ts src/nodes/base/export-dom.ts src/nodes/base/visibility.ts src/nodes/base/utils/visibility.ts src/nodes/base/nodes/header src/nodes/header src/nodes/HeaderNode.tsx src/components/ui/cards/HeaderCard src/components/ui/CardWrapper.tsx src/hooks/useInputSelection.ts src/utils/node-helpers.ts test/nodes-base test/html-renderer test/unit/utils test/unit/nodes test/unit/components/ui/HeaderCard.test.tsx docs/html-api.md docs/tech-debt-triage.md`
>
> If the drift check shows changes to any listed file, re-verify the
> `file:line` citations below before deleting.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW-MEDIUM — every deletion is internal surface with a verified
  single implementation or zero callers; the residual risk is a missed
  dynamic importer, which the per-cluster `pnpm typecheck` + test gates catch
- **Confidence**: HIGH
- **Depends on**: none, but land before plans 039/040 — it shrinks the
  interface surface those plans have to move
- **Category**: dead-code deletion / interface shrink
- **Planned at**: commit `1cad78b`, 2026-07-15

## Why this matters

A seam that nothing varies across is not abstraction, it is depth without
leverage: every card's `exportDOM` pays a dispatch it never uses, the HTML
renderer carries an async fetch loop no card can trigger, and the `InklingCard`
interface advertises two methods (`hasDynamicData`, `getDynamicData`) that no
implementation overrides. Readers must simulate each branch to learn it never
fires. Deleting these seams makes `generateDecoratorNode`'s export path a
straight line, makes `render()` sync-shaped, and flattens the header card's
three `v2/` directory levels — the version they forked for is the only version
that exists. Locality improves: what a card does is again visible in one file.

## Current-state evidence

All citations re-verified on `1cad78b`.

- **Dynamic-data subsystem (zero production implementers)**:
  - `src/html/renderer/get-dynamic-data-nodes.ts` (whole file, 24 lines) —
    note: not under `utils/`; the only importer is
    `src/html/renderer/LexicalHTMLRenderer.ts:10`.
  - Fetch loop: `LexicalHTMLRenderer.ts:57-73` (gather `:57-58`,
    `Promise.all` fetch `:60-71`, `options.renderData = renderData` `:73`).
  - `renderData` option: `RenderOptions` at `LexicalHTMLRenderer.ts:17`
    (with its TODO at `:16`) and `RendererOptions` at
    `src/html/renderer/types.ts:5`.
  - `InklingCard` interface members: `src/nodes/base/InklingDecoratorNode.ts:21,24`,
    with the `$isInklingCard` guard checking `hasDynamicData` at `:38`.
  - Base implementations returning `false`: `generate-decorator-node.ts:163-165`
    (type-only base) and `:427-429` (generated class, comment at `:424-426`).
  - Repo-wide: no `hasDynamicData`/`getDynamicData` override outside these
    files. One test fixture implements them — see Test-plan note below.
- **`nodeRenderers` override seam**: option type at
  `src/nodes/base/export-dom.ts:53-60` (plus `ExportDOMRenderer`/`VersionedExportDOMRenderer`
  at `:41-51`, used only by it); dispatch at
  `generate-decorator-node.ts:359-376`. Exercised only by its own tests,
  `test/nodes-base/generate-decorator-node.test.ts:193-250`.
- **Versioned-renderer machinery**: `VersionedRenderFn` at
  `generate-decorator-node.ts:21-24`; version dispatch inside `exportDOM` at
  `:352-393` (`nodeVersion` `:355-356`, object-form `defaultRenderFn` branch
  `:378-386`). Sole user: `src/nodes/base/nodes/header/HeaderNode.ts:48-50`
  (`defaultRenderFn: { 2: renderHeaderNodeV2 }`) — no v1 renderer exists.
  Explicit generic type args at `HeaderNode.ts:40-45` (plus the supporting
  aliases at `:37-38`) exist only to feed this machinery.
  Header `v2/` directories to flatten:
  `src/nodes/base/nodes/header/renderers/v2/header-renderer.ts`,
  `src/nodes/header/v2/HeaderNodeComponent.tsx`,
  `src/components/ui/cards/HeaderCard/v2/{HeaderCard.tsx,HeaderCard.v2.stories.tsx}`.
- **Dead type variants**: `target: 'plaintext'` at `LexicalHTMLRenderer.ts:14` —
  nothing in `src/` branches on it. `ExportDOMOutputType: 'html'` at
  `export-dom.ts:3` — produced once
  (`src/nodes/base/utils/visibility.ts:213`), consumed nowhere:
  `src/html/renderer/convert-to-html-string.ts:44-55` routes everything
  non-`inner`/`value` through `getElementOuterHTML`, as does
  `visibility.ts:181-201`.
- **Zero-importer modules**: `src/nodes/base/visibility.ts` (12-line re-export
  shim, zero importers); `src/hooks/useInputSelection.ts` (zero importers in
  `src/`); `src/utils/node-helpers.ts` (`nodeProp` — only
  `test/unit/utils/nodeProp.test.ts` imports it, and the `@/utils` barrel
  `src/utils/index.ts` does not re-export it); the
  `cardType === 'call-to-action'` branch at
  `src/components/ui/CardWrapper.tsx:81` (no such node type exists anywhere
  in `src/`).
- **KEEP — `urlTransformMap`**: `generate-decorator-node.ts:285-299`, overridden
  by `src/nodes/base/nodes/gallery/GalleryNode.ts:25-33` and
  `src/nodes/base/nodes/aside/AsideNode.ts:16-18`. Write-only in-repo, but an
  out-of-repo URL-rebasing consumer reads it (`__INKLING_URL__`, the marker
  `src/nodes/base/utils/is-local-content-image.ts:4` recognizes — note: this
  file lives under `src/nodes/base/utils/`, not `src/utils/`). Add a comment
  naming that consumer; do not delete.
- **Public-surface check**: `LexicalHTMLRenderer` is NOT exported from
  `src/index.ts` (full file read; it re-exports only `@/utils`, the markdown
  pair, components/plugins/nodes). It is exported from the internal module
  `src/html/renderer/index.ts` and consumed by `test/html-renderer/*` only.
  The sync-shape change is therefore not a public-contract break.

## Scope

**In scope**:

- The five deletion clusters listed in Steps, with their tests and the two
  doc updates (`docs/html-api.md`, `docs/tech-debt-triage.md`).
- The `urlTransformMap` consumer comment.

**Out of scope**:

- Exporting `LexicalHTMLRenderer` or changing its constructor/options beyond
  the deletions (that is the plan-022 follow-up's call).
- The serialization `version` option of `generateDecoratorNode`
  (`generate-decorator-node.ts:189,195,343`) — it feeds `exportJSON`'s
  Lexical node version and stays.
- The header node's `version` _property_ (`HeaderNode.ts:19`, parser-set at
  `header-parser.ts:46`, defaulted in `src/nodes/HeaderNode.tsx:37`) —
  serialized data, not dispatch.
- Renaming `renderHeaderNodeV2` or the `describe('v2')` block in
  `test/nodes-base/nodes/header.test.ts` — cosmetic, keep the diff minimal.
- Rewriting historical plan docs that mention `v2/` paths.

## Commands you will need

| Purpose                 | Command                                                                                   | Expected on success            |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| Types                   | `pnpm typecheck`                                                                          | passes after every cluster     |
| Lint                    | `pnpm lint`                                                                               | passes (no unused-type debris) |
| Single test file        | `pnpm vitest run test/nodes-base/generate-decorator-node.test.ts` (or the cluster's file) | passes                         |
| Full unit suite         | `pnpm test:unit`                                                                          | passes, no expectation edits   |
| Format                  | `pnpm format:check` (run `pnpm format` first if imports moved)                            | exits 0                        |
| Packed-consumer gate    | `pnpm verify:package`                                                                     | passes                         |
| Storybook build (moves) | `pnpm build-storybook`                                                                    | builds with the flattened path |
| Header card e2e (moves) | `pnpm test:e2e:quiet test/e2e/cards/header-card.test.ts`                                  | passes                         |

## Git workflow

- Branch: `advisor/037-delete-dead-seams`
- Commit 1: `refactor(html): delete the unused dynamic-data render seam`
- Commit 2: `refactor(nodes): delete the nodeRenderers export override seam`
- Commit 3: `refactor(header): drop versioned renderer dispatch and flatten v2 paths`
- Commit 4: `refactor(html): drop unused plaintext target and html output variants`
- Commit 5: `refactor: delete zero-importer modules and dead branches`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Cluster 1 — dynamic-data subsystem

- Delete `src/html/renderer/get-dynamic-data-nodes.ts`.
- `src/html/renderer/LexicalHTMLRenderer.ts`: remove the import (`:10`), the
  gather/fetch block (`:57-73`), `renderData` and its TODO from `RenderOptions`
  (`:16-17`), and the now-pointless `async` on the `editor.update` callback
  (`:83`). Keep the `async render(...)` signature — `_getDefaultDom` still
  lazily imports jsdom (`:90-106`) — but the body is synchronous after DOM
  resolution (executor detail: the method may stay `async` with no awaits
  besides `_getDefaultDom`).
- `src/html/renderer/types.ts`: remove `renderData` (`:5`).
- `src/nodes/base/InklingDecoratorNode.ts`: remove `hasDynamicData()` (`:21`),
  `getDynamicData?` (`:24`), and the `hasDynamicData` check in `$isInklingCard`
  (`:38`).
- `src/nodes/base/generate-decorator-node.ts`: remove both base
  implementations (`:163-165`, `:424-429` including the doc comment).
- `test/html-renderer/default-round-trip.test.ts`: remove the `DynamicDataNode`
  fixture (`:40-90`) and the `'fetches dynamic data for cards registered
through the constructor'` test (`:164-171`). This fixture is the only
  implementer of the seam anywhere; it dies with it.
- `docs/html-api.md`: rewrite the "3. Async" section (`:69-94`) — the
  dynamic-data reason and the "Verified fact" paragraph no longer describe
  infrastructure that exists; async now has exactly one cause (the lazy jsdom
  import). Note the seam was deleted by this plan rather than merely unused.
- `docs/tech-debt-triage.md:33`: mark the `renderData` row resolved — seam
  deleted, no schema needed.
- Gates: `pnpm typecheck`, `pnpm vitest run test/html-renderer/default-round-trip.test.ts`.

### Step 2: Cluster 2 — `nodeRenderers` override seam

- `src/nodes/base/generate-decorator-node.ts`: remove the dispatch block
  (`:359-376`).
- `src/nodes/base/export-dom.ts`: remove `ExportDOMNodeRenderers` (`:53-57`),
  `VersionedExportDOMRenderer` (`:47-51`), `ExportDOMRenderer` (`:41-45` —
  orphaned by the other two), and `nodeRenderers?` from `ExportDOMOptions`
  (`:60`). `ExportDOMOptions` then extends `ExportDOMOptionsBase` with nothing;
  collapse it to `export type ExportDOMOptions = ExportDOMOptionsBase`
  (executor detail — avoids an empty-interface lint complaint).
- `test/nodes-base/generate-decorator-node.test.ts`: remove the
  `'uses custom renderer if passed in'` parametrized test (`:193-214`) and the
  `'throws error when custom versioned renderer is missing'` test (`:216-250`).
- Gates: `pnpm typecheck`, `pnpm vitest run test/nodes-base/generate-decorator-node.test.ts`.

### Step 3: Cluster 3 — versioned machinery + header v2 flatten

- `src/nodes/base/generate-decorator-node.ts`: remove `VersionedRenderFn`
  (`:21-24`), the `GeneratedVersionedRenderFn`/`GeneratedRenderFn` aliases
  (`:199-200`, once unused), the `| VersionedRenderFn<...>` union on the
  `defaultRenderFn` parameter (`:194`), `nodeVersion` (`:355-356`), and the
  object-form branch (`:378-386`). `exportDOM` becomes: missing `defaultRenderFn`
  → throw; otherwise call it. Keep the `version` option (serialization). Adjust
  the comments at `:14-17` and `:180-184`, which cite HeaderNode's explicit
  type args as the example (executor detail).
- `test/nodes-base/generate-decorator-node.test.ts`: remove the versioned
  default-renderer tests (`:101-149`) and the missing-versioned-renderer test
  (`:170-191`).
- Flatten with `git mv` (preserves history):
  - `src/nodes/base/nodes/header/renderers/v2/header-renderer.ts` →
    `src/nodes/base/nodes/header/renderers/header-renderer.ts`
  - `src/nodes/header/v2/HeaderNodeComponent.tsx` →
    `src/nodes/header/HeaderNodeComponent.tsx`
  - `src/components/ui/cards/HeaderCard/v2/HeaderCard.tsx` →
    `src/components/ui/cards/HeaderCard/HeaderCard.tsx`
  - `src/components/ui/cards/HeaderCard/v2/HeaderCard.v2.stories.tsx` →
    `src/components/ui/cards/HeaderCard/HeaderCard.stories.tsx` (rename is an
    executor detail; keeping the filename is acceptable, moving is not optional)
- Update importers: `src/nodes/base/nodes/header/HeaderNode.ts:8`,
  `src/nodes/HeaderNode.tsx:9`, the component's own `HeaderCard` import
  (`src/nodes/header/v2/HeaderNodeComponent.tsx:6`, pre-move path),
  `test/unit/components/ui/HeaderCard.test.tsx:6`, the moved stories file, and
  the literal `readFileSync` path in `test/unit/nodes/headerToolbarLabel.test.tsx:6`.
- `src/nodes/base/nodes/header/HeaderNode.ts`: pass
  `defaultRenderFn: renderHeaderNodeV2` directly (`:48-50`) and drop the
  explicit generic type args and aliases (`:37-45`) — inference from the
  render fn's parameter now does the work. Keep the `version` property.
- `docs/html-api.md:174`: update the `header/renderers/v2/header-renderer.ts`
  path mention.
- Gates: `pnpm typecheck`, `pnpm lint`,
  `pnpm vitest run test/nodes-base/generate-decorator-node.test.ts test/nodes-base/nodes/header.test.ts test/unit/components/ui/HeaderCard.test.tsx test/unit/nodes/headerToolbarLabel.test.tsx`,
  `pnpm build-storybook`, `pnpm test:e2e:quiet test/e2e/cards/header-card.test.ts`.

### Step 4: Cluster 4 — dead type variants

- `src/html/renderer/LexicalHTMLRenderer.ts:14`: narrow `target` to
  `'html' | 'email'`.
- `src/nodes/base/export-dom.ts:3`: drop `'html'` from `ExportDOMOutputType`.
- `src/nodes/base/utils/visibility.ts`: change `_renderWithEmailVisibility`'s
  return annotation (`:207`) to `ExportDOMOutput<'outer'>` and the produced
  literal (`:213`) to `'outer' as const` — behavior-identical, since both
  consumers already route `'html'` through the outerHTML branch.
- `test/nodes-base/utils/visibility.test.ts`: change the two `type: 'html'`
  inputs (`:274`, `:426`) to `'outer'` and the one output assertion
  (`:433`, `expect(result.type).toBe('html')`) to `'outer'`. These are the
  only expectation changes this plan permits outside deleted-seam tests.
- `docs/html-api.md`: drop `plaintext` from the target lists at `:15-16`,
  `:56`, `:194`, and the note at `:257`.
- Gates: `pnpm typecheck`,
  `pnpm vitest run test/nodes-base/utils/visibility.test.ts test/html-renderer`.

### Step 5: Cluster 5 — zero-importer files and dead branches

- Delete `src/nodes/base/visibility.ts` (shim), `src/hooks/useInputSelection.ts`,
  `src/utils/node-helpers.ts`, and `test/unit/utils/nodeProp.test.ts`.
- `src/components/ui/CardWrapper.tsx`: remove the `'call-to-action'` branch
  (`:81`); the spread at `:78-82` keeps only the default and caller positions.
- `src/nodes/base/generate-decorator-node.ts:280-284`: extend the existing
  `urlTransformMap` doc comment to name the out-of-repo consumer — the
  URL-rebasing pass that rewrites payload URLs to `__INKLING_URL__/...` paths
  (the marker `src/nodes/base/utils/is-local-content-image.ts:4` matches) —
  so the next audit does not re-flag it as write-only.
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm format:check`.

### Step 6: Final verification

Run the full gate set: `pnpm format`, `pnpm format:check`, `pnpm typecheck`,
`pnpm lint`, `pnpm test:unit`, `pnpm verify:package`. Confirm via
`git diff --stat` that every changed file belongs to one of the five clusters.

## Test plan

| Scenario                                    | Command                                                                             | Required invariant                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| HTML renderer suite after cluster 1         | `pnpm vitest run test/html-renderer`                                                | green without the dynamic-data fixture/test            |
| generateDecoratorNode after clusters 2+3    | `pnpm vitest run test/nodes-base/generate-decorator-node.test.ts`                   | green with seam tests removed, all kept tests unedited |
| Visibility after cluster 4                  | `pnpm vitest run test/nodes-base/utils/visibility.test.ts`                          | green; only `'html'` → `'outer'` literal changes       |
| Header after flatten                        | `pnpm vitest run test/nodes-base/nodes/header.test.ts` + e2e spec below             | green; `version: 2` dataset expectations unchanged     |
| Header card component/stories after flatten | `pnpm build-storybook` and `pnpm test:e2e:quiet test/e2e/cards/header-card.test.ts` | build and spec pass on flattened paths                 |
| Full suite after each cluster               | `pnpm test:unit` (final: plus `pnpm typecheck`, `pnpm lint`)                        | green; zero surviving references to deleted symbols    |

## Acceptance criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit` all green.
- No test expectation changes other than: the deleted-seam tests (clusters
  1-3) and the three `'html'` → `'outer'` literals in
  `test/nodes-base/utils/visibility.test.ts` (cluster 4).
- `render()` is sync-shaped: no dynamic-data fetch loop, no `renderData`
  option, synchronous `editor.update` callback; `async` retained only for the
  lazy jsdom import. A comment or commit note records that
  `LexicalHTMLRenderer` is unreleased surface — re-verified absent from
  `src/index.ts` — so this is not a public-contract break.
- `docs/html-api.md` (async section, plaintext mentions, renderer path) and
  `docs/tech-debt-triage.md` (renderData row) describe the post-deletion
  reality.
- `urlTransformMap` survives with a comment naming the `__INKLING_URL__`
  rebasing consumer; header `version` property and the serialization
  `version` option survive.
- `pnpm verify:package` passes if run.
- No `v2/` path segments remain under `src/` (verify:
  `find src -path '*v2*' -type f` returns nothing).

## STOP conditions

- Any in-repo consumer is found for a listed seam during execution (e.g. a
  card overriding `hasDynamicData`, a caller passing `nodeRenderers`, an
  importer of `useInputSelection`). Skip that deletion, record the consumer in
  the commit message and this plan, and continue with the other clusters.
- `LexicalHTMLRenderer` turns out to be exported from `src/index.ts` (drift
  since planning). The sync-shape change then becomes a public-contract
  decision — stop and escalate before landing cluster 1.
- The header flatten reveals version-aware tests beyond the dispatch tests in
  `generate-decorator-node.test.ts` — i.e. a test that depends on
  renderer-version dispatch rather than the `version` dataset property.
  (`test/nodes-base/nodes/header.test.ts:33,77,233,279,313,350` set
  `version: 2` as data and stay valid; anything stronger is a STOP.)
- `pnpm verify:package` breaks after any cluster — the deletion reached public
  surface; stop and identify the leak before continuing.

## Rollback plan

Each cluster is one commit deleting an independent seam, so revert per
cluster: `git revert <cluster-commit>` restores the seam and its tests without
touching the others. No data, serialization format, or public API changes are
involved, so no migration is needed. If the header flatten (cluster 3) must be
reverted, revert the whole commit rather than partially re-adding `v2/`
paths — the directory moves and the dispatch removal are one logical change.

## Execution notes

Plan 037 landed in full across 8 commits (`79afc8c`..`f18e1dc`): all five deletion clusters executed as specified — the dynamic-data render seam, the `nodeRenderers` override seam, the versioned-renderer dispatch plus the four-file header `v2/` flatten (true git renames), the `plaintext` target and `'html'` output-type variants, and the zero-importer modules plus the `call-to-action` dead branch. Every RETAIN item survived: `urlTransformMap` with its new out-of-repo-consumer comment, the header `version` property, the serialization `version` option, the `renderHeaderNodeV2` name, and the `inkling-v2` CSS class. Accepted deviations were limited to the `HtmlExportDOMOutput` consumer fix, six (not three) `'html'`→`'outer'` visibility test literals, the `html.test.ts` assertion fix plus its dead branch, doc line-ref corrections, and the stale v2 story title/comment cleanup. Final gates at `f18e1dc`: typecheck clean, lint 0/0, format:check clean, unit suite 203 files / 1638 passed / 21 todo; `verify:package` PASS and header e2e 17/17 verified earlier in the range. No seam names survive in src/test/demo except as unrelated senses; no `v2/` paths remain under `src/`; docs describe the post-deletion reality.
