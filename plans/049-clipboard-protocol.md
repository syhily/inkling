# Plan 049: Name the clipboard-protocol module

> **Executor instructions**: This plan carves the paste pipeline's shared
> vocabulary — commands, MIME constants, modifier state, input-side link
> acceptance — out of the React files that currently host it and into one
> headless module, `src/plugins/behaviour/clipboard-protocol.ts`. The design is
> decided; do not redesign the module. Steps 1–3 are behavior-preserving: every
> existing test stays green with unchanged expectations, and the only new tests
> are additive pins. Symbol names marked "illustrative" may be refined by the
> executor; the module's location, headlessness, and ownership list may not.
> Build AROUND plan 010's `handlePlainTextPaste` consolidation — do not undo
> it. Per the 2026-07-16 grilling decisions, work commits DIRECTLY on `main`
> (no branch, no push, no PR); this overrides the `advisor/NNN-<slug>` branch
> convention in `plans/README.md`.
>
> **Drift check (run first)** — baselines taken at HEAD `d998080`:
> `pnpm test:unit` = 206 files / 1707 passed / 21 todo;
> `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730 passed
> / 21 todo; `pnpm test:e2e:quiet test/e2e/paste-behaviour.test.ts` green
> (record the exact count at execution time).
> Also diff the files this plan touches:
> `git diff --stat d998080..HEAD -- src/plugins/MarkdownPastePlugin.tsx src/plugins/DragDropPastePlugin.tsx src/plugins/MarkdownShortcutPlugin.tsx src/plugins/InklingBehaviourPlugin.tsx src/plugins/behaviour src/markdown src/utils/isInternalUrl.ts src/hooks/useSearchLinks.ts src/index.ts test/unit/plugins test/unit/utils/isInternalUrl.test.ts test/nodes-base/utils/is-safe-url.test.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW-MEDIUM — move-only refactors plus one listener-lifecycle fix;
  paste behavior is pinned by unit and e2e suites
- **Confidence**: HIGH
- **Depends on**: — (plan 050 builds on Step 2's headless transformer home;
  land this first)
- **Category**: architecture deepening / module naming
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

The paste pipeline is one protocol spread across five modules, but its
vocabulary has no home. The pipeline: `registerPasteHandler.ts` (entry,
`PASTE_COMMAND`) → `plainTextPaste.ts` (shared plain-text classifier, plan 010) → `PASTE_LINK_COMMAND` (`registerLinkMatching.ts`) and
`PASTE_MARKDOWN_COMMAND` (`MarkdownPastePlugin.tsx`), with
`DragDropPastePlugin.tsx` owning the file/drop leg. The protocol is shallow —
a handful of constants, two commands, one piece of modifier state — but
because no module owns it, each part lives wherever it was first written, and
the wiring inverts the architecture's direction:

- **The vocabulary lives in React files.** `PASTE_MARKDOWN_COMMAND`,
  `MIME_TEXT_PLAIN`, and `MIME_TEXT_HTML` are defined in
  `MarkdownPastePlugin.tsx:8-10` and imported by the React-free behaviour
  layer (`plainTextPaste.ts:5`, `registerPasteHandler.ts:7`). The same
  inversion repeats for `INSERT_MEDIA_COMMAND` (`DragDropPastePlugin.tsx:21`,
  imported by `ImagePlugin.tsx:7`, `AudioPlugin.tsx:6`, `VideoPlugin.tsx:6`),
  and `DragDropPastePlugin.tsx:151` re-spells the literal `'text/html'`
  instead of using the constant. Depth is inverted: headless logic depends on
  React modules to learn the protocol's nouns.
- **The same data inversion exists for markdown transformers.** The
  transformer DATA (`HR`, `CODE_BLOCK`, `SUBSCRIPT`, `SUPERSCRIPT`,
  `ELEMENT_TRANSFORMERS`, `CUSTOM_TEXT_FORMAT_TRANSFORMERS`,
  `DEFAULT/MINIMAL/BASIC/EMAIL_TRANSFORMERS`,
  `MarkdownShortcutPlugin.tsx:18-109`) lives in a React plugin file and is
  imported by the React-free public `src/markdown/round-trip.ts:13`.
- **Shift state is tracked twice for one pipeline.**
  `InklingBehaviourPlugin.tsx:61-79` keeps a ref feeding
  `registerLinkMatching`; `MarkdownPastePlugin.tsx:14-38` keeps React state
  for the same physical key. Worse, `isShiftDown` is in the paste effect's
  dependency list at `MarkdownPastePlugin.tsx:66`, so the
  `PASTE_MARKDOWN_COMMAND` listener is torn down and re-registered on every
  Shift press/release — the per-keystroke churn plan 006 gated elsewhere.
- **Input-side URL policy is a drift-prone second table.**
  `src/utils/isInternalUrl.ts:1-14` (`isValidUrl`: allows
  http/https/mailto/tel/ftp, rejects relative) decides which pasted text
  becomes a link; the export side (`src/nodes/base/utils/is-safe-url.ts`,
  now private implementation behind the render context's `safeUrl`, plan 040) keeps http/https/relative only. Pasting `ftp://…` (or
  `mailto:`/`tel:`) creates a live editor link that export blanks. Neither
  table names the other. The same shape repeats for "is this our own URL":
  `isInternalUrl` (input, at-link labeling) vs `isLocalContentImage`
  (export, in the seam). A third input-side table,
  `useSearchLinks.ts:7`'s `URL_QUERY_REGEX`, also goes unnamed.

Naming the module gives the pipeline one headless interface to import, kills
the re-registration churn by construction, and puts the two URL tables one
cross-reference away from each other instead of discovering their divergence
in exported output.

## Current-state evidence

Verified fresh against commit `d998080`:

- Protocol vocabulary in React files: `PASTE_MARKDOWN_COMMAND`,
  `MIME_TEXT_PLAIN`, `MIME_TEXT_HTML` at `MarkdownPastePlugin.tsx:8-10`;
  importers `src/plugins/behaviour/plainTextPaste.ts:5`,
  `src/plugins/behaviour/registerPasteHandler.ts:7`,
  `test/unit/plugins/RestrictContentPlugin.test.ts:12`,
  `test/unit/plugins/MarkdownPastePlugin.test.tsx:15`.
  `INSERT_MEDIA_COMMAND` at `src/plugins/DragDropPastePlugin.tsx:21`;
  importers `src/plugins/ImagePlugin.tsx:7`, `src/plugins/AudioPlugin.tsx:6`,
  `src/plugins/VideoPlugin.tsx:6`, `test/unit/plugins/ImagePlugin.test.tsx:8`.
  Literal `'text/html'` at `DragDropPastePlugin.tsx:151`.
- `PASTE_LINK_COMMAND` is already headless
  (`src/plugins/behaviour/commands.ts:16`); its handler takes the modifier
  ref as `{ current: boolean }` (`registerLinkMatching.ts:11`). It does not
  move; the new module's header names it as part of the protocol.
- Duplicate modifier tracking: ref + listeners at
  `InklingBehaviourPlugin.tsx:61-79`, passed to `registerLinkMatching` at
  `:104`; React state + two listener effects at
  `MarkdownPastePlugin.tsx:14-38`; re-registration deps `[editor,
isShiftDown]` at `MarkdownPastePlugin.tsx:66`. Shift behavior is pinned by
  `test/unit/plugins/MarkdownPastePlugin.test.tsx:103-119` (raw insert while
  Shift held) and `test/e2e/paste-behaviour.test.ts:250` (Shift-paste creates
  a link).
- Transformer data at `MarkdownShortcutPlugin.tsx:18-109` (`HR` :18-37,
  `CODE_BLOCK` :39-60, `SUBSCRIPT`/`SUPERSCRIPT` :63-73,
  `ELEMENT_TRANSFORMERS` :75, `CUSTOM_TEXT_FORMAT_TRANSFORMERS` :77,
  `DEFAULT_TRANSFORMERS` :79-84, `MINIMAL_TRANSFORMERS` :86-90,
  `BASIC_TRANSFORMERS` :92-98, `EMAIL_TRANSFORMERS` :100-109). Consumers:
  `src/markdown/round-trip.ts:13` (headless, public),
  `src/components/InklingNestedEditor.tsx:7`,
  `src/components/EmailEditor.tsx:26`,
  `src/components/InklingCaptionEditor.tsx:21`, barrel
  `src/index.ts:46-54` re-exported at `src/index.ts:130-136` (public names),
  `test/typecheck/public-editor-api.tsx:14` (root-import of
  `BASIC_TRANSFORMERS`), `test/unit/plugins/MarkdownShortcutPlugin.test.ts:13-18`.
  `docs/markdown-api.md:37` names the plugin file as the transformer home.
- Input-side link acceptance: `isValidUrl` at
  `src/utils/isInternalUrl.ts:1-14`; sole production consumer
  `plainTextPaste.ts:24`; not re-exported by `src/utils/index.ts` (internal
  only). Acceptance of mailto/tel/ftp is deliberate and pinned
  (`test/unit/utils/isInternalUrl.test.ts:39-41`); the koenig reference
  hand-rolled an `https?`-only regex with a TODO for more protocols
  (`docs/superpowers/plans/reaudit-round3/domain-3.md:318`), so the wider
  acceptance is a known Inkling extension (plan 001).
- Export-side URL policy: `isSafeUrl` (navigation: http/https/relative,
  `src/nodes/base/utils/is-safe-url.ts:6-30`) and `isSafeMediaUrl` (:37-61),
  private implementation behind the render context's `safeUrl`
  (`src/nodes/base/render-context.ts:132,231-233`); plan 040's import guard
  keeps card sources from importing the module. Its test
  (`test/nodes-base/utils/is-safe-url.test.ts`) pins http/https/relative,
  data/blob, `javascript:` and control characters — but never pins
  mailto/tel/ftp rejection.
- Third input-side table: `URL_QUERY_REGEX = /^http|^#|^\/|^mailto:|^tel:/`
  at `src/hooks/useSearchLinks.ts:7` (used at :121, :181) — search-box query
  classification, not link validation; accepts mailto/tel but not ftp.
- "Own URL" pair: `isInternalUrl` (`src/utils/isInternalUrl.ts:16-28`;
  consumers `src/plugins/AtLinkPlugin.tsx:602`,
  `src/components/ui/LinkActionToolbarWithSearch.tsx:135`,
  `src/nodes/BookmarkNodeComponent.tsx:87`) vs `isLocalContentImage`
  (`src/nodes/base/utils/is-local-content-image.ts`; behind the render
  context at `render-context.ts:137,234-238`).
- The shared plain-text path: `handlePlainTextPaste`
  (`src/plugins/behaviour/plainTextPaste.ts:15`) used by
  `registerPasteHandler.ts:62` and `RestrictContentPlugin.tsx:79` — plan
  010's consolidation; build around it.
- E2E pins: `test/e2e/paste-behaviour.test.ts` (686 lines: Text, URLs,
  Styles, Office.com Word, Google Docs, Invalid nesting, Inside cards,
  Files) and `test/e2e/plugins/DragDropPastePlugin.test.ts` (file drops).

## Scope

**In scope**:

- A new headless module `src/plugins/behaviour/clipboard-protocol.ts` owning:
  the MIME constants, `PASTE_MARKDOWN_COMMAND`, `INSERT_MEDIA_COMMAND`, and
  one per-editor shared modifier state (interface + accessor, names
  illustrative: `ModifierState`, `getModifierState(editor)`), plus a module
  header naming the full pipeline and where each leg lives.
- Converging both Shift trackers on the shared modifier state, removing the
  `PASTE_MARKDOWN_COMMAND` re-registration churn.
- Moving the markdown transformer data to a headless module beside
  `round-trip.ts` (illustrative: `src/markdown/transformers.ts`);
  `MarkdownShortcutPlugin.tsx` keeps only its React wrapper.
- Reconciling the URL tables by honest names and cross-references — moving
  `isValidUrl` into the protocol module under an input-side name
  (illustrative: `isPasteableLinkUrl`) — plus pins recording exactly which
  schemes input accepts and export keeps, including the divergence itself.
- A `CONTEXT.md` entry for the clipboard protocol.

**Out of scope**:

- Changing any paste/drop behavior, listener priority, or command payload.
- Restructuring `handlePlainTextPaste` or `registerPasteHandler` logic (plan
  010's consolidation stands).
- Moving `PASTE_LINK_COMMAND` out of `behaviour/commands.ts` — it is already
  headless; the protocol header names it instead.
- Aligning the input and export scheme tables (behavior change; this plan
  documents and pins the divergence — see Step 3's decision point).
- Harmonizing `useSearchLinks`'s `URL_QUERY_REGEX` with either table —
  cross-reference comment only.
- `MarkdownPastePlugin`'s markdown-to-HTML conversion logic
  (`markdownRender`, `sanitizeHtml` usage) — untouched.

## Commands you will need

| Purpose                     | Command                                                            | Expected on success                      |
| --------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| Unit baseline + full gate   | `pnpm test:unit`                                                   | 206 files / 1707 passed / 21 todo (+new) |
| Renderer suites (untouched) | `pnpm vitest run test/nodes-base test/html-renderer`               | 46 files / 730 passed / 21 todo          |
| Focused paste tests         | `pnpm vitest run test/unit/plugins`                                | green, no expectation edits              |
| Paste e2e                   | `pnpm test:e2e:quiet test/e2e/paste-behaviour.test.ts`             | green (baseline recorded first)          |
| File-leg e2e                | `pnpm test:e2e:quiet test/e2e/plugins/DragDropPastePlugin.test.ts` | green                                    |
| Static gates                | `pnpm typecheck && pnpm lint && pnpm format:check`                 | all pass                                 |
| Packed surface (Step 2)     | `pnpm verify:package && pnpm verify:types`                         | PASS — public names byte-identical       |

## Git workflow

- Branch: none — commit DIRECTLY on `main` (2026-07-16 grilling decision;
  overrides `plans/README.md`'s branch convention). No push, no PR.
- Commit 1: `refactor(clipboard): name the clipboard-protocol module and share one modifier state`
- Commit 2: `refactor(markdown): move shortcut transformer data beside round-trip`
- Commit 3: `test(clipboard): pin url scheme tables on both sides of the export seam`
- Commit 4: `refactor(clipboard): name input-side link acceptance and cross-reference url tables`

## Steps

### Step 1: Create the clipboard-protocol module; converge modifier state on one ref

One commit. Behavior-preserving.

- Create `src/plugins/behaviour/clipboard-protocol.ts`, headless (imports
  from `lexical` only):
  - Move `MIME_TEXT_PLAIN`, `MIME_TEXT_HTML`, `PASTE_MARKDOWN_COMMAND` from
    `MarkdownPastePlugin.tsx:8-10` (verbatim values/types).
  - Move `INSERT_MEDIA_COMMAND` from `DragDropPastePlugin.tsx:21` (verbatim
    payload type). This extends the brief's list — verified same inversion,
    four importers — and completes the module's ownership of paste-pipeline
    commands. If the move produces an import cycle or lint complaint, leave
    the command in `DragDropPastePlugin.tsx` and record it; do not force it.
  - Add the shared modifier state (illustrative): `interface ModifierState {
current: boolean }` and `getModifierState(editor: LexicalEditor):
ModifierState`, backed by a `WeakMap<LexicalEditor, ModifierState>` — one
    state object per editor, created lazily. The `{ current: boolean }`
    shape matches `LinkMatchingDeps.isShiftPressed`
    (`registerLinkMatching.ts:11`), so the behaviour layer's deps interface
    is unchanged.
  - Module header comment naming the protocol: entry
    (`registerPasteHandler.ts`), plain-text classifier
    (`plainTextPaste.ts`, plan 010), link leg (`PASTE_LINK_COMMAND` in
    `behaviour/commands.ts` → `registerLinkMatching.ts`), markdown leg
    (`PASTE_MARKDOWN_COMMAND` → `MarkdownPastePlugin.tsx`), file leg
    (`INSERT_MEDIA_COMMAND` → `ImagePlugin`/`AudioPlugin`/`VideoPlugin`),
    and the shared modifier state. This header is the "named module" — the
    pipeline's map.
- `MarkdownPastePlugin.tsx`: delete the moved constants and the React state
  (`useState` + both listener effects, :14-38). The command handler reads
  `getModifierState(editor).current`; the paste effect's deps become
  `[editor, modifierState]`, both stable per editor — the Shift-driven
  re-registration is gone by construction. Keep its own keydown/keyup
  listeners writing `event.shiftKey` (per-consumer listeners are deliberate:
  each plugin works standalone; writes are idempotent so dual writers cannot
  diverge).
- `InklingBehaviourPlugin.tsx:61-79`: replace `React.useRef(false)` with the
  shared state; its existing listeners now write `event.shiftKey` into it;
  the `registerLinkMatching(editor, { isShiftPressed })` call at :104 is
  unchanged in shape.
- Update importers: `plainTextPaste.ts:5`, `registerPasteHandler.ts:7`,
  `DragDropPastePlugin.tsx:21` (and adopt `MIME_TEXT_HTML` for the literal
  at :151), `ImagePlugin.tsx:7`, `AudioPlugin.tsx:6`, `VideoPlugin.tsx:6`,
  `test/unit/plugins/RestrictContentPlugin.test.ts:12`,
  `test/unit/plugins/MarkdownPastePlugin.test.tsx:15`,
  `test/unit/plugins/ImagePlugin.test.tsx:8`. No re-export shims — none of
  these names is re-exported by `src/index.ts`.
- Add `test/unit/plugins/behaviour/clipboard-protocol.test.ts`:
  `getModifierState` returns the same object per editor and distinct objects
  across editors; a churn pin — spy on `editor.registerCommand` around the
  `MarkdownPastePlugin` hook, dispatch Shift keydown/keyup on `document`,
  assert no re-registration (mechanics are executor detail; the existing
  `MockDataTransfer` fixture in `MarkdownPastePlugin.test.tsx` is the
  pattern).
- `CONTEXT.md`: add a "Clipboard protocol" entry (the headless module owning
  paste-pipeline vocabulary: commands, MIME constants, modifier state,
  input-side link acceptance).
- Proof of zero drift: all existing unit tests pass with unchanged
  expectations (shift behavior pinned at
  `MarkdownPastePlugin.test.tsx:103-119`); run the paste e2e and file-leg
  e2e specs from the Commands table.

### Step 2: Move the markdown transformer data to its headless home

One commit. Behavior-preserving; public names unchanged.

- Create `src/markdown/transformers.ts` (illustrative path) and move the
  data from `MarkdownShortcutPlugin.tsx:18-109` verbatim: `HR`,
  `CODE_BLOCK`, `SUBSCRIPT`, `SUPERSCRIPT`, `ELEMENT_TRANSFORMERS`,
  `CUSTOM_TEXT_FORMAT_TRANSFORMERS`, `DEFAULT_TRANSFORMERS`,
  `MINIMAL_TRANSFORMERS`, `BASIC_TRANSFORMERS`, `EMAIL_TRANSFORMERS`
  (including the `isImport` TODO comment — it moves with `HR`).
- `MarkdownShortcutPlugin.tsx` keeps only the default-export React wrapper
  (:111-116), importing `DEFAULT_TRANSFORMERS` from the new module for its
  default parameter.
- Update importers: `src/markdown/round-trip.ts:13` (now a sibling import —
  the locality this refactor exists for), `InklingNestedEditor.tsx:7`,
  `EmailEditor.tsx:26`, `InklingCaptionEditor.tsx:21`,
  `src/index.ts:46-54` (same names, new path — the public barrel at
  `src/index.ts:130-136` must not change), and
  `test/unit/plugins/MarkdownShortcutPlugin.test.ts:13-18`. No re-export
  shims from the plugin file.
- Update `docs/markdown-api.md:37` to name the new transformer home; update
  the path reference at `docs/tech-debt-triage.md:34` if trivial.
- Proof of zero drift: the markdown suites pass unchanged
  (`pnpm vitest run test/markdown test/unit/plugins/MarkdownShortcutPlugin.test.ts`);
  `test/typecheck/public-editor-api.tsx:14` still typechecks against the
  root import. Because the barrel's import path moved, run
  `pnpm verify:package` and `pnpm verify:types` — the packed public surface
  must be byte-identical.
- Note for sequencing: plan 050 builds on this headless home; do not fold
  any of plan 050's work into this step.

### Step 3: Reconcile the URL tables — pins first, then honest names and cross-references

Two commits. Behavior-preserving. This plan documents and pins the
input/export scheme divergence; it does NOT align the tables (see STOP
conditions for the decision point and the recommendation).

- Commit 3 (pins): extend `test/nodes-base/utils/is-safe-url.test.ts` with
  the missing export-side pins — `isSafeUrl` rejects `mailto:`, `tel:`,
  `ftp:` (it already pins http/https/relative acceptance). In the new
  `test/unit/plugins/behaviour/clipboard-protocol.test.ts`, pin the
  input-side acceptance set (http/https/mailto/tel/ftp absolute-only;
  relative rejected) — the cases at `test/unit/utils/isInternalUrl.test.ts:31-61`
  move here in commit 4; duplicate them now only if simpler. Add ONE
  divergence-documentation test asserting both sides together (input
  accepts `ftp://example.com/file`, export's `isSafeUrl` rejects it) with a
  comment: two deliberate policies (input pin from plan 001, export pin from
  plans 001/030/040) that do not compose — a pasted ftp/mailto/tel link is
  live in the editor and blanked on export. Importing
  `is-safe-url` in this test is fine; plan 040's import guard covers card
  sources, not tests.
- Commit 4 (names + cross-references):
  - Move `isValidUrl` from `src/utils/isInternalUrl.ts` into
    `clipboard-protocol.ts`, renamed for honesty (illustrative:
    `isPasteableLinkUrl`) — its sole production consumer is
    `plainTextPaste.ts:24`, and it is not re-exported by
    `src/utils/index.ts`, so this is internal. Move the
    `describe('isValidUrl')` block (`test/unit/utils/isInternalUrl.test.ts:31-61`)
    into the protocol test; the `isInternalUrl` block stays.
  - Module comment in `clipboard-protocol.ts` naming the counterpart:
    input-side acceptance decides "should this pasted text become a link";
    export-side safety (`isSafeUrl`, behind the render context's `safeUrl`)
    decides "is this href safe to emit"; the two sets differ deliberately,
    and the divergence test pins it.
  - Reciprocal comment in `src/nodes/base/utils/is-safe-url.ts` pointing at
    the input-side table.
  - Cross-reference comment at `src/hooks/useSearchLinks.ts:7` naming it as
    a third, query-classification table (deliberately not unified — it
    classifies search input, not pasted links).
  - Cross-reference the "own URL" pair: comment on `isInternalUrl`
    (`src/utils/isInternalUrl.ts:16`) pointing at `isLocalContentImage`
    (export side, behind the render context) and vice versa in
    `src/nodes/base/utils/is-local-content-image.ts`.
- Proof of zero drift: `pnpm vitest run test/unit/utils/isInternalUrl.test.ts
test/unit/plugins/behaviour` and the renderer suites pass; the only
  expectation edits are the moved `describe` block.

## Test plan

| Scenario                   | Command                                                                | Required invariant                          |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Baselines at `d998080`     | `pnpm test:unit`; `pnpm vitest run test/nodes-base test/html-renderer` | 1707+21 todo; 730+21 todo before any change |
| Modifier-state convergence | `pnpm vitest run test/unit/plugins/MarkdownPastePlugin.test.tsx`       | shift-paste behavior unchanged (:103-119)   |
| Re-registration churn pin  | `pnpm vitest run test/unit/plugins/behaviour`                          | no re-registration on Shift press/release   |
| Paste behavior end to end  | `pnpm test:e2e:quiet test/e2e/paste-behaviour.test.ts`                 | green, incl. shift case at :250             |
| File leg                   | `pnpm test:e2e:quiet test/e2e/plugins/DragDropPastePlugin.test.ts`     | green                                       |
| Transformer move           | `pnpm vitest run test/markdown test/unit/plugins`                      | unchanged expectations                      |
| Packed surface (Step 2)    | `pnpm verify:package && pnpm verify:types`                             | PASS, public names byte-identical           |
| URL scheme pins            | `pnpm vitest run test/nodes-base/utils test/unit/utils`                | both tables pinned, divergence documented   |
| Full gates                 | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit`   | all pass                                    |

## Acceptance criteria

- `src/plugins/behaviour/clipboard-protocol.ts` exists, is headless, and
  owns the MIME constants, `PASTE_MARKDOWN_COMMAND`, `INSERT_MEDIA_COMMAND`,
  the shared modifier state, and (after Step 3) input-side link acceptance;
  its header names the whole pipeline including `PASTE_LINK_COMMAND`'s home.
- No React file defines paste-protocol vocabulary; `DragDropPastePlugin.tsx`
  uses the `MIME_TEXT_HTML` constant instead of the literal.
- One modifier-state object per editor serves both paste legs; the
  `PASTE_MARKDOWN_COMMAND` listener no longer re-registers on Shift
  press/release, pinned by the churn test.
- Transformer data lives beside `round-trip.ts`; `MarkdownShortcutPlugin.tsx`
  is only the React wrapper; public barrel names and the packed surface are
  unchanged (`verify:package`/`verify:types` PASS).
- Both URL tables carry honest names and mutual cross-references; the
  mailto/tel/ftp divergence is pinned as a test, not discovered in export.
- Baselines hold: unit 1707 passed + 21 todo (plus the new additive pins),
  nodes-base+html-renderer 730 passed + 21 todo, paste e2e green.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` green.

## STOP conditions

- Any existing test expectation needs editing to stay green in any step.
  Revert that commit and reassess — these steps are move-only; behavior
  drift means the move was not mechanical. Never update expectations to
  mask drift.
- The shared modifier state cannot be made mount-order-independent (a
  mounting combination of the two plugins reads stale state). Fall back to
  per-plugin refs created by the module's factory — the churn fix and the
  module survive; the single shared ref does not — and record the fallback.
  Do not prop-drill state through the public `InklingBehaviourPlugin` or
  add module-level singleton listeners that outlive the editor.
- `pnpm verify:package` or `pnpm verify:types` shows a public-name shift
  after Step 2. Restore the barrel's import shape; the public names are the
  contract, the internal path is not.
- The URL-table divergence turns out to be accidental rather than two
  deliberate policies (e.g. evidence the input-side mailto/tel/ftp
  acceptance was never intended). STOP and report; do not silently align
  either side. Recommendation recorded up front: document-and-pin (this
  plan's default) — both sides are already deliberately pinned (input at
  `test/unit/utils/isInternalUrl.test.ts:39-41`, export as the navigation
  policy behind the render context), so changing either is a product-visible
  behavior change beyond this refactor's mandate. If the reviewer instead
  wants alignment, align input to export (the export side is the
  security-critical table) as a separate, clearly-labeled fix commit.
- Moving `INSERT_MEDIA_COMMAND` (the beyond-brief addition) creates an
  import cycle or lint complaint. Leave it in `DragDropPastePlugin.tsx`,
  record the reason in the protocol header, and proceed.

## Rollback plan

Each step is its own commit; revert the offending commit alone
(`git revert <sha>`). Steps 1, 2, and 3 are mutually independent — Step 2's
transformer move and Step 3's URL reconciliation share no files with Step 1
or each other (Step 3's protocol-test additions assume Step 1's module
exists; if Step 1 is reverted, revert Step 3's protocol-side pins with it
and keep the `is-safe-url` export-side pins, which stand alone). The
existing suites are the evidence for any re-attempt: they required no
expectation edits to land this plan, so they remain valid against the
un-refactored code after a revert.

## Execution notes

Plan 049 landed in four commits on main (`37ed494..1ed291e`) plus a
post-review comment fix (`3bd8b06`). Step 1 (`37ed494`) created the
headless `src/plugins/behaviour/clipboard-protocol.ts` (imports `lexical`
only): MIME constants, `PASTE_MARKDOWN_COMMAND`, `INSERT_MEDIA_COMMAND`,
and the per-editor `ModifierState` WeakMap; both Shift trackers converged
onto it and `MarkdownPastePlugin`'s listener-churn (React state +
`isShiftDown` dep) is gone — pinned non-vacuously (state flips on Shift
keydown/keyup while `registerCommand` call count stays constant). Step 2
(`f6d70ed`) moved all ten transformers verbatim from
`MarkdownShortcutPlugin.tsx` to `src/markdown/transformers.ts` (`isImport`
TODO carried; barrel names unchanged; no import cycle). Step 3
(`1882c4d`) pinned the url scheme tables on both sides of the export seam
— document-and-pin per the ruling: no table contents changed anywhere,
input pin + export pin + one divergence test asserting both deliberate
policies together. Step 4 (`1ed291e`) renamed `isValidUrl` to
`isPasteableLinkUrl` (byte-identical body) and cross-referenced all five
url-table sites plus the `isInternalUrl`↔`isLocalContentImage` pair.

One orchestration-ruling tension, adjudicated in review as correctly
resolved (STOP beats ruling; plan text was wrong): the ruling said
modifier-state writes should be idempotent `event.shiftKey` writes, but
`MarkdownPastePlugin`'s pre-refactor listeners gated on `e.key ===
'Shift'` and its pinned test dispatches a synthetic
`KeyboardEvent('keydown', { key: 'Shift' })` whose `shiftKey` is false —
switching that writer to `event.shiftKey` would have changed behavior and
tripped the plan's no-expectation-edit STOP. Both plugins kept their
verbatim listener semantics writing into the one shared object. Review
walked the real event sequences: the two formulations agree on every
real browser stream except releasing one of two held Shift keys (stale
value self-corrects on the next key event; only a menu-paste inside that
window observes it — pre-existing, and an improvement over the old split
trackers). `3bd8b06` reworded the overstated "idempotent ⇒ cannot
diverge" comment at all three sites (module, plugin, CONTEXT.md) to state
that real invariant. An optional two-plugin convergence test was noted by
review and left out (mechanism is pinned via identity tests + the churn
pin + shift-paste e2e).

Plan defects recorded: Step 1's prescription of `event.shiftKey` writes
for `MarkdownPastePlugin` (misreading of the pre-refactor code); the
INSERT_MEDIA_COMMAND importer list was stale after plan 043 collapsed the
media plugins into `CardInsertPlugin` (real importers updated; the
module header names `CardInsertPlugin` as the file-leg claimer); the
protocol test is `.tsx` not `.ts` (JSX wrapper). The CONTEXT.md
"Clipboard protocol" entry landed two commits ahead of reality; final
text matches final state.

Gates at HEAD: full unit 222 files / 1928 passed / 21 todo;
nodes-base+html-renderer 46 files / 736 passed / 21 todo (+1 export-side
pin); `paste-behaviour` e2e 28 passed, DragDropPastePlugin e2e 4 passed;
`verify:package` PASS (64 exports — barrel names intact after the
transformer move); `verify:types` PASS; typecheck/lint/format clean.
