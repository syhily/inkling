# Plan 050: One markdown module, two named dialects

> **Executor instructions**: This plan is name + pin only, decided at grilling
> on 2026-07-16. Inkling imports markdown through TWO divergent pipelines —
> the paste path (markdown-it → sanitize → rich-text insert) and the public
> round-trip module (`@lexical/markdown` + card transformers) — and nothing
> names them, documents their different coverage, or pins what happens when
> they meet (a pasted `inkling:*` card fence becomes a code block, not a
> card). Do NOT merge the dialects: making the paste path adopt the
> card-aware round-trip dialect so pasted card fences recreate cards is a
> product decision, recorded here and in `docs/markdown-api.md` as an open
> question. Pin CURRENT behavior, whatever it turns out to be — if the code
> contradicts this plan's evidence, the fixtures pin the code. Plan 049 must
> land first: it relocates the card transformer data and the paste MIME
> constants that the dialect module references.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/markdown src/plugins/MarkdownPastePlugin.tsx src/plugins/behaviour/plainTextPaste.ts src/plugins/behaviour/registerPasteHandler.ts src/nodes/cards/card-markdown-transformers.ts test/markdown test/unit/plugins/MarkdownPastePlugin.test.tsx docs/markdown-api.md CONTEXT.md`
> Expect the diff to show exactly plan 049's moves (transformer data, MIME
> constants). Then confirm 049's new homes exist and re-point this plan's
> pre-049 path references at them before writing any code. Baseline suites at
> `d998080`: `pnpm test:unit` = 206 files / 1707 passed / 21 todo;
> `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730
> passed / 21 todo. This plan changes no production behavior — existing
> expectations must not move; pass counts grow only by the new fixtures.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — additive fixtures plus a naming seam; no behavior change
- **Confidence**: HIGH
- **Depends on**: 049 (moves the transformer data and MIME constants the dialect module references)
- **Category**: architecture deepening / documentation
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

The editor speaks markdown twice, and the two mouths do not speak the same
language. The paste path (`PASTE_MARKDOWN_COMMAND` in
`src/plugins/MarkdownPastePlugin.tsx:53-59`) renders the clipboard through
markdown-it (`src/markdown/markdown-html-renderer.ts` — plugins: footnote,
lazy-headers, mark, image-lazy-loading, named-headers, sub, sup), strips
`<br>`, sanitizes with `sanitizeHtml`, and inserts via a fake `DataTransfer`
and `$insertDataTransferForRichText`. The public round-trip module
(`src/markdown/round-trip.ts:83-94`, `markdownToLexicalState`) imports through
`@lexical/markdown`'s `$convertFromMarkdownString` with the Inkling card
transformers.

The dialects differ in both directions. The paste dialect speaks
footnotes (`[^1]`), `==mark==`, `~sub~`, `^sup^` (markdown-it plugins at
markdown-html-renderer.ts:81-87 and :95-103) but has never heard of card
fences. The card-aware round-trip dialect speaks `inkling:<card>` fences
(`createCardTransformer`, `src/nodes/cards/card-markdown-transformers.ts:45-74`)
plus standard image syntax, and sub/sup via `~`/`^`
(`CUSTOM_TEXT_FORMAT_TRANSFORMERS`, MarkdownShortcutPlugin.tsx:63-73) — but
not footnotes or `==mark==` (no such transformers in `DEFAULT_TRANSFORMERS`).

The friction: the editor's own exported markdown does not survive contact
with the editor's own paste path. Export a bookmark card and you get a
` ```inkling:bookmark ` fence with a JSON body; paste that same string back
and markdown-it renders it as `<pre><code class="language-inkling:bookmark">`,
which Lexical's HTML import turns into a **code block card** whose language
is `inkling:bookmark` (codeblock-parser.ts:41-57) — the JSON body sitting
there as code. Nothing pins this today; a future contributor "fixing" or
"breaking" it would not trip a single test. Worse, the very existence of two
importers is undocumented: `docs/markdown-api.md` and the AGENTS.md tradeoff
entry cover only the round-trip module's constrained **export** coverage (a
settled tradeoff this plan does not re-litigate), and are silent on the
import side.

Naming the dialects and pinning their coverage is cheap leverage: one module
owns the seam, the fixtures make the divergence visible, and the open
question (should paste adopt the card-aware dialect?) becomes a recorded
product decision instead of an accidental fact.

## Current-state evidence

Verified fresh against commit `d998080`:

- Paste pipeline: `PASTE_MARKDOWN_COMMAND` handler at
  `src/plugins/MarkdownPastePlugin.tsx:42-64` —
  `markdownRender(text)` (:53) → `<br>` strip unless `allowBr` (:55) →
  `sanitizeHtml(cleanedHtml, { replaceJS: true })` (:56) → fake
  `DataTransfer.setData('text/html', ...)` (:57) →
  `$insertDataTransferForRichText` (:59). Shift-held paste bypasses markdown
  entirely (`text/plain`, :50-51). The MIME constants `MIME_TEXT_PLAIN` /
  `MIME_TEXT_HTML` live at :9-10 and are imported by
  `src/plugins/behaviour/plainTextPaste.ts:5` and
  `src/plugins/behaviour/registerPasteHandler.ts:7` — plan 049 relocates
  them.
- Dispatch chain: `handlePlainTextPaste` (plainTextPaste.ts:42-48) fires
  `PASTE_MARKDOWN_COMMAND` when the clipboard has text but no HTML;
  `registerPasteHandler` falls through to `normalizePastedHtml` +
  `$generateNodesFromDOM` for real HTML (registerPasteHandler.ts:90-104).
  `MarkdownPastePlugin` is wired into `InklingComposableEditor.tsx:166` and
  is NOT on the root barrel.
- Round-trip pipeline: `markdownToLexicalState`
  (`src/markdown/round-trip.ts:83-94`) runs `$convertFromMarkdownString`
  with `TRANSFORMERS` = card transformers (:60-63, derived from
  `CARD_MARKDOWN_DECLARATIONS`) + `DEFAULT_TRANSFORMERS` (:65).
  `lexicalStateToMarkdown` (:102-110) exports with the same set. Both are
  public via `src/index.ts:82`.
- Card fence format: `createCardTransformer`
  (card-markdown-transformers.ts:45-74) emits ` ```inkling:<card> ` + JSON
  for html, file, button, audio, video, gallery, bookmark, toggle, callout;
  `MARKDOWN_CARD_TRANSFORMER` (`src/markdown/card-transformers.ts:25-42`)
  emits `inkling:markdown`. **Correction to the review evidence**: the image
  card does NOT use an `inkling:image` fence — it round-trips as standard
  `![alt](src)` (`IMAGE_CARD_TRANSFORMER`,
  card-markdown-transformers.ts:28-43). The `inkling:*` fence family is
  html/file/button/audio/video/gallery/bookmark/toggle/callout/markdown.
- What a pasted card fence becomes today: markdown-it (no `highlight`
  option) renders ` ```inkling:bookmark\n{...}\n``` ` as
  `<pre><code class="language-inkling:bookmark">…</code></pre>` with the body
  entity-escaped; `sanitizeHtml` keeps `pre`/`code`/`class` (DOMPurify
  defaults, `src/utils/sanitize-html.ts:43-47`); `CodeBlockNode.importDOM`
  (`src/nodes/base/nodes/codeblock/CodeBlockNode.ts:25-27` →
  codeblock-parser.ts:41-57) matches `pre`, reads the `language-` class
  (lowercased, :53) and `textContent` (entities decoded). Result: a
  `CodeBlockNode` with `language: 'inkling:bookmark'` and `code` = the JSON.
  `DEFAULT_NODES` registers every card wrapper including CodeBlockNode
  (`src/nodes/DefaultNodes.ts:27-42`), so this is real-editor behavior, not
  a test artifact.
- The paste dialect's engine has a second consumer: the markdown card's HTML
  export (`src/nodes/base/nodes/markdown/markdown-renderer.ts:4` imports the
  same `render`). Naming must not imply markdown-it serves paste alone.
- Existing coverage: `test/unit/plugins/MarkdownPastePlugin.test.tsx` pins
  heading conversion, shift-bypass, and `<br>` handling — its test editor
  registers only `HeadingNode` (:34-41), so the card-fence path is
  unreachable there today. `test/markdown/round-trip.test.ts` pins
  non-card round-trips; `test/markdown/round-trip-cards.test.ts` pins all 11
  card types including `inkling:bookmark` → BookmarkNode (:146).
  `test/e2e/paste-behaviour.test.ts` covers URLs, Office HTML, files — no
  markdown card-fence case.

## Scope

**In scope** (DECIDED AT GRILLING — name + pin only):

- Fixtures pinning each dialect's coverage, explicitly including what a
  pasted ` ```inkling:* ` fence produces today (current behavior, whatever
  it is).
- One module inside `src/markdown/` that names both dialects — the **paste
  dialect** and the **card-aware round-trip dialect** — and owns the seam
  between them (illustrative: `src/markdown/dialects.ts`).
- The dialect names join the docs: `docs/markdown-api.md` gains a two-
  dialects section and the merge open question; `CONTEXT.md` gains the
  glossary entry (AGENTS.md requires the glossary to track crystallized
  terms).
- Both pipeline modules cite their dialect name in their module headers.

**Out of scope**:

- Merging the dialects or changing what either one speaks — including any
  change to paste behavior for `inkling:*` fences. That merge is a product
  decision, recorded as an open question.
- The documented constrained-EXPORT tradeoff for the round-trip module
  (AGENTS.md, `docs/markdown-api.md` Limitations) — not re-litigated.
- Root-barrel (`src/index.ts`) changes; the dialect names stay internal.
  The public round-trip surface (`markdownToLexicalState` /
  `lexicalStateToMarkdown`) keeps its exact signatures.
- Plan 049's moves themselves (transformer data, MIME constants).
- The markdown card's export renderer beyond a header-note acknowledgment.

## Commands you will need

| Purpose                    | Command                                                        | Expected on success                              |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| Baseline (before Step 1)   | `pnpm test:unit`                                               | 1707 passed / 21 todo at `d998080` + 049's adds |
| Dialect fixtures           | `pnpm vitest run test/unit/plugins/MarkdownPastePlugin.test.tsx test/markdown` | green, new pins included            |
| Static + full gates        | `pnpm typecheck && pnpm lint && pnpm test:unit`                | all pass (unit builds via `pretest:unit`)        |
| Format                     | `pnpm format && pnpm format:check`                             | exits 0                                          |

No e2e: nothing demo-visible changes (the paste e2e spec asserts no
card-fence behavior today). No `pnpm verify:package` / `pnpm verify:types`:
the root barrel does not move (if it does, that is a STOP, not a gate).

## Git workflow

Decided at grilling (overrides the `advisor/NNN-<slug>` convention in
`plans/README.md`): commit DIRECTLY on `main`, no branch, no push, no PR.
Conventional commit messages.

- Commit 1: `test(markdown): pin the two markdown dialects incl. card-fence paste`
- Commit 2: `refactor(markdown): name the two markdown dialects behind one seam module`

## Steps

### Step 1: Pin both dialects' coverage

Additive fixtures only — do not touch production code, do not modify any
existing expectation, and do not import anything from the Step-2 module
(test descriptions may use the dialect names as plain strings; the fixtures
must stay green if Step 2 is later reverted).

- `test/unit/plugins/MarkdownPastePlugin.test.tsx` (paste dialect). The
  existing harness (MockDataTransfer, `pasteMarkdown`) is reused.
  - **Card fence**: paste
    ` ```inkling:bookmark\n{"url":"https://example.com","title":"Example"}\n``` `
    and pin the exact resulting node. The test editor must register
    `CodeBlockNode` (`@/nodes/CodeBlockNode`, the assembled wrapper) for
    this case — either added to `createTestEditor`'s node list (verify the
    four existing cases stay green unchanged) or in a second editor local
    to the new test (executor detail). Expected per the evidence above: a
    `$isCodeBlockNode` with `language === 'inkling:bookmark'` and `code`
    equal to the JSON string — NOT a bookmark card. If the actual result
    differs, pin the actual result and STOP per the conditions below.
  - **Dialect extras**: pin what `==marked==`, `~sub~` / `^sup^`, and a
    `[^1]` footnote produce through the paste path (markdown-it plugins →
    sanitize → Lexical HTML import). Pin the discovered node structure
    exactly (e.g. `<mark>` likely lands as highlight-formatted text;
    footnote backlink `href="#…"` does not match `sanitizeHtml`'s
    `ALLOWED_URI_REGEXP` and is likely stripped — whatever the code does
    is the pin). Record the discovered structures in the commit message.
- `test/markdown/round-trip.test.ts` (card-aware round-trip dialect):
  - `markdownToLexicalState('==marked==')` produces literal text — no
    mark/highlight transformer exists in this dialect.
  - A footnote (`'text[^1]'`) imports as literal text.
  - Do NOT re-pin card import: `round-trip-cards.test.ts:146` already pins
    `inkling:bookmark` → BookmarkNode; cite it in a comment instead.
  - Optional symmetry pin (executor detail): `~sub~`/`^sup^` DO convert in
    this dialect via `CUSTOM_TEXT_FORMAT_TRANSFORMERS`.
- Run the two fixture commands from the table; then the full unit suite.
  Pass count grows only by the new cases.

### Step 2: Name the dialects in one module; join the docs

One commit, behavior-preserving.

- Create the seam module (illustrative: `src/markdown/dialects.ts`). It
  names both dialects — the **paste dialect** and the **card-aware
  round-trip dialect** (names fixed by grilling; the module's shape —
  constants, a `MarkdownDialect` type, small descriptors — is illustrative
  and executor-refinable) and its header comment owns the facts: what each
  dialect speaks, where each pipeline lives (paste:
  `MarkdownPastePlugin.tsx` handler chain; card-aware: `round-trip.ts`),
  what a pasted `inkling:*` fence produces today (Step-1 fixture), that the
  paste dialect's markdown-it engine also serves the markdown card's HTML
  export, and the open merge question. After 049, this module is also the
  natural import surface for whatever 049 relocated into `src/markdown/`
  (MIME constants, transformer data) — wire that only if 049's layout
  makes it a pure import change.
- Cite the dialect names from both sides: header-comment references in
  `src/plugins/MarkdownPastePlugin.tsx` and `src/markdown/round-trip.ts`
  (importing the name constant where it reads naturally — executor detail;
  contrived usage just to justify the module is worse than comment-only).
  Re-export the names from the internal `@/markdown` barrel
  (`src/markdown/index.ts`) if useful; do NOT touch `src/index.ts`.
- `docs/markdown-api.md`: add a "Two markdown dialects" section naming both
  dialects, their engines, their coverage difference (footnotes/mark vs
  card fences), and the pinned card-fence-on-paste behavior with a pointer
  to the Step-1 fixture; add open question 4 — should the paste path adopt
  the card-aware round-trip dialect so pasted card fences recreate cards?
  (product decision, out of scope for this plan).
- `CONTEXT.md`: add the glossary entry for the two dialect names, following
  the existing term style (name, definition, `_Avoid_` line).
- Run: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit`. Every pre-existing expectation unchanged.

## Test plan

| Scenario                  | Command                                                         | Required invariant                          |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| Baseline                  | `pnpm test:unit` (before Step 1)                                | green at the drift-check counts             |
| Paste dialect pins        | `pnpm vitest run test/unit/plugins/MarkdownPastePlugin.test.tsx` | card fence pinned as code block (or actual) |
| Round-trip dialect pins   | `pnpm vitest run test/markdown`                                  | mark/footnote literal; card pins untouched |
| Name-only move            | `pnpm test:unit` (after Step 2)                                  | zero changed expectations vs Step 1         |
| Static gates              | `pnpm typecheck && pnpm lint && pnpm format:check`               | all clean                                   |

## Acceptance criteria

- Fixtures pin both dialects, including the exact current result of pasting
  an `inkling:*` card fence (evidence says: a code block card whose language
  is the fence tag), plus the paste-only extras (mark/sub/sup/footnote) and
  the round-trip-only gaps (literal mark/footnote).
- No pre-existing test expectation changed in any commit.
- One module in `src/markdown/` names the paste dialect and the card-aware
  round-trip dialect and owns the seam facts; both pipeline modules cite
  their dialect.
- `docs/markdown-api.md` documents the two dialects and records the merge
  as an open question; `CONTEXT.md` carries the glossary entry.
- `src/index.ts` untouched; public round-trip signatures unchanged.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit` green.

## STOP conditions

- Plan 049 has not landed, or landed differently than recorded (MIME
  constants / transformer data not where 049 put them). Do not improvise
  homes and do not execute against the pre-049 layout — report and wait for
  sequencing.
- The Step-1 card-fence fixture shows paste DOES recreate cards (or
  anything other than the evidenced code-block result) — behavior has
  already moved since `d998080`. Pin the actual behavior, revert nothing,
  and report the divergence; do not force the fixture to match this plan's
  claim. The standing red line applies throughout: never update existing
  test expectations to mask drift.
- The jsdom paste harness cannot reproduce the real editor's card-fence
  import (e.g. DataTransfer shim gaps). Substitute a narrower pin at the
  `$generateNodesFromDOM` level against an editor registering
  `CodeBlockNode`, record the substitution in the commit message — do not
  weaken the assertion to vacuity.
- Step 2 requires changing any existing test expectation, `src/index.ts`,
  or either public round-trip signature. That means the move is not
  name-only: revert the Step-2 commit, keep the Step-1 fixtures, report.
- The naming grows a merge, a config surface, or new public exports —
  scope was fixed at grilling as name + pin. Revert to the minimal seam and
  record the temptation in the commit message for the open question.

## Rollback plan

Step 1 is additive fixtures; keep them regardless — they pin real behavior
and stay green with or without Step 2 (they must not import the Step-2
module). Step 2 is a single commit: `git revert <sha>` restores the pre-
naming state, including `docs/markdown-api.md` and `CONTEXT.md`, with zero
test churn. If only the docs edits prove contentious, they can be reverted
in isolation from the same commit since the module itself is internal and
inert.
