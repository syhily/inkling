# Plan 039: One declaration per card — deepen the generator, derive the registries

> **Executor instructions**: This plan is a five-batch refactor; land one
> conventional commit per batch and run the batch gates before moving on. The
> card declarations are the new source of truth, but every registry must
> remain a *derived view* that is byte-for-byte identical to today's arrays —
> capture the pre-refactor node sets in a diff test in Batch 1 and never edit
> expectations to match drift. The generator
> (`src/nodes/base/generate-decorator-node.ts`) stays React-free: the
> documented base/wrapper seam (AGENTS.md) is preserved. Where the spec
> language cannot express a card's behaviour, move the card to the surviving-
> wrappers list and record why — do not grow the spec language silently.
> Proposed module names below are illustrative; file:line evidence is not.
>
> **Drift check (run first)**:
> `git diff --stat 1cad78b..HEAD -- src/nodes src/markdown src/html/default-html-nodes.ts src/utils/buildCardMenu.ts src/utils/getEditorCardNodes.ts src/plugins/DragDropReorderPlugin.tsx src/components/InklingCardWrapper.tsx src/index.ts AGENTS.md`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH — touches every card, every node-set registry, and the serialization path of all eight nested-editor cards
- **Confidence**: MEDIUM-HIGH — the copies are near-identical and the acceptance diff tests are mechanical, but the base-barrel import cycle and per-card behaviour wrinkles need care
- **Depends on**: 037 (Delete the seams nothing varies across — land first or the generator re-absorbs what 037 removed), 038 (Move card selection to an editor-side store)
- **Category**: architecture deepening / refactor
- **Planned at**: commit `1cad78b`, 2026-07-15

## Why this matters

Adding a card today means editing ~16 files: three node-set registries, the
markdown pair, two email node sets, plugin mounts, and the public barrel.
Knowledge about one card is smeared across a base node, a wrapper node, and
every registry, and the wrapper layer is thirteen near-identical copies of the
same stencil: the nested-editor caption trilogy (~25 lines ×8), `getIcon()`
(×13), `decorate()` (×13), and transient upload props (×4). Copies drift:
commit `b60bd7c` had to restore a wrapper style lost on one copy, and commit
`5933334` fixed header card toolbars labeled `signup` — a card that does not
exist in this repo. CONTEXT.md already names the target shape: a **card
declaration** is the single per-card source of truth, and every registry is a
derived view over the declarations. This plan makes that real.

## Current-state evidence

- Caption trilogy ×8 (constructor `setupNestedEditor`/`populateNestedEditor`,
  `getDataset` appending `*Editor`/`*EditorInitialState`, `exportJSON`
  re-serializing via `$generateHtmlFromNodes` + `cleanBasicHtml`):
  `ImageNode.tsx:89-95,101-113,134-149`; `VideoNode.tsx:60-65,72-81,83-97`;
  `GalleryNode.tsx:56-61,67-76,78-92`; `BookmarkNode.tsx:51-57,59-68,70-84`;
  `CodeBlockNode.tsx:33-38,50-59,61-75`; `CalloutNode.tsx:43-48,51-65,67-75`;
  `ToggleNode.tsx:50-59,72-82,84-104` (×2 editors); `HeaderNode.tsx:50-59,62-82,84-92` (×2 editors).
- The `cleanBasicHtml` flag matrix is per card: Image `{firstChildInnerContent: true}`
  (`ImageNode.tsx:143`); Video/Gallery/Bookmark/CodeBlock no flags
  (`VideoNode.tsx:91`, `GalleryNode.tsx:86`, `BookmarkNode.tsx:78`, `CodeBlockNode.tsx:69`);
  Callout `{allowBr: true}` (`CalloutNode.tsx:59`); Toggle heading
  `{firstChildInnerContent: true, allowBr: true}` vs content `{allowBr: true}`
  (`ToggleNode.tsx:90,98`); Header both `{firstChildInnerContent: true, allowBr: true}`
  (`HeaderNode.tsx:68,76`).
- Dataset-shape wrinkles to preserve exactly: Header's `getDataset` exposes the
  editors but *not* the `*InitialState` keys (`HeaderNode.tsx:84-92`) while
  Toggle exposes all four (`ToggleNode.tsx:72-82`); Image's `getDataset` also
  exposes transient `__previewSrc`/`__triggerFileDialog` (`ImageNode.tsx:101-113`);
  Audio and File have no `getDataset` override at all.
- Transient upload props ×4: `AudioNode.tsx:16-17,50-53`; `VideoNode.tsx:24-25,67-70`;
  `FileNode.tsx:16-17,50-53`; `ImageNode.tsx:34-40,77-87,115-128`. CodeBlock's
  `_openInEditMode` edit-mode flag is the same shape (`CodeBlockNode.tsx:23,30-31,45-48`).
- `getIcon()` returns the SVG already named in `cardMenu` — 13 copies (grep
  `getIcon` in `src/nodes/*Node.tsx`), consumed in exactly one place:
  `DragDropReorderPlugin.tsx:71-74`. Image's `cardMenu` has two entries
  (Image + GIF) and `getIcon` returns the first entry's icon (`ImageNode.tsx:42-70,97-99`).
- `cardMenu` drift: `HorizontalRuleNode.tsx:11` and `HtmlNode.tsx:14` declare
  bare objects while the other eleven cards use arrays; the tolerance branch
  lives at `buildCardMenu.ts:83-89`.
- Card-width/wrapper knowledge is split across decorate bodies:
  `ButtonNode.tsx:36` (`width="regular" wrapperStyle="wide"`),
  `GalleryNode.tsx:96` (`width={'wide'}`), `ToggleNode.tsx:108` (`width="regular"`),
  `CodeBlockNode.tsx:79` (`wrapperStyle="code-card"`), `HtmlNode.tsx:34`
  (`wrapperStyle="wide"` + `IndicatorIcon`), `HorizontalRuleNode.tsx:27`
  (`className="inline-block"`), Image/Video `normalizeCardWidth(this.cardWidth) ?? 'regular'`
  (`ImageNode.tsx:155`, `VideoNode.tsx:100`), Header maps layout→width
  (`HeaderNode.tsx:94-97`). `InklingCardWrapper` accepts exactly
  `width`, `wrapperStyle`, `IndicatorIcon`, `className` (`InklingCardWrapper.tsx:19-24`).
- Registration sites per new card: `DefaultNodes.ts:33-63`;
  `inkling-default-nodes.ts` (imports `:6-26`, `export*` `:31-52`,
  `DEFAULT_NODES` `:103-129`); `round-trip.ts:48-67` (`MARKDOWN_NODES`) and
  `:69-81` (`CARD_TRANSFORMERS`); `AllDefaultPlugins.tsx:35-47`;
  `EmailEditorNodes.ts:25-47`; `EmailNodes.ts:14-25`; `EmailEditor.tsx:15-25`;
  `src/index.ts:73-79`.
- `$create`/`$is` are duplicated at both layers: base
  `base/nodes/button/ButtonNode.ts:30-36` vs wrapper `ButtonNode.tsx:48-54`;
  consumers import from different layers (`markdown/card-transformers.ts:4-14`
  imports wrappers; `test/nodes-base/nodes/button.test.ts:9` imports base).
- `ensure-node-own-methods.ts` (at `src/nodes/base/ensure-node-own-methods.ts`)
  exists only because wrapper subclassing breaks Lexical dev own-property
  checks; invoked by hand at `DefaultNodes.ts:65-67`, `EmailNodes.ts:27-29`,
  `EmailEditorNodes.ts:49-51`.
- Bookmark's escape hatch: `base/nodes/bookmark/BookmarkNode.ts:38-39` declares
  `urlPath: 'metadata.icon'` yet constructor/`getDataset`/`importJSON`/
  `exportJSON` are all overridden (`:52-109`) — the current spec language
  cannot express its flat↔nested metadata remap.
- Import-cycle hazard: six `*NodeComponent.tsx` files import
  `GeneratedDecoratorNodeBase` from the barrel `@/nodes/base`
  (e.g. `CalloutNodeComponent.tsx:11`, `ButtonNodeComponent.tsx:11`,
  `GalleryNodeComponent.tsx:15`), and `@/nodes/base` re-exports
  `inkling-default-nodes.ts` (`base/index.ts:1`). If the base barrel imports
  declarations that import components, the cycle is real and
  `import/no-cycle` is `off` (`oxlint.config.ts:127`) — nothing will flag it.
- The derivation idiom already exists: runtime reflection over `cardMenu` at
  `getEditorCardNodes.ts:8-22`. No codegen, no build step.
- MarkdownNode (`base/nodes/markdown/MarkdownNode.ts`) is a base-only node —
  no wrapper, no `cardMenu`, no `decorate` — present in `DEFAULT_NODES`
  (`inkling-default-nodes.ts:112`) and the markdown registries only.

## Scope

**In scope**:

- One card declaration module per card (13 cards) holding the card spec
  (properties, `cardMenu`, nested editors with the `cleanBasicHtml` flag
  matrix, transient upload props, decorate-target component + wrapper props)
  and registration knowledge (node classes, markdown eligibility +
  transformer, email eligibility).
- Generator absorption of the spec additions, staying React-free.
- One shared `decorate()` adapter in the wrapper layer (13 copies → 1).
- Runtime derivation of `DefaultNodes.ts`, `inkling-default-nodes.ts`
  (`DEFAULT_NODES`), `default-html-nodes.ts` (via `DEFAULT_NODES`),
  `round-trip.ts` (`MARKDOWN_NODES` + `CARD_TRANSFORMERS`), `EmailNodes.ts`,
  `EmailEditorNodes.ts`.
- Collapsing Audio, Button, Callout, CodeBlock, File, Gallery, HorizontalRule,
  Html, Image, Video to declarations; scoping `ensureLexicalNodeOwnMethods`
  to the surviving wrappers.
- A node-set diff test pinning every derived array to its pre-refactor literal.

**Out of scope**:

- Plugin mounting (`AllDefaultPlugins.tsx:35-47`, `EmailEditor.tsx`) and the
  `src/index.ts` barrel — decided manual; the public seam deserves explicitness.
- Bookmark, Header, Toggle node classes — hand-written wrappers survive
  (metadata remap; 2 nested editors + layout→width; 2 editors with distinct
  node sets). They still adopt spec'd pieces where the spec fully covers them.
- MarkdownNode (base-only, not a card) — stays manual in `round-trip.ts` and
  pinned in place in the derived `DEFAULT_NODES`.
- AsideNode and the Extended/TK/AtLink/ZWNJ non-card nodes — stay manual.
- Base renderers/parsers (`base/nodes/<card>/*-renderer.ts`, `*-parser.ts`)
  and the `exportDOM`/`nodeRenderers` path.
- Changing any rendered output, serialized format, or e2e expectation.

## Commands you will need

| Purpose                  | Command                                                          | Expected on success                          |
| ------------------------ | ---------------------------------------------------------------- | -------------------------------------------- |
| Node-set diff guard      | `pnpm vitest run test/unit/nodes/derived-node-sets.test.ts`      | derived arrays identical to captured literals |
| Markdown round-trip      | `pnpm vitest run test/markdown`                                  | all pass                                     |
| Base-node unit (example) | `pnpm vitest run test/nodes-base/nodes/button.test.ts`           | all pass                                     |
| Targeted card e2e        | `pnpm test:e2e:quiet test/e2e/cards/image-card.test.ts`          | green without expectation edits              |
| Full card e2e            | `pnpm test:e2e:quiet test/e2e/cards`                             | green without expectation edits              |
| Full gates               | `pnpm typecheck && pnpm lint && pnpm test:unit`                  | all pass                                     |
| Format                   | `pnpm format && pnpm format:check`                               | exits 0                                      |
| Packaging smoke          | `pnpm build && pnpm verify:package`                              | pass (surfaces module-cycle breakage)        |

## Git workflow

- Branch: `advisor/039-one-declaration-per-card`
- Commit 1: `refactor(nodes): add card declarations and derive node-set registries`
- Commit 2: `refactor(markdown): derive markdown nodes and card transformers from declarations`
- Commit 3: `refactor(nodes): absorb nested editors into the card spec`
- Commit 4: `refactor(nodes): absorb card menu, transient props, and one decorate adapter`
- Commit 5: `refactor(nodes): collapse spec-able cards to their declarations`
- Do not push or open a PR unless instructed.

## Steps

### Step 1 (Batch 1): Declaration module shape + node-set derivation

- First capture the pre-refactor arrays as `getType()` string sequences in a
  new test `test/unit/nodes/derived-node-sets.test.ts` (illustrative name):
  `DefaultNodes.ts:33-63`, `inkling-default-nodes.ts:103-129`,
  `default-html-nodes.ts:18-28`, `EmailNodes.ts:14-25`,
  `EmailEditorNodes.ts:25-47`, `round-trip.ts:48-67` and `:69-81`
  (transformers by `card` name). This test is the batch gate from here on.
- Create `src/nodes/cards/<card>.declaration.ts` ×13 and
  `src/nodes/cards/index.ts` (illustrative location/names). Each declaration
  initially holds: `nodeType`, the base class (deep import, e.g.
  `@/nodes/base/nodes/image/ImageNode`), the wrapper class, and surface
  eligibility flags matching today's arrays (default / emailEditor /
  emailRenderer — the flags reproduce `EmailEditorNodes.ts:41-47` and
  `EmailNodes.ts:24` exactly).
- Add derivation helpers (e.g. `src/nodes/cards/derive-card-nodes.ts`,
  illustrative) in the same reflection idiom as `getEditorCardNodes.ts:8-22`.
- Rewrite the card portion of `DefaultNodes.ts`, `EmailNodes.ts`,
  `EmailEditorNodes.ts`, and `inkling-default-nodes.ts` (`DEFAULT_NODES`) as
  derived views. `default-html-nodes.ts` spreads `DEFAULT_NODES` and derives
  for free — leave it. Pin MarkdownNode at its current position
  (`inkling-default-nodes.ts:112`).
- Break the barrel cycle before it bites: migrate the six component-side
  `GeneratedDecoratorNodeBase` barrel imports to deep imports from
  `@/nodes/base/generate-decorator-node`, and keep declaration → base imports
  on deep paths only.
- Keep `markdown/*` manual this batch. Gates: diff test, `pnpm typecheck`,
  `pnpm lint`, `pnpm test:unit`, plus one e2e smoke
  (`pnpm test:e2e:quiet test/e2e/cards/image-card.test.ts`).

### Step 2 (Batch 2): Markdown eligibility + transformers derive

- Move each `*_CARD_TRANSFORMER` definition from `markdown/card-transformers.ts`
  into its card declaration (eligibility flag + transformer in one place).
  CodeBlock is markdown-eligible with no card transformer (its code fence is
  handled by `DEFAULT_TRANSFORMERS`) — the flag shape must express that.
  Header is not markdown-eligible.
- Rewrite `round-trip.ts:48-81` so `MARKDOWN_NODES` and `CARD_TRANSFORMERS`
  derive from declarations, preserving today's exact order (transformer order
  affects matching). MarkdownNode + `MARKDOWN_CARD_TRANSFORMER` stay manual.
- Keep `markdown/card-transformers.ts` re-exporting during transition.
- Gates: diff test extended to the markdown arrays, `pnpm vitest run test/markdown`,
  full unit, typecheck, lint.

### Step 3 (Batch 3): Spec absorbs nestedEditors + the cleanBasicHtml matrix

- Grow `generateDecoratorNode` (`src/nodes/base/generate-decorator-node.ts`)
  with a `nestedEditors` spec entry (illustrative shape: per-editor
  `{ name, datasetKey, initialStateKey, serializedKey, nodes, cleanBasicHtml flags, exposeInitialStateInDataset }` — executor detail) that drives
  constructor setup/populate, `getDataset` appends, and `exportJSON`
  re-serialization via `$generateHtmlFromNodes` + `cleanBasicHtml`. This is
  data-driven and React-free — the base/wrapper seam is preserved.
- Delete the trilogy overrides in all eight cards: Image, Video, Gallery,
  Bookmark, CodeBlock, Callout, Toggle, Header. Preserve the exact wrinkles:
  per-card flag matrix, Header's missing `*InitialState` dataset keys
  (`HeaderNode.tsx:84-92`), Image's transient keys in `getDataset`.
- Hand-written behaviour that is *not* the trilogy stays put: `isEmpty()`
  overrides (`ToggleNode.tsx:66-70`, `HeaderNode.tsx:133-142`), Bookmark's
  `__createdWithUrl` (`BookmarkNode.tsx:26,48`), Header's layout→width
  (`HeaderNode.tsx:94-97`), Gallery's `setImages`/`addImages`
  (`GalleryNode.tsx:106-121`).
- Gates: diff test, `pnpm test:unit`, and the eight affected e2e specs
  (`image-card`, `video-card.firefox`, `gallery-card`, `bookmark-card-*`,
  `code-block-card`, `callout-card`, `toggle-card`, `header-card`).

### Step 4 (Batch 4): cardMenu + transient props + the shared decorate adapter

- Absorb into the spec: `cardMenu` (normalized to arrays everywhere —
  `HorizontalRuleNode.tsx:11` and `HtmlNode.tsx:14` stop being bare objects),
  transient upload props with per-prop dataset exposure (Audio/Video/File/
  Image, plus CodeBlock's `_openInEditMode`), and the decorate-target:
  component + wrapper props (`width`/`wrapperStyle`/`className`/
  `IndicatorIcon`, including the per-card constants in the evidence above)
  + a node→props mapper. Card width defaults move into the spec (executor
  detail; `b60bd7c` is the regression this split caused).
- Add the one shared adapter `src/nodes/decorate-card.tsx` (illustrative
  name) that reads any spec'd card's decorate-target and renders via
  `InklingCardWrapper`. Replace all 13 `decorate()` bodies with delegation to
  it. Base nodes never import React — the adapter lives in the wrapper layer.
- Delete `getIcon()` ×13; resolve the drag icon in
  `DragDropReorderPlugin.tsx:71-74` from the first `cardMenu` entry instead
  (reproduces today's icon for Image's two-entry menu).
- Gates: diff test, full unit, `pnpm test:e2e:quiet test/e2e/cards`.

### Step 5 (Batch 5): Collapse the spec-able cards, delete the stencil

- Delete the ten wrapper files: `AudioNode.tsx`, `ButtonNode.tsx`,
  `CalloutNode.tsx`, `CodeBlockNode.tsx`, `FileNode.tsx`, `GalleryNode.tsx`,
  `HorizontalRuleNode.tsx`, `HtmlNode.tsx`, `ImageNode.tsx`, `VideoNode.tsx`.
  The registered class per card comes from the declaration via one
  wrapper-layer assembly helper whose only method is `decorate()` → the
  shared adapter.
- Make base the canonical owner of `$create*`/`$is*`; keep the old wrapper
  import paths as re-exports during transition (executor detail). Update
  importers (`markdown/card-transformers.ts:4-14` etc.) to the canonical
  paths where trivially mechanical.
- Scope the `ensureLexicalNodeOwnMethods` loops (`DefaultNodes.ts:65-67`,
  `EmailNodes.ts:27-29`, `EmailEditorNodes.ts:49-51`) to the surviving
  subclassing wrappers (Bookmark, Header, Toggle, Aside).
- Simplify the bare-object tolerance at `buildCardMenu.ts:83-89` (executor
  detail; the spec normalizes the shape).
- Update `AGENTS.md` (the wrapper-extends-base note now covers three cards)
  and `docs/markdown-card-transformers.md` if it names transformer locations.
- Gates: everything — diff test, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit`, `pnpm format && pnpm format:check`,
  `pnpm test:e2e:quiet test/e2e/cards`, `pnpm build && pnpm verify:package`.

## Test plan

| Scenario                     | Command                                             | Required invariant                              |
| ---------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Derived node sets            | `pnpm vitest run test/unit/nodes/derived-node-sets.test.ts` | identical `getType()`/transformer order to `1cad78b` |
| Markdown round-trip          | `pnpm vitest run test/markdown`                     | byte-identical markdown output                  |
| Nested-editor serialization  | `pnpm vitest run test/nodes-base test/unit`         | per-card `cleanBasicHtml` matrix unchanged      |
| Each collapsed card          | `pnpm test:e2e:quiet test/e2e/cards/<card>.test.ts` | green without expectation edits                 |
| All cards after Batch 5      | `pnpm test:e2e:quiet test/e2e/cards`                | green without expectation edits                 |
| Static gates (every batch)   | `pnpm typecheck && pnpm lint && pnpm format:check`  | all pass                                        |
| Packaging (Batch 5)          | `pnpm build && pnpm verify:package`                 | pass; no module-cycle breakage                  |

## Acceptance criteria

- Adding a new card touches exactly ONE declaration file + component + icon
  (plugin mount and `src/index.ts` barrel stay manual by decision).
- The 8 caption-trilogy copies are gone; the `cleanBasicHtml` flag matrix
  lives in the spec, once.
- `cardMenu` shape is normalized (arrays everywhere); `getIcon()` is gone.
- `decorate()` is one shared adapter; the 13 copies are gone.
- The derived node-set arrays are diffed against the pre-refactor arrays and
  are IDENTICAL (order included).
- All card e2e suites green without expectation edits.

## STOP conditions

- A spec-able card turns out to need behaviour the spec can't express — move
  it to the surviving-wrappers list and record why; do not grow the spec
  language silently.
- The nested-editor export path (`$generateHtmlFromNodes` + `cleanBasicHtml`
  flags) can't be reproduced headlessly for some card.
- A derived registry's effective node set differs from before — diff and fix
  the derivation; never edit expectations to match drift.
- The base-barrel import cycle materializes (TDZ/undefined at module eval in
  unit tests, or rollup warnings in `pnpm build`) even after deep-import
  discipline — fall back to a React-free projection for `DEFAULT_NODES` and
  record the deviation instead of fighting the cycle.
- Plan 037's deletions aren't landed — the generator would re-absorb dead
  machinery. Sequence, don't rework.

## Rollback plan

Each batch is its own commit; revert in reverse batch order
(`git revert <batch-commit>`), keeping the node-set diff test from Batch 1 —
it is the evidence that any partial state still matches the pre-refactor
registries. Batches 1–2 are pure registry refactors and revert cleanly on
their own; Batches 3–5 must be reverted as a chain if Batch 3 goes back,
since the declarations they build on assume the spec'd nested editors. No
serialized-format or output change ships in any batch, so no data migration
or consumer coordination is needed on rollback.
