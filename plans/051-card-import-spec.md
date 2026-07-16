# Plan 051: Card import spec joins the declaration

> **Executor instructions**: This plan adds a DOM-import vocabulary to the card
> declaration and derives the simple attribute-read `importDOM` parsers from it
> in the generated node machinery, mirroring how `urlType` on a property
> already derives `urlTransformMap`. The design is decided; do not redesign the
> vocabulary. Zero drift is the acceptance criterion — the html-to-lexical
> suite and the per-card tests pin current behavior, and no expectation may be
> updated to make a migration commit pass. Interface names marked
> "illustrative" may be refined by the executor; the shape (per-conversion
> entries of tag/priority/guard/reads, the read pipeline in R3, dynamic-`this`
> construction) may not. Plan 043 must land before Step 2 — it establishes the
> declaration-extension pattern this plan follows.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/nodes/base/generate-decorator-node.ts src/nodes/base/nodes src/nodes/cards test/nodes-base test/html-to-lexical CONTEXT.md`

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MEDIUM — import-path refactor; node state after paste must not drift
- **Confidence**: HIGH
- **Depends on**: 043 (establishes the declaration-extension pattern — interface field, `satisfies`, generator consumption, invariant test — that this plan follows)
- **Category**: architecture deepening
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

Plan 039 made the card declaration "the single per-card source of truth naming
everything the editor must know about a card" (CONTEXT.md: "card declaration";
the interface is `CardDeclaration` in `src/nodes/cards/card-declaration.ts:62-87`).
HTML import is the one editor surface the declaration does not name: how a
card's markup reads back into node state lives only in thirteen hand-written
parser modules under `src/nodes/base/nodes/*/`.

The per-card field list is repeated four times with no check that the copies
agree:

1. The `properties` array the generator consumes (e.g. `imageProperties` at
   `src/nodes/base/nodes/image/ImageNode.ts:10-19`).
2. The `exportJSON` destructure in base nodes that override it
   (`ImageNode.ts:31-50`, destructure at :33; also `FileNode.ts:29-42`,
   `VideoNode.ts:36-…`).
3. The hand-written parser's constructor payload
   (`src/nodes/base/nodes/image/image-parser.ts:43-44`).
4. The markdown card transformers' `getData`/`createNode` pairs
   (`src/nodes/cards/card-markdown-transformers.ts`, e.g. file at :86-97,
   button at :102-111).

Adding one field to a card touches all four, and nothing verifies the copies.
Leg 4 is a deliberately curated subset (the markdown round-trip's documented
constraint — `docs/markdown-card-transformers.md`, AGENTS.md tradeoffs) and leg
2 exists for blob-src guards; both stay. This plan fixes leg 3 — the only one
that is a pure, unprincipled re-listing of the same fields — by making the
declaration name the card's DOM-import knowledge and the generator derive the
parser, exactly as `urlTransformMap` is already derived from per-property
`urlType` annotations (`generate-decorator-node.ts:425-439`).

The deletion subtlety (recorded at planning time): deleting parser files while
pasting their imperative bodies into the base node classes just relocates code.
What makes the deletion legitimate is that the knowledge moves into declaration
vocabulary — declarative read entries the generator interprets — so the
agreement between the field list and the reads is enforced structurally (the
generator throws when a read names an unknown property) instead of by review.

## Current-state evidence

Verified fresh against commit `d998080`:

- Every one of the 13 declared cards has a parser module and a
  `static importDOM() { return parseXNode(this) }` override on its base node
  (e.g. `ImageNode.ts:52-54`). Header's parser lives at
  `src/nodes/base/nodes/header/parsers/header-parser.ts`; the other twelve are
  `src/nodes/base/nodes/<card>/<card>-parser.ts`.
- The markdown card has no `importDOM` at all (`MarkdownNode.ts`) and is not a
  declared card (`CARD_DECLARATIONS`, `src/nodes/cards/index.ts:26-40`, has 13
  entries) — nothing to classify or migrate there.
- The HTML importer registers the **base** node classes:
  `DEFAULT_HTML_NODES` spreads `DEFAULT_NODES` (`src/html/default-html-nodes.ts:18-28`),
  which maps declarations to `card.baseNode` (`src/nodes/base/inkling-default-nodes.ts:110-156`).
  Consequence: deriving `importDOM` in `assembleCardNode` (the
  `nestedEditors`/`transientProps` adoption pattern) is NOT viable — the
  importer would see spec-less base classes. The generator itself must derive
  `importDOM` on the generated base class.
- Lexical 0.46 reads `importDOM` by property lookup on the registered class
  (inherited statics are fine), calls it with `this` = the registered class,
  dedupes conversions by function reference, and tolerates a `null` return
  (`initializeConversionCache`, `node_modules/lexical/dist/Lexical.dev.mjs:~13873-13884`).
  The hand-written wrappers (`src/nodes/ToggleNode.tsx:23`,
  `src/nodes/BookmarkNode.tsx:19`, Header) and the assembled classes all
  inherit the base `importDOM`, and `parseXNode(this)` constructs the
  registered class — that is what populates nested editors on paste in the web
  editor (the generated constructor runs the nested-editor setup/populate at
  `generate-decorator-node.ts:361-372`). The derived implementation must
  preserve this dynamic-`this` construction.
- `ensureLexicalNodeOwnMethods` (`src/nodes/base/ensure-node-own-methods.ts`)
  copies `getType`/`clone`/`importJSON` only, deliberately not `importDOM` —
  Lexical reads it by lookup, so inheritance works. Do not "fix" this.
- The pins are strong and already green: `test/html-to-lexical/html-to-lexical.test.ts`
  (1211 lines; the "HTML from Lexical cards" block at :675+ round-trips image,
  gallery, bookmark, button, callout, toggle, video, audio markup) and
  `test/html-to-lexical/sources/google-docs.test.ts` (503 lines; Medium
  `graf--*` paste corpus), plus per-card `importJSON` describes in every
  `test/nodes-base/nodes/<card>.test.ts`.
- Constructor coalesce semantics differ per card and matter for drift:
  the generated constructor applies `dataset[name] ?? prop.default`
  (`generate-decorator-node.ts:355`), but CalloutNode has a hand-written
  constructor — `calloutEmoji ?? '💡'`, `backgroundColor || 'blue'`,
  `calloutText || ''` (`CalloutNode.ts:36-47`). The callout parser's
  `|| ''` on `calloutEmoji` (`callout-parser.ts:20`) therefore yields `''`,
  not the `'💡'` default — an omit-on-missing derivation would silently
  drift to `'💡'`. The vocabulary needs an explicit per-read `fallback`
  (see R3).

### Parser classification (all 13)

**Derivable (8)** — every conversion expressible as tag + priority + guard +
flat per-property reads:

| Card           | Parser                                    | Conversions and reads (evidence)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------- |
| horizontalrule | `horizontalrule/horizontalrule-parser.ts` | `hr`@0, no reads (:5-11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| toggle         | `toggle/toggle-parser.ts`                 | `div`@1 guard `inkling-toggle-card`; `heading`/`content` = text of `.inkling-toggle-heading-text`/`.inkling-toggle-content`, `?? ''` (:10-19)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| button         | `button/button-parser.ts`                 | `div`@1 guard `inkling-button-card`; `buttonUrl` = `href` attr of `.inkling-btn` (`?? ''`); `buttonText` = its text; `alignment` = class regex `/inkling-align-(left\|center)/` raw capture, omitted on no match → default `'center'` (:10-25)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| callout        | `callout/callout-parser.ts`               | `div`@1 guard `inkling-callout-card`; `calloutText`/`calloutEmoji` = trimmed innerHTML of `.inkling-callout-text`/`.inkling-callout-emoji` with `                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |     | ''`(:19-20) —`calloutEmoji`needs`fallback: ''`(constructor`?? '💡'`, `CalloutNode.ts:45`); `backgroundColor`= class regex`/inkling-callout-card-(\w+)/`raw, omitted on no match →` |     | 'blue'` (:21) |
| file           | `file/file-parser.ts`                     | `div`@1 guard `inkling-file-card`; `src` = `href` attr of `a` (`?? ''`); `fileTitle`/`fileCaption`/`fileName` = text of the three `.inkling-file-card-*` elements (`\|\| ''`); `fileSize` = text of `.inkling-file-card-filesize` piped through `sizeToBytes` (`sizeToBytes('')` → `0` = the default, `size-byte-converter.ts:2-4`, `FileNode.ts:16`) (:12-24)                                                                                                                                                                                                                                                                                                                                                                                              |
| audio          | `audio/audio-parser.ts`                   | `div`@1 guard `inkling-audio-card`; `title` = trimmed innerHTML of `.inkling-audio-title`; `src` = **property** `.src` (absolutized) of `.inkling-audio-player-container audio`; `thumbnailSrc` = property `.src` of `.inkling-audio-thumbnail`, truthy-guarded (:22-24); `duration` = trimmed innerHTML of `.inkling-audio-duration` parsed `m:ss` → seconds with `Number`+`Number.isInteger` (:27-33) (:10-36)                                                                                                                                                                                                                                                                                                                                            |
| video          | `video/video-parser.ts`                   | `figure`@1 guard `inkling-video-card`; `src` = property `.src` of `.inkling-video-container video`, **required** — `if (!videoSrc) return null` (:20-22); `loop` = property `.loop` boolean, always included (:26); `cardWidth` = fixed class→value pairs `inkling-width-full/wide` with default `'regular'` (`getCardWidth` :71-79); `duration` = parsed with `parseInt`+`Number.isFinite` — **different** from audio's, keep both verbatim (:30-38); `thumbnailSrc`/`customThumbnailSrc` = `data-inkling-thumbnail`/`data-inkling-custom-thumbnail` attrs on self, truthy-guarded (:40-46); `caption` = `readCaptionFromElement`, truthy-guarded (:48-50); `width`/`height` = properties on the video element, truthy-guarded so `0` is excluded (:52-58) |
| image          | `image/image-parser.ts`                   | two conversions — `img`@1: composite `readImageAttributesFromElement` on self providing `[src, width, height, alt, title, href]` (:6-20); `figure`@0 guard selector `img`: same composite on the `img` child + `cardWidth` from two class regexes (`/inkling-width-(wide\|full)/` raw; `/graf--layout(FillWidth\|OutsetCenter)/` mapped `FillWidth→full`, `OutsetCenter→wide`) + `caption` via `readCaptionFromElement ?? ''` (:21-51)                                                                                                                                                                                                                                                                                                                      |

**Survive hand-written (5)** — structural parsing or derived payloads the flat
vocabulary must not grow one-off kinds for; each gets a comment naming why:

| Card      | Parser                            | Why it survives (evidence)                                                                                                                                                                                                                                     |
| --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bookmark  | `bookmark/bookmark-parser.ts`     | nested `metadata` object payload with the reversed author/publisher classes quirk (:14-15); the `mixtapeEmbed` conversion mutates the DOM (`titleElement.remove()` :60, `descElement.remove()` :66) and derives publisher from the _remaining_ innerHTML (:70) |
| codeblock | `codeblock/codeblock-parser.ts`   | conversion-abort guards on child presence (`if (!code \|\| !figcaption) return null` :16-18), first-child-must-be-`CODE` guard (:44-46), language regex tried across two elements (:25-31, :48-54)                                                             |
| gallery   | `gallery/gallery-parser.ts`       | collection property (`images` array with per-image `row`/`fileName` derivation :6-13), sibling walking with node removal (:54-68), DOM mutation in the SQS branch (:102-113)                                                                                   |
| header    | `header/parsers/header-parser.ts` | derived payload — `layout` from `backgroundImageSrc` presence (:20), `buttonEnabled` from element presence (:29), conditional button reads (:30-31), two-source `backgroundColor` (:21-23), `version: 2` constant (:46)                                        |
| html      | `html/html-parser.ts`             | comment-delimited sibling walker that removes nodes as it goes (:22-39)                                                                                                                                                                                        |

**Correction to the original evidence**: the brief classified callout/toggle
as structural ("parse NESTED-EDITOR content … cannot be derived from flat
properties"). The code says otherwise: both parsers read flat
innerHTML/textContent into payload keys (`callout-parser.ts:19-21`,
`toggle-parser.ts:11-19`); nested-editor population happens afterwards in the
generated constructor (`generate-decorator-node.ts:361-372`) from the
declaration's `nestedEditors` spec. They join the derivable class. Also, the
markdown repetition cited as `card-markdown-transformers.ts:30-35` is the image
transformer's export template; the field-list repetition is the
`getData`/`createNode` pairs (e.g. :86-97) — evidence for the repetition, but
out of scope per the documented markdown constraint.

## The import-spec vocabulary (shape fixed, names illustrative)

New module `src/nodes/base/import-spec.ts` — the types and the derivation
implementation (`buildImportConversions`, illustrative), plus spec validation.
Per-card spec objects live **in the base node module next to `properties`**
(e.g. `imageImportSpec` beside `imageProperties` in `ImageNode.ts`) and are
exported; the declaration references the same object
(`importSpec: imageImportSpec` in `image.declaration.ts`). Rationale:
`properties` already live in base node modules because `generateDecoratorNode`
consumes them at class creation; co-locating the reads with the field list
maximizes locality, and the declaration↔base import direction stays
one-directional (a declaration-level const the base node imported would close
an evaluation cycle). The declaration field makes the knowledge visible at
declaration level; the invariant test (Step 5) asserts identity of the two
references.

- `CardImportSpec` = `{ conversions: readonly ImportConversionSpec[] }`.
- `ImportConversionSpec` = `{ tag: string; priority: number; guardClass?: string; guardSelector?: string; reads: readonly ImportReadSpec[] }`.
  `guardClass` reproduces the `classList.contains('inkling-<card>-card')`
  guards; `guardSelector` reproduces image's `figure`→`querySelector('img')`
  guard. The tag key already implies the tag check; the parsers' redundant
  `tagName ===` re-checks are dropped.
- `ImportReadSpec` = `{ name: <property>; kind; selector?; trim?; fallback?; parse?; omit?: 'falsy'; required? }` with kinds:
  - `attribute`: `getAttribute(name)` (button `buttonUrl`, file `src`, video dataset attrs via `data-*` names).
  - `property`: element property read (audio/video `.src`, `.loop`, `.width`) — never substitute `getAttribute`; `.src` absolutizes.
  - `text` / `html`: `textContent` / `innerHTML` of the selected element, optional `trim`.
  - `caption`: `readCaptionFromElement` (keeps its cleanBasicHtml join semantics; the util stays shared with the surviving gallery/codeblock parsers).
  - `classMap`: ordered class-regex entries with optional value maps and optional `default` (image's two patterns, video's fixed pairs + `'regular'`, button/callout raw captures).
  - `composite`: a named helper + `provides` list (image's `readImageAttributesFromElement`, which keeps its dimension-fallback and parent-anchor logic single-sourced in `src/nodes/base/utils/read-image-attributes-from-element.ts` — gallery's surviving parser keeps using it too).
- `parse?: (raw: string) => unknown` — a per-card hand-written lambda in the
  spec object (file's `sizeToBytes`, audio's and video's **separate** duration
  parses). Returning `undefined` omits the key.

Fixed semantics (drift-critical; R-references used in the steps):

- **R1**: the derived `importDOM` is installed by `generateDecoratorNode` only
  when the `importSpec` option is present; spec-less generated classes keep
  `importDOM` absent exactly as today (MarkdownNode must gain no conversions;
  Lexical tolerates either absence or a `null` return — executor detail which).
- **R2**: the derived conversion constructs `new this(payload)` where `this`
  is the class `importDOM` was invoked on (Lexical calls it with the
  registered class) — preserving `parseXNode(this)` so assembled/wrapper
  classes keep constructing themselves and nested editors keep populating.
- **R3** read pipeline per entry: locate (`selector` ? `querySelector` : self)
  → extract per kind → if null/undefined: `required` aborts the conversion
  (return `null`); else `fallback` if declared, else omit the key → `trim` →
  `parse` (`undefined` result omits) → `omit: 'falsy'` drops falsy results →
  include `payload[name] = value`.
- **R4**: omitted keys coalesce through the constructor
  (`?? prop.default` at `generate-decorator-node.ts:355`, or the hand-written
  coalesces like `CalloutNode.ts:44-46`) — verify per property that the
  current parser's fallback idiom and the default agree (the classification
  table records the verification for all 8; `calloutEmoji` is the one case
  requiring `fallback: ''`).
- **R5**: `validateImportSpec` throws at class-creation time when a read names
  a property absent from `properties` (the agreement check that doesn't exist
  today), and the generated class exposes the spec as a static (illustrative:
  `static importSpec`) so the Step-5 invariant test can assert
  `declaration.importSpec === baseNode.importSpec`.

## Scope

**In scope**:

- The `import-spec` vocabulary module, generator derivation, and the
  `CardDeclaration.importSpec` field.
- Migrating the 8 derivable cards; deleting their 8 parser files.
- Why-comments on the 5 surviving parsers; the classification invariant test;
  a CONTEXT.md "Import spec" entry.

**Out of scope**:

- The 5 structural parsers' internals (no cleanup, no dedup between them).
- The markdown card transformers' field lists (documented constrained
  round-trip) and the `exportJSON` destructures (blob guards).
- `readImageAttributesFromElement` / `readCaptionFromElement` internals.
- The web editor's paste pipeline beyond what importDOM derivation changes
  (nothing should change).
- AGENTS.md — the declaration paragraph there remains accurate.

## Commands you will need

| Purpose                    | Command                                                | Expected on success                              |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Import characterization    | `pnpm vitest run test/html-to-lexical`                 | 2 files green before any migration               |
| Per-card pin               | `pnpm vitest run test/nodes-base/nodes/<card>.test.ts` | green, expectations untouched                    |
| nodes-base + html-renderer | `pnpm vitest run test/nodes-base test/html-renderer`   | 730 passed + 21 todo (baseline at `d998080`)     |
| Static + full gates        | `pnpm typecheck && pnpm lint && pnpm test:unit`        | 1707 passed + 21 todo (baseline at `d998080`)    |
| Format                     | `pnpm format && pnpm format:check`                     | exits 0                                          |
| Paste insurance (optional) | `pnpm test:e2e:quiet test/e2e/paste-behaviour.test.ts` | green; importDOM powers paste in the real editor |

## Git workflow

Per the 2026-07-16 grilling decisions: work commits **directly on `main`** —
no branch, no push, no PR (this overrides the `advisor/NNN-<slug>` convention
in `plans/README.md`). Conventional commit messages:

- Commit 1 (only if Step 1 finds coverage gaps): `test(html-import): pin per-card importDOM characterization gaps`
- Commit 2: `refactor(cards): derive importDOM from declaration import specs (horizontalrule, toggle, button)`
- Commit 3: `refactor(cards): derive callout, file, audio, video import parsers from specs`
- Commit 4: `refactor(cards): derive image import parser from its spec`
- Commit 5: `test(cards): pin import-spec classification and record why structural parsers survive`

## Steps

### Step 1: Drift check, baseline, coverage audit

- Run the drift check in the header; if the tree has moved, re-verify this
  plan's line references against the new HEAD before proceeding.
- Run `pnpm vitest run test/html-to-lexical` and
  `pnpm vitest run test/nodes-base test/html-renderer`; record the baselines
  (1707 + 21 todo full-unit; 730 + 21 todo nodes-base+html-renderer at `d998080`).
- Audit that every conversion of the 8 derivable cards has at least one
  characterization case: bare-`<img>` image paste, image `figure` width classes
  (both `inkling-width-*` and `graf--layout*`), video duration/dataset
  attributes/`required` abort (a `figure.inkling-video-card` with no `video`
  element must produce no card), audio duration (the corpus's `152.607347`
  duration exercises the non-integer path), toggle/callout/file/button/hr
  pastes. Add pinned-to-current-behavior cases **only** where a gap exists;
  they belong to commit 1 and must pass against unmodified code.

### Step 2: Vocabulary + generator derivation + declaration field; migrate horizontalrule, toggle, button

- Create `src/nodes/base/import-spec.ts` per the vocabulary section (R1–R5).
- `src/nodes/base/generate-decorator-node.ts`: add the `importSpec` option;
  validate it (R5); install the derived `importDOM` with dynamic-`this`
  construction (R1, R2); expose the spec static (R5).
- `src/nodes/cards/card-declaration.ts`: add `importSpec?: CardImportSpec`
  with a doc comment in the style of the existing field docs — the declaration
  names the card's DOM-import knowledge; the spec object is defined beside
  `properties` in the base node module and the generator derives `importDOM`
  from it; cards with structural parsing leave it unset.
- Migrate horizontalrule (`HorizontalRuleNode.ts:5-11` — no properties array;
  the spec is one conversion with empty reads), toggle, button per the
  classification table. Their declaration files gain the `importSpec`
  reference. Delete `horizontalrule-parser.ts`, `toggle-parser.ts`,
  `button-parser.ts` and the base nodes' parse imports + `importDOM` overrides.
- Add derivation unit tests (illustrative: `test/nodes-base/import-spec.test.ts`,
  beside `generate-decorator-node.test.ts`): guard matching, the R3 pipeline
  (fallback vs omit vs `omit: 'falsy'` vs `required`), dynamic-`this`
  construction (a subclass invoking the derived `importDOM` constructs the
  subclass), the unknown-property throw.
- Run the import characterization and per-card tests; zero expectation changes.

### Step 3: Migrate callout, file, audio, video

- callout: `calloutEmoji` gets `fallback: ''` (R4 — `CalloutNode.ts:45` `?? '💡'`);
  `backgroundColor` omits on no class match (constructor `|| 'blue'`).
- file: `fileSize` = text read + `fallback: ''` + `parse: sizeToBytes`
  (reproduces `sizeToBytes(text || '')` including the `→ 0` default case).
- audio: property `.src` reads (absolutized URLs — R3 kinds are not
  interchangeable); `thumbnailSrc` and `duration` truthy/undefined-omitted;
  keep the `Number`/`isInteger` duration parse lambda verbatim.
- video: `src` read is `required` (`video-parser.ts:20-22`); `loop` included
  verbatim; `cardWidth` classMap with `default: 'regular'`; dataset-attribute
  reads for the two thumbnails; `width`/`height`/`caption` `omit: 'falsy'`;
  keep the `parseInt`/`isFinite` duration parse lambda verbatim — do not unify
  it with audio's.
- Delete the 4 parser files. Run the gates per commit scope; zero drift.

### Step 4: Migrate image

- Two conversions (`img`@1, `figure`@0 with `guardSelector: 'img'`), the
  composite read kind carrying `readImageAttributesFromElement` with
  `provides: [src, width, height, alt, title, href]`, the dual-pattern
  `cardWidth` classMap (`inkling-width-*` raw; `graf--layout*` with the
  `FillWidth→full`/`OutsetCenter→wide` map), and the caption read. Note the
  `figure` priority comment (`image-parser.ts:47` — must run after gallery's)
  is preserved by keeping `priority: 0`.
- Delete `image-parser.ts`. `readImageAttributesFromElement` stays in
  `src/nodes/base/utils/` (shared with gallery's surviving parser).
- Run the full import + nodes-base slices; zero drift.

### Step 5: Survivors' why-comments, invariant test, CONTEXT.md, full gates

- One comment per surviving parser (file header or the base node's `importDOM`
  override) naming why it survives — one line each from the classification
  table's reason column (bookmark: nested metadata + DOM-mutating mixtape
  conversion; codeblock: conversion-abort and first-child guards; gallery:
  collection property + sibling walking + DOM mutation; header: derived
  payload; html: comment-delimited sibling walker).
- Add the invariant test (illustrative:
  `test/nodes-base/import-spec-classification.test.ts`, following the
  source-reading guard precedent `render-policy-imports.test.ts`): every
  `CARD_DECLARATIONS` entry either has an `importSpec` or appears in the
  recorded structural set `{bookmark, codeblock, gallery, header, html}`;
  `declaration.importSpec === declaration.baseNode`'s spec static for every
  spec'd card; every read in every spec names a key of
  `baseNode.getPropertyDefaults()`.
- Add a CONTEXT.md "Import spec" entry under Language: the card declaration's
  DOM-import knowledge — declarative conversion entries (tag, priority, guard,
  per-property reads) defined beside the card's `properties` in its base node
  module, from which the generated node machinery derives `importDOM`. Cards
  whose parsing is structural keep hand-written parsers. _Avoid_: import
  parser, DOM conversion config.
- Run: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit`, plus `pnpm vitest run test/nodes-base test/html-renderer`
  and `pnpm vitest run test/html-to-lexical`. Optional insurance:
  `pnpm test:e2e:quiet test/e2e/paste-behaviour.test.ts` (paste exercises
  `importDOM` in the real editor; not a required gate).

## Test plan

| Scenario                       | Command                                                              | Required invariant                                  |
| ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------- |
| Characterization baseline      | `pnpm vitest run test/html-to-lexical`                               | green before any migration; gaps pinned in commit 1 |
| Per-card migration (each card) | `pnpm vitest run test/nodes-base/nodes/<card>.test.ts`               | byte-identical expectations                         |
| Derivation semantics           | `pnpm vitest run test/nodes-base/import-spec.test.ts`                | R1–R5 pinned, incl. dynamic-`this` and the throw    |
| Classification invariant       | `pnpm vitest run test/nodes-base/import-spec-classification.test.ts` | derivable set and spec identity pinned              |
| nodes-base + html-renderer     | `pnpm vitest run test/nodes-base test/html-renderer`                 | 730 passed + 21 todo                                |
| Full gates                     | `pnpm typecheck && pnpm lint && pnpm test:unit`                      | 1707 passed + 21 todo                               |

## Acceptance criteria

- Node state after HTML import is identical for every card: no test
  expectation changed anywhere except commit 1's additive characterization.
- Eight parser files deleted; the eight cards' `importDOM` is derived from
  their import specs; the five surviving parsers carry why-comments.
- Every card declaration names its DOM-import knowledge (`importSpec`) or is
  pinned in the structural set by the invariant test; spec objects are
  identical between declaration and base node class.
- The generator throws at class-creation time when an import-spec read names
  an unknown property — the agreement check that replaces review-by-eye.
- Nested-editor population on paste is preserved (dynamic-`this` construction;
  pinned by a derivation unit test and the existing html-to-lexical corpus).
- CONTEXT.md gained the "Import spec" entry. Gates green.

## STOP conditions

- **Any** expectation drift in any migration commit. Revert that one commit,
  keep characterization tests, and re-examine the read pipeline against the
  current parser idiom (fallback vs omit vs `omit: 'falsy'`, property vs
  attribute reads, per-card constructor coalesce). Never update expectations
  to make a migration pass.
- A "derivable" card's parser needs semantics the vocabulary can't express
  without a one-off kind. Move that card to the surviving set with a
  why-comment and record the reason — shrinking the derivable set is
  acceptable; vocabulary sprawl is not.
- A base-node constructor override coalesces on key _presence_ rather than
  value (beyond the catalogued `CalloutNode.ts:36-47` falsy/nullish cases).
  The vocabulary has no presence semantics — stop and report rather than
  improvise one.
- The dynamic-`this` requirement (R2) can't be met within the generator's
  typing — e.g. the implementation ends up closing over the generated class,
  which would silently construct base-class (spec-less) nodes on paste in the
  web editor and drop nested-editor population. Stop; do not ship the closure.
- Plan 043 has not landed. Wait for it — do not invent a competing
  declaration-extension pattern for the `CardDeclaration.importSpec` field.

## Rollback plan

Each migration step is its own commit; revert the offending commit alone
(`git revert <sha>`). The deleted parser files restore cleanly from git, and
Step 1's characterization tests remain valid against un-migrated code. If the
vocabulary itself (Step 2) proves unsound, revert to `main` before commit 2 —
the surviving parsers and the deleted-file restorations return the tree to the
pre-plan state, and the classification table in this plan remains the evidence
for the next attempt.

## Execution notes

Plan 051 landed in five commits on main (`5be7279..78a3b6f`) plus a
post-review cleanup (`57c5fc4`). Step 1 (`5be7279`) added the one
characterization pin (video figure without a `video` element → no card).
Steps 2–4 (`1ffc23e`, `e9f7ce7`, `b46ff8b`) introduced
`src/nodes/base/import-spec.ts` (`CardImportSpec`, `buildImportConversions`
with dynamic-`this` construction, `validateImportSpec` at class-creation)
and derived the eight derivable parsers (hr, toggle, button, callout,
file, audio, video, image); the five structural survivors (bookmark,
codeblock, gallery, header, html) keep hand-written parsers with
why-comments. Step 5 (`78a3b6f`) pinned the classification (derivable /
structural sets, declaration↔baseNode spec identity, read↔property
agreement) and added the CONTEXT.md "Import spec" entry.

Note on the classification: the orchestration brief given to the
implementer still described callout/toggle as structural, but the plan's
own "Correction to the original evidence" section re-classifies them as
derivable (their parsers read flat innerHTML/textContent; nested-editor
population happens in the generated constructor from `nestedEditors`).
The implementation follows the plan — callout WAS derived; the spec
review confirmed the brief was stale, not the code.

R3 refinements, all adjudicated in review as justified readings of the
verbatim parser evidence (plan text imprecise, code right): `required`
aborts on any falsy (video's `if (!videoSrc)`; only video's src uses
`required`); `omit: 'falsy'` applies pre- AND post-parse (audio's
`Number('') === 0` trap — an unguarded empty duration would have yielded
`duration: 0`); classMap reuses `fallback` as the no-match default;
duration parse lambdas stay deliberately separate with don't-unify
comments. The one REAL divergence review caught — video's cardWidth `\b`
regexes were a strict superset of the deleted `classList.contains` token
semantics (`foo-inkling-width-full` would have imported as `full`) — is
fixed in `57c5fc4` with token-anchored patterns.

Reviews: spec and quality both APPROVED. Post-review fixes in `57c5fc4`:
the token anchoring above; `validateImportSpec` now names the card
(`nodeType`) in its throw; the composite-`name` doc exception recorded;
`importDOM()` derives from `this.importSpec` (the `nestedEditors`
adoption idiom — behavior-identical today, but exposure and derivation
can no longer disagree if a subclass redeclares the static). Recorded,
not fixed (both reviewers: non-blocking): `validateImportSpec` doesn't
check kind-required fields (a composite without `read` throws a raw
TypeError at import time instead of a validation error — hardening for
future spec authors); duplicate-tag conversions within one spec silently
overwrite (parity with the old object literals); the classMap
fall-through-on-unmapped-capture is unexercised defensive generality.

Gates at HEAD: full unit 224 files / 1953 passed / 21 todo;
nodes-base+html-renderer 48 files / 754 passed / 21 todo; html-to-lexical
2 files / 41 passed; paste e2e 28 passed; `verify:package` PASS (64
exports — the eight `*ImportSpec` consts ride `@/nodes/base`, which the
barrel doesn't re-export); `verify:types` PASS; typecheck/lint/format
clean. Zero expectation edits across the range.
