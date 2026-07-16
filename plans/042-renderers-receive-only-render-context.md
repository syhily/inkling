# Plan 042: Renderers receive only the render context

> **Executor instructions**: This plan finishes the fold plan 040 started —
> the options bag disappears from the internal render path and every card
> renderer, element transformer, and render-path helper receives ONLY the
> read-only render context. The design is decided; do not redesign the seam.
> The fold is internal: the public entry points (`exportDOM(editor, options)`,
> `$convertToHtmlString(editor, options)`, `LexicalHTMLRenderer.render`) keep
> accepting the public `ExportDOMOptions` and build the context from it.
> Outputs must stay byte-identical; the standing red line applies — never
> update test expectations to mask drift. Plan 041 must land first.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/nodes/base/render-context.ts src/nodes/base/export-dom.ts src/nodes/base/generate-decorator-node.ts src/nodes/base/utils/visibility.ts src/nodes/base/utils/srcset-attribute.ts src/nodes/base/nodes src/html/renderer test/nodes-base test/html-renderer CONTEXT.md`
> Baselines at HEAD `d998080` (recorded by plan 040's execution notes):
> `pnpm test:unit` = 206 files / 1707 passed / 21 todo;
> `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730
> passed / 21 todo. This plan ADDS seam tests (itemized in Step 2); every
> pre-existing expectation stays unchanged.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM-LOW — mechanical signature fold with a strong type
  backstop; the sharp edges are two pinned error throws and the markdown
  options narrowing, each covered below
- **Confidence**: HIGH
- **Depends on**: 041 (batch execution order per the 2026-07-16 grilling
  session). Re-run the drift check above before starting; if 041 touched the
  same files, re-base the enumerated line references before cutting commits.
- **Category**: architecture deepening
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

Plan 040 put every render-policy READ behind the render-context seam
(`src/nodes/base/render-context.ts`), but its own execution notes record the
unfinished end-state: "Renderers still receive the raw options bag alongside
the context, so 'the context is the only thing renderers receive' remains
the unfinished end-state and the next fold."

That leftover is not cosmetic. Today every card renderer is invoked as
`defaultRenderFn(node, options, context)` (generate-decorator-node.ts:~565),
so the module has two parallel read views of the same export-time state: the
frozen, typed context and the open, mutable-by-contract options bag. As long
as both reach the renderer, the seam is advisory — the next renderer edit
can read `options.target` or re-roll a URL ternary and nothing but code
review stops it. The shallowness shows in the holdovers: `RendererOptions`
survives as an empty interface with an apologetic comment
(`src/html/renderer/types.ts:~3-6`), `visibility.ts` declares an
options-shaped `{ target?: string }` param that callers feed the frozen
context into (html-renderer.ts:~44), and five renderer-local options
interfaces duplicate slices of the bag.

The fold is also where the context gets its last leverage: the image and
markdown cards still read DATA options (`imageOptimization`,
`canTransformImage`, `canTransformImageToFormat`, `inklingVersion`,
`postUrl`) straight off the bag because the context does not carry them yet.
Moving those fields onto the context gives the codebase one typed,
read-only interface for everything a renderer may know about a render pass —
and deleting the bag from the internal path makes "renderers cannot reach
policy or data except through the seam" structural, not conventional.

## Current-state evidence

Verified fresh against commit `d998080`:

- The dual-argument dispatch: `RenderFn` is
  `(node, options: ExportDOMOptions, context: RenderContext)`
  (generate-decorator-node.ts:~25-27, with a comment at :~20-24 describing
  the bag as legacy); `exportDOM` builds the context and calls
  `defaultRenderFn(this, options, context)` (generate-decorator-node.ts:~557-566).
- Every one of the 14 card renderers declares `(node, options = {}, context)`.
  Nine never read `options` at all — audio-renderer.ts:~16,
  bookmark-renderer.ts:~26, button-renderer.ts:~15, callout-renderer.ts:~12,
  codeblock-renderer.ts:~12, horizontalrule-renderer.ts:~41,
  html-renderer.ts:~17, toggle-renderer.ts:~68, video-renderer.ts:~30 —
  pure signature fold.
- The remaining options READS inside renderers (the stragglers Step 3
  migrates):
  - `image-renderer.ts`: `options.imageOptimization` (:~77, :~184),
    `options.canTransformImage` (:~76, :~125, :~185),
    `options.canTransformImageToFormat` (:~126, :~134); forwards `options`
    to the srcset helpers (:~102, :~138-144).
  - `gallery-renderer.ts`: `options.imageOptimization` (:~121, :~158),
    `options.canTransformImage` (:~120, :~159); forwards `options` to
    `setSrcsetAttribute` (:~136).
  - `file-renderer.ts`: `options.postUrl` (:~48), reached through the
    internal `emailTemplate(node, document, options, context)` (:~40).
  - `header-renderer.ts`: `options` is read in exactly one place — forwarded
    to `getSrcsetAttribute` as `options as ImageRenderOptions` (:~98) — via
    `cardTemplate(nodeData, context, options)` (:~61) and
    `renderHeaderNodeV2(dataset, options, context)` (:~346-350, call at :~385).
  - `markdown-renderer.ts`: the pinned truthy-non-function `createDocument`
    TypeError (:~21-23, pinned with an exact message at
    test/nodes-base/nodes/markdown.test.ts:~176-185) and the whole bag passed
    to markdown-it as `render(node.markdown || '', options as Record<string,
unknown>)` (:~27). Downstream, `src/markdown/markdown-html-renderer.ts`
    reads exactly one key off that bag: `inklingVersion`
    (`RenderOptions`/:~25-29, `selectRenderer`/:~75-76) — narrowing the pass
    to `{ inklingVersion }` is byte-identical.
  - `srcset-attribute.ts`: `options.imageOptimization` (:~30-33, :~48),
    `options.canTransformImage` (:~44), plus the legacy no-context fallback
    `isLocalContentImage(url, options.siteUrl, options.imageBaseUrl)`
    (:~41-42) for direct callers, pinned by
    test/nodes-base/utils/srcset-attribute.test.ts.
- The string layer: `ElementTransformer.export(node, options, exportChildren,
context)` and `ExportChildren = (node, options?) => string`
  (transformers/index.ts:~14-22). `options` is dead weight in every
  transformer: aside.ts:~10, blockquote.ts:~12, heading.ts:~14 declare and
  ignore it; paragraph.ts:~11 the same; list.ts:~11-13 forwards it through
  the `exportList` recursion (:~42) and `exportChildren(child, options)`
  (:~52).
- `TextContent` keeps `options` for exactly one thing: the `dom` document
  source — the `ensureDomProperty` guard (:~33-35, throwing
  `'TextContent requires a dom property in the options argument'`), the
  stored field (:~42, :~47-53), and `this.options.dom.window.document` in
  `render()` (:~63). No test pins the guard's message (grep-verified); the
  only in-repo caller path (`LexicalHTMLRenderer.render` →
  `$convertToHtmlString`) always resolves a `dom`
  (LexicalHTMLRenderer.ts:~38-41), so the throw is unreachable in-repo.
- `renderWithVisibility(originalRenderOutput, visibility, options: { target?:
string })` (visibility.ts:~129-133) reads `options.target` (:~152). Its
  only renderer caller passes the context (html-renderer.ts:~44); it is
  publicly re-exported as `utils.visibility.renderWithVisibility`
  (inkling-default-nodes.ts:~56,~70); its tests call it with plain
  `{ target }` / `{ target: 'web' }` / `{ target: 'email' }` objects
  (test/nodes-base/utils/visibility.test.ts:~276,~378,~392,~406,~428).
- The context does NOT yet carry: `imageOptimization`,
  `canTransformImage`, `canTransformImageToFormat` (all declared on
  `ExportDOMOptionsBase`, export-dom.ts:~33-35) and `inklingVersion` (NOT
  declared on the base — it rides the public index signature,
  export-dom.ts:~48). The context already carries `postUrl`
  (render-context.ts:~125), `siteUrl`, `imageBaseUrl`, `createDocument`,
  and the `isLocalContentImage` folding.
- The empty/holdover interfaces to delete: `RendererOptions extends
ExportDOMOptions {}` (types.ts:~6), `MarkdownRenderOptions`
  (markdown-renderer.ts:~11), `HeaderV2RenderOptions` (header-renderer.ts:~50),
  and the three non-empty bag-slices the context absorbs: `ImageRenderOptions`
  (image-renderer.ts:~31-37), `GalleryRenderOptions` (gallery-renderer.ts:~25-31),
  `ImageRenderOptions` (srcset-attribute.ts:~9-14).
- Public-surface check: `RenderFn`, `RenderContext`, `createRenderContext`,
  `RendererOptions`, and `LexicalHTMLRenderer` do not appear in
  `dist/editor.d.ts` (grep-verified); `ExportDOMOptionsBase` /
  `ExportDOMOptions` do (:~3315-3329, reached through the generated nodes'
  `exportDOM(editor, options?)` at :~3394). So the fold itself is invisible
  to the packed type surface — except the one deliberate addition in Step 2.
- Tests that will need edits (the complete itemization; everything else goes
  through the public entry points and stays untouched):
  1. `test/nodes-base/utils/srcset-attribute.test.ts` — five
     `getSrcsetAttribute({ src, width, options, ... })` call sites (:~15,
     :~25, :~38, :~49, :~59) construct options bags directly.
  2. `test/nodes-base/utils/render-context.test.ts:~249-272` — the
     "exportDOM dispatch threading" test declares
     `defaultRenderFn: (_node, _options, context) => ...` and asserts the
     context arrives "as the third render-fn argument".
     There are NO direct renderer unit tests — every card test invokes the
     public `node.exportDOM(editor, options)` (grep-verified across
     test/nodes-base/nodes). The brief's expectation of "direct renderer unit
     tests that construct options bags" reduces to the two files above.
- Comment/doc debt that must move with the fold: render-context.ts module
  header ("alongside the legacy options bag", :~13), generate-decorator-node.ts
  comments (:~20-24, :~562-564), convert-to-html-string.ts comment (:~18-28),
  html-renderer.ts comment (:~42-43), and the CONTEXT.md "Render context"
  entry ("receives alongside the export options", CONTEXT.md:~27-29).

## Scope

**In scope**:

- Extending `RenderContext`/`createRenderContext` with the four missing data
  fields (`imageOptimization`, `canTransformImage`,
  `canTransformImageToFormat`, `inklingVersion`) and moving the pinned
  markdown `createDocument` TypeError into the factory.
- Migrating every remaining options read inside renderers and the srcset
  helper onto the context (byte-identical).
- The signature fold: renderers, element transformers, `ExportChildren`,
  `TextContent`, and `renderWithVisibility` receive only the context (plus
  their own data arguments); `RenderFn` becomes `(node, context)`;
  `RendererOptions`, `src/html/renderer/types.ts`, and the five
  renderer-local options interfaces are deleted.
- The comment/CONTEXT.md sweep naming the new end-state.

**Out of scope**:

- The public entry points: `exportDOM(editor, options)` on generated and
  hand-written nodes (generate-decorator-node.ts:~557,
  InklingDecoratorNode.ts:~20), `$convertToHtmlString(editor, options)`
  (convert-to-html-string.ts:~14), and `LexicalHTMLRenderer.render(...)`
  keep accepting `ExportDOMOptions`. The fold is internal; hosts pass options.
- Any renderer output change whatsoever.
- The `renderEmailButton(emailButtonOptions, context?)` helper — its first
  argument is button DATA (`EmailButtonOptions`), not the export options bag;
  its optional-context fallback for non-render callers is plan-040-recorded
  and stays.
- The `escape-html` import allowlist shrink and markdown's `sanitize-html`
  exception (plan 040's accepted leftovers; a separate follow-up).
- The double context construction (one per `$convertToHtmlString` run, one
  per card `exportDOM`) — pre-existing, output-neutral, not this plan.

## Commands you will need

| Purpose                       | Command                                                | Expected on success                       |
| ----------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Drift check                   | `git diff --stat d998080..HEAD -- <paths above>`       | empty, or re-base line refs first         |
| Characterization baseline     | `pnpm vitest run test/nodes-base test/html-renderer`   | 46 files / 730 passed / 21 todo           |
| Single card group             | `pnpm vitest run test/nodes-base/nodes/<card>.test.ts` | green, byte-identical expectations        |
| Seam + helper tests           | `pnpm vitest run test/nodes-base/utils`                | green; Step-2 additions green             |
| String layer                  | `pnpm vitest run test/html-renderer`                   | green                                     |
| Static + full gates           | `pnpm typecheck && pnpm lint && pnpm test:unit`        | all pass (unit builds via `pretest:unit`) |
| Packed surface (Step 2 + end) | `pnpm verify:package && pnpm verify:types`             | pass with the `inklingVersion` addition   |
| Format                        | `pnpm format && pnpm format:check`                     | exits 0                                   |

## Git workflow

- Work commits DIRECTLY on `main` — no branch, no push, no PR (2026-07-16
  grilling decision; this overrides the `advisor/NNN-<slug>` convention in
  `plans/README.md`).
- Commit 1: `refactor(renderers): carry image and markdown options on the render context`
- Commit 2: `refactor(renderers): read remaining renderer options through the context`
- Commit 3: `refactor(renderers): pass only the render context to renderers and transformers`

## Steps

### Step 1: Drift check, baseline, re-verify the enumeration

- Run the drift check from the header. If non-empty, re-read the touched
  files and re-base every `:~NN` reference in this plan before proceeding;
  if the shape of the problem changed (new options reads, moved modules),
  STOP and report rather than re-planning mid-flight.
- Run `pnpm vitest run test/nodes-base test/html-renderer`; record the green
  baseline (expected 46 files / 730 passed / 21 todo).
- Re-run the enumeration greps and confirm they match the evidence section:
  `options\.` under `src/nodes/base/nodes` (expect hits only in image,
  gallery, file, markdown), `\boptions\b` under `src/nodes/base/nodes`
  (expect the nine signature-only renderers plus header's two functions),
  and `RendererOptions` repo-wide (expect exactly the nine src/html/renderer
  importers plus types.ts itself). Any NEW straggler joins the Step-3 list;
  any MISSING one shrinks the commits accordingly.

### Step 2: Carry the image and markdown data options on the context (commit 1)

Purely additive; no renderer changes; output unchanged by construction.

- `src/nodes/base/render-context.ts`:
  - Add readonly fields to `RenderContext`:
    - `imageOptimization` — a frozen shallow snapshot (mirroring the
      `feature`/`design` handling at render-context.ts:~220-221), typed for
      the three consumed keys (`defaultMaxWidth?: number`,
      `contentImageSizes?: Record<string, { width: number }>`,
      `srcsets?: boolean`; exact interface name/shape illustrative — it
      single-sources the three renderer-local declarations). The factory
      casts from the bag's `Record<string, unknown>` (export-dom.ts:~35);
      the cast lives inside the seam's implementation, not in renderers.
    - `canTransformImage: ((src: string) => boolean) | undefined` and
      `canTransformImageToFormat: ((format: string) => boolean) | undefined`
      — copied verbatim, like `postUrl`.
    - `inklingVersion: string | undefined` — the markdown card's slug-policy
      input (markdown-html-renderer.ts:~25-29).
  - Move the pinned createDocument validation into `resolveCreateDocument`
    (render-context.ts:~186-207): a truthy non-function
    `options.createDocument` throws
    `TypeError('renderMarkdownNode requires options.createDocument to be a function')`
    — byte-identical message (pinned at markdown.test.ts:~181-183), with a
    comment recording that the message names the historical caller. Record
    in the commit message: for non-markdown cards this caller-bug input
    previously surfaced later as a raw `context.createDocument is not a
function` TypeError at first document use; it now throws at context
    construction inside the same `exportDOM` call. No test pins the old
    behavior (grep-verified); both are TypeErrors on an invalid input.
- `src/nodes/base/export-dom.ts`: add `inklingVersion?: string` to
  `ExportDOMOptionsBase` with a comment that it was previously carried only
  by the public index signature and is consumed by the markdown card. This
  is the plan's one deliberate public-type addition — `ExportDOMOptionsBase`
  reaches `dist/editor.d.ts`:~3315. If `pnpm verify:types` or
  `pnpm verify:package` objects, take the recorded STOP fallback (factory
  reads the key via a narrow cast; the base stays untouched) instead of
  reworking the public surface.
- `test/nodes-base/utils/render-context.test.ts`: ADD seam tests — the four
  fields carry through from options (functions by reference,
  `imageOptimization` frozen), and the factory throws the exact pinned
  TypeError for `createDocument: true`. These are additions; no existing
  expectation changes.
- Gates: `pnpm vitest run test/nodes-base/utils` green; `pnpm typecheck`
  clean; `pnpm verify:package && pnpm verify:types` (the base-type addition).

### Step 3: Migrate the straggler reads onto the context (commit 2)

Byte-identical output; renderers still DECLARE their options params (the
fold is Step 4) but read nothing from them. One commit; if it drifts, revert
the whole commit and split it by card for the retry.

- `srcset-attribute.ts`: `getSrcsetAttribute({ src, width, context, format? })`
  and `setSrcsetAttribute(elem, image, context)` take ONLY the context.
  Reads move to `context.imageOptimization`, `context.canTransformImage`,
  and `context.isLocalContentImage`; DELETE the legacy no-context fallback
  (:~41-42) — with the context now carrying the fields, `context.isLocalContentImage`
  with absent `siteUrl`/`imageBaseUrl` hits the same `''` defaults as the old
  forwarding (render-context.ts:~234-237). Delete its exported
  `ImageRenderOptions` interface (:~9-14).
- `image-renderer.ts`: reads move to `context.imageOptimization?.defaultMaxWidth`,
  `context.imageOptimization?.contentImageSizes`, `context.canTransformImage`,
  `context.canTransformImageToFormat`; the srcset calls (:~102, :~138-144)
  drop the `options` argument. Delete `ImageRenderOptions` (:~31-37).
- `gallery-renderer.ts`: same three reads (:~120-121, :~136, :~158-159);
  delete `GalleryRenderOptions` (:~25-31).
- `header-renderer.ts`: `cardTemplate(nodeData, context)` drops the options
  param; the `getSrcsetAttribute` call (:~95-100) drops
  `options: options as ImageRenderOptions` and the now-dead import (:~7).
  (`renderHeaderNodeV2`'s own signature folds in Step 4.)
- `file-renderer.ts`: `const href = context.postUrl || node.src || undefined`
  (:~48); `emailTemplate` drops its options param (:~40) and the call site
  (:~26) stops forwarding it.
- `markdown-renderer.ts`: delete the local createDocument check (:~21-23) —
  the Step-2 factory now raises it; narrow the markdown-it call to
  `render(node.markdown || '', { inklingVersion: context.inklingVersion })`
  (:~27). `markdown-html-renderer.ts` reads no other key off the bag
  (verified: `RenderOptions`/:~25-29, `selectRenderer`/:~75-76), and
  `isLegacyVersion(undefined || '4.0')` resolves identically to the absent-key
  case — byte-identical. Delete `MarkdownRenderOptions` (:~11).
- **Itemized test edit #1**: `test/nodes-base/utils/srcset-attribute.test.ts`
  — the five `getSrcsetAttribute` call sites (:~15, :~25, :~38, :~49, :~59)
  build a context via `createRenderContext({ imageOptimization: {...} })`
  (and `imageBaseUrl` for the CDN case at :~62) instead of passing options
  bags. Same five test titles, same expectations. Itemize in the commit
  message.
- Gates: `pnpm vitest run test/nodes-base` fully green with NO expectation
  changes outside the itemized file; spot-check the image/gallery/markdown/
  file/header card files individually.

### Step 4: The signature fold (commit 3)

One commit. Pure signature work — no read-path changes, so any test failure
here is a fold mistake, not drift to accommodate.

- `generate-decorator-node.ts`: `RenderFn` becomes
  `(node: TNode, context: RenderContext) => TOutput` (bivariant hack kept,
  :~25-27); `exportDOM` calls `defaultRenderFn(this, context)` (:~565);
  rewrite the comments at :~20-24 and :~562-564 to state the context is the
  only thing renderers receive. The public `exportDOM(editor, options)`
  signature (:~557) is UNCHANGED.
- The 14 card renderers: drop the options param — `renderAudioNode`,
  `renderBookmarkNode`, `renderButtonNode`, `renderCalloutNode`,
  `renderCodeBlockNode`, `renderFileNode`, `renderGalleryNode`,
  `renderHeaderNodeV2` (and delete `HeaderV2RenderOptions`,
  header-renderer.ts:~50), `renderHorizontalRuleNode`, `renderHtmlNode`,
  `renderImageNode`, `renderMarkdownNode`, `renderToggleNode`,
  `renderVideoNode` — all become `(node, context)`. Arity makes this
  self-pinning: a 3-required-param renderer no longer satisfies `RenderFn`.
- Transformers: `ExportChildren = (node: ElementNode) => string` and
  `ElementTransformer.export(node, exportChildren, context)`
  (transformers/index.ts:~14-22). aside/blockquote/heading drop their dead
  `options` param; list drops `options` from `exportList` (:~9-13), the
  recursion (:~42), and `exportChildren(child)` (:~52); paragraph/list may
  declare just `(node, exportChildren)` — a shorter function is assignable
  to the transformer type, so no unused context params are introduced.
- `TextContent` (TextContent.ts): constructor becomes
  `(exportChildren, context)`; `render()` uses `context.createDocument()`
  (:~63) — for the dom-backed case the factory's closure returns the same
  `dom.window.document` object, byte-identical; delete `ensureDomProperty`
  (:~33-35), the `RequiredKeys` helper (:~31), the stored options field
  (:~42, :~52), and the unreachable `'TextContent requires a dom property'`
  throw. Record the throw's removal in the commit message.
- `convert-to-html-string.ts`: `$convertToHtmlString(editor, options:
ExportDOMOptions = {})` (retyped from `RendererOptions`; the entry point
  keeps its options). `exportTopLevelElementOrDecorator` keeps `options`
  ONLY for the public `node.exportDOM(editor, options)` call (:~56);
  `exportChildren(node, context)`, the transformer call (:~76), and the
  `TextContent` construction (:~92) stop threading options. Update the
  header comment (:~18-28).
- `LexicalHTMLRenderer.ts`: the two internal `RendererOptions` annotations
  (:~38, :~42) become `ExportDOMOptions`; the `render()` signature is
  unchanged.
- Delete `src/html/renderer/types.ts` and every `RendererOptions` import
  (the nine importers enumerated in evidence).
- `visibility.ts`: `renderWithVisibility(output, visibility, context:
Pick<RenderContext, 'target'>)` — rename and retype only; the body reads
  `context.target` (:~152). `Pick<RenderContext, 'target'>` keeps the plain
  `{ target }` test calls (visibility.test.ts:~276,~378,~392,~406,~428) and
  the public `utils.visibility.renderWithVisibility` re-export compiling
  with zero runtime change. Update the explanatory comment at
  html-renderer.ts:~42-43.
- **Itemized test edit #2**: render-context.test.ts:~249-272 — the
  dispatch-threading test's render fn becomes `(_node, context) => ...` and
  the title is reworded ("...as the render fn's only argument besides the
  node"); assertions (frozen context, working `createDocument`) unchanged.
  Itemize in the commit message.
- Comment/doc sweep: render-context.ts module header (:~13 — the seam is no
  longer "alongside the legacy options bag"; renderers receive only the
  context), and CONTEXT.md's "Render context" entry (:~27-29) — update
  "every card renderer receives alongside the export options" to state the
  context is the sole export-time view renderers receive, keeping the
  `_Avoid_: options bag` line (the bag is now gone from the internal path,
  which is the point).
- Gates: `pnpm vitest run test/nodes-base test/html-renderer` green (730
  passed + the Step-2 additions, 21 todo); `pnpm typecheck` clean.

### Step 5: Full gates

- `pnpm format`, then `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit` — expect 1707 + Step-2 additions passed, 21 todo; any
  other count change is drift to explain, not to absorb.
- `pnpm verify:package && pnpm verify:types` — the public type surface
  shifted by exactly one additive field (Step 2's `inklingVersion`); prove
  the fold itself did not leak into `dist/editor.d.ts`.
- No e2e: the fold touches no demo-visible path (demo/ imports none of these
  modules, grep-verified) and plan 040 recorded that no e2e asserts exported
  markup.

## Test plan

| Scenario                    | Command                                                    | Required invariant                                      |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| Baseline                    | `pnpm vitest run test/nodes-base test/html-renderer`       | 46 files / 730 passed / 21 todo before any commit       |
| Context extension           | `pnpm vitest run test/nodes-base/utils`                    | green incl. new field/factory-throw seam tests          |
| Straggler migration         | `pnpm vitest run test/nodes-base`                          | byte-identical; only srcset-attribute.test.ts edited    |
| Markdown pin                | `pnpm vitest run test/nodes-base/nodes/markdown.test.ts`   | exact TypeError message preserved (:~181-183)           |
| The fold                    | `pnpm vitest run test/nodes-base test/html-renderer`       | green; only the itemized dispatch test edited           |
| Visibility plain-`{target}` | `pnpm vitest run test/nodes-base/utils/visibility.test.ts` | unchanged, still compiles against `Pick<..., 'target'>` |
| Full gates                  | `pnpm typecheck && pnpm lint && pnpm test:unit`            | all pass; count delta = Step-2 additions only           |
| Packed surface              | `pnpm verify:package && pnpm verify:types`                 | pass; one additive field, nothing else                  |

## Acceptance criteria

- Every card renderer, element transformer, `ExportChildren`, `TextContent`,
  and the srcset helpers receive the render context as their ONLY
  export-time argument; `RenderFn` is `(node, context)`.
- `RendererOptions` and `src/html/renderer/types.ts` are deleted, along with
  the five renderer-local options interfaces; no `options` parameter remains
  on the internal render path.
- `renderWithVisibility` takes `Pick<RenderContext, 'target'>`; its public
  re-export and plain-`{target}` callers are unaffected at runtime.
- The public entry points (`exportDOM(editor, options)`,
  `$convertToHtmlString(editor, options)`, `LexicalHTMLRenderer.render`)
  still accept `ExportDOMOptions`; the context is built from options at
  those entry points only.
- Renderer output is byte-identical to the Step-1 baseline; the complete
  test diff is the two itemized edits plus the Step-2 seam-test additions.
- The pinned markdown TypeError survives with its exact message, now raised
  by the context factory.
- CONTEXT.md's "Render context" entry describes the folded end-state.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`,
  `pnpm verify:package`, `pnpm verify:types` green.

## STOP conditions

- Any output drift in any card, string-layer, or seam test during Steps 3-4.
  Revert the offending commit, keep the tree otherwise intact, and report —
  do not update expectations to make it pass (the standing red line).
- Markdown output shifts when the markdown-it pass is narrowed to
  `{ inklingVersion }` — that would prove a second, hidden bag consumer.
  Revert the markdown hunk of commit 2, restore the whole-bag pass-through
  for the markdown renderer only, record the consumer, and continue with the
  rest of the plan.
- The factory cannot raise the markdown createDocument TypeError with the
  byte-identical message and from inside the same `exportDOM` call
  (markdown.test.ts:~176-185 red). Do not weaken the pin; revert commit 1's
  factory hunk, keep the check in markdown-renderer via a narrow documented
  context accessor, and record the deviation.
- A test OUTSIDE the itemized list needs editing. The enumeration in this
  plan was exhaustive at `d998080`; a miss means the fold is touching a path
  it didn't map. Stop and report unless the edit is the same mechanical
  options-bag → `createRenderContext` swap, in which case add it to the
  commit message's itemization.
- `pnpm verify:types` / `pnpm verify:package` fails on the
  `ExportDOMOptionsBase.inklingVersion` addition. Drop the base-type hunk,
  read the key in the factory via a narrow cast with a comment, and record
  the fallback in the commit message — do not rework the public surface
  mid-plan.
- `Pick<RenderContext, 'target'>` breaks compilation of the plain-`{target}`
  callers of `renderWithVisibility`. Keep the structural `{ target?: string }`
  param type (rename only), record the exception in the commit message.
- Plan 041 has not landed, or the Step-1 drift check shows the enumerated
  files moved. Re-base or wait — do not execute against stale references.

## Rollback plan

Each step is its own commit on `main`; revert the offending commit alone
(`git revert <sha>`). Commit 1 is purely additive (new context fields, new
seam tests, one additive public type field) and is safe to keep even if
commit 2 or 3 is reverted — the renderers simply keep reading the bag while
the extra fields sit unused. Reverting commit 2 restores the straggler reads
(and the srcset helper's dual signature) without touching the fold.
Reverting commit 3 restores the dual-argument dispatch and `RendererOptions`
wholesale; commits 1-2 remain valid underneath it. The characterization
evidence is the pre-existing per-card suite — no new fixtures to preserve or
restore.

## Execution notes

Plan 042 landed in three commits on main (`9cf6642..c40363f`), after the
plan-041 drift check confirmed its evidence was still fresh. Commit 1
(`9cf6642`) carried the image (`imageOptimization` as a frozen snapshot, the
`canTransformImage*` callbacks by reference) and markdown (`inklingVersion`)
data fields onto the context and moved the pinned markdown `TypeError` into
the factory — for non-markdown cards a truthy-non-function `createDocument`
now throws at context construction instead of first document use (unpinned,
both `TypeError`s). Commit 2 (`fd4c49f`) migrated the remaining options
reads; the only test edit was `srcset-attribute.test.ts`, whose five call
sites now build a context via `createRenderContext(...)` with identical
expectations. Commit 3 (`c40363f`) folded the signatures: `RenderFn` is
`(node, context)` (bivariant hack kept and re-commented), all 14 card
renderers, the transformers, and `TextContent` receive only the context;
`RendererOptions`, `src/html/renderer/types.ts`, and the five renderer-local
options interfaces were deleted; `TextContent`'s unreachable dom-guard throw
was removed (unpinned). The public entry points (`exportDOM(editor,
options)`, `$convertToHtmlString`, `LexicalHTMLRenderer.render`) are
unchanged — the fold is internal. `27a233a` mapped the plan-042 data fields
in the seam's module header after review. One review nit deferred to plan
048: public `utils.visibility.renderWithVisibility`'s third param retyped
from `{ target?: string }` to `Pick<RenderContext, 'target'>`, making the
key required — 048's public-surface pass owns the decision. Gates at HEAD:
nodes-base+html-renderer 46 files / 735 passed / 21 todo (730 + 5 new seam
tests); full unit 206 files / 1712 passed / 21 todo; typecheck clean; lint
0/0; format:check clean; verify:package PASS (76 exports); verify:types
PASS. The packed declaration gained only the deliberate additive
`inklingVersion?: string` on `ExportDOMOptionsBase`.
