# Plan 053: Split the at-link module at its node/session seam

> **Executor instructions**: This plan splits `src/plugins/AtLinkPlugin.tsx`
> (653 lines, four concerns) at its natural seam: a headless **node-lifecycle
> module** (insertion, shape transform, command guards) versus the React
> **search session** (query/focused-node state, update listener, popup). The
> design is decided; do not redesign the seam. Characterize FIRST — both
> insertion paths are today covered only by e2e, and the ZWNJ + search-node +
> selection-normalization dance is subtle. Every migration commit must keep
> the pinned editor states identical; the one deliberate change is the
> missing dependency array on the guard-command effect, which this plan
> absorbs. Interface names marked "illustrative" may be refined by the
> executor; the shape (one headless module, one shared `$insertAtLink`,
> detection-only native fallback, session stays React) may not.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/plugins/AtLinkPlugin.tsx src/plugins/behaviour test/unit/plugins/AtLinkPlugin.test.tsx test/e2e/linking.test.ts test/e2e/cards/bookmark-card-with-search.test.ts src/hooks/useSearchLinks.ts src/components/ui/AtLinkResultsPopup.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current-state evidence" section against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.
>
> **Test baseline at `d998080`** (re-run and confirm parity before Step 1;
> a mismatch is a STOP condition): `pnpm test:unit` = 206 files / 1707
> passed / 21 todo; `pnpm vitest run test/nodes-base test/html-renderer` =
> 46 files / 730 passed / 21 todo. New pins may only ADD to these numbers —
> existing expectations never change.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MEDIUM — editor-live insertion logic with e2e-only coverage today; mitigated by new headless pins landed before any move
- **Confidence**: HIGH
- **Depends on**: —
- **Category**: architecture deepening
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

`src/plugins/AtLinkPlugin.tsx` is the hottest non-keyboard plugin file (6
touches in the last 200 commits, verified at `d998080`) and mixes four
concerns in one module:

1. **Node lifecycle** (headless): `$removeAtLink` (:~40), `$shouldConvertAtLink`
   (:~59), `$insertAtLink` (:~117), the `AtLinkNode` shape transform (:~508).
2. **Insertion commands**: a `CONTROLLED_TEXT_INSERTION_COMMAND` handler
   (:~194) plus a near-verbatim native `input` listener fallback (:~217).
3. **Search session**: `focusedAtLinkNode` state with a ref mirror (:~179-186),
   `query` state (:~187), the update listener that tracks focus, extracts the
   query, and normalizes the selection (:~327-412).
4. **Popup rendering**: `Portal` + `AtLinkResultsPopup` (:~615-631) behind the
   gating wrapper (:~635-651).

The duplication is the sharpest symptom: the @-insertion logic exists twice —
`$shouldConvertAtLink`/`$insertAtLink` for the controlled command, and an
inline copy inside the native `input` listener with the same after-regex, the
same ZWNJ + search-node construction, and the same selection normalization.
Two copies of a subtle selection dance drift. Worse, the guard-command effect
(:~416-505) has **no dependency array**: five `COMMAND_PRIORITY_HIGH` handlers
(escape, backspace, format ×2, paste) tear down and re-register on every
render — and this plugin re-renders on every query keystroke, so handler
registration churns exactly while the popup is open. That is plan 038's
"listeners read fresh state, register once" lesson still unapplied here.

The module is also shallow in the wrong place: everything a headless test
could pin (insert, revert, transform) is locked inside a React function
body, so the only characterization net today is the e2e suite. Splitting the
node lifecycle into a `src/plugins/behaviour/`-style headless module gives
the insertion logic locality with its tests, collapses the duplicate, and
leaves the React side as exactly what it is — a search session with a popup.

Plan 006 gated this plugin's per-keystroke full-tree scan
(`focusedAtLinkNodeRef.current` + empty-dirty-set early return at :~334-341).
That gating is load-bearing and must survive the split verbatim.

## Current-state evidence

Verified fresh against commit `d998080`:

- File is exactly 653 lines. The four concerns are interleaved as listed
  above; all node-lifecycle functions are module-private, so nothing outside
  this file references them (verified by grep: `$insertAtLink`,
  `$shouldConvertAtLink`, `$removeAtLink` appear only in
  `src/plugins/AtLinkPlugin.tsx`).
- The controlled path (:~194-213) intercepts `CONTROLLED_TEXT_INSERTION_COMMAND`
  **before** DOM insertion: skips when `editor.isComposing()`, requires
  `inputType === 'insertText'` and `data === '@'` (string payloads map to
  `insertText`), then returns `$insertAtLink()`.
- `$shouldConvertAtLink` (:~59-115) handles both element anchors (empty
  paragraph — the common e2e path) and text anchors with `isSimpleText()`,
  adjusting before/after text across sibling text nodes at offsets 0 and
  end. Before-check: `textBeforeAnchor === '' || /\s$/.test(textBeforeAnchor)`;
  after-check: `/^($|\s|\.)/`.
- `$insertAtLink` (:~117-160) captures the anchor text node's format into
  `linkFormat`, builds `AtLinkNode` + ZWNJ child + `AtLinkSearchNode('')`,
  inserts via `insertBefore`/`append` for element anchors or
  `selection.insertNodes` for text anchors, then forces anchor/focus to the
  search node at offset 0 after `atLinkNode.select(1, 1)`.
- The native fallback (:~217-321) runs **after** the browser inserted the
  '@'. Its read phase (:~231-271) requires a collapsed **text** anchor (no
  element-anchor branch — post-insertion selection is always text),
  `isSimpleText()`, the same sibling adjustment, and before-regex
  `/(^|\s)@$/` — deliberately including the just-inserted '@' — plus the
  identical after-regex `/^($|\s|\.)/`. Its update phase (:~274-311)
  re-reads the selection, captures `linkFormat`, deletes the '@'
  (`selection.deleteCharacter(true)`, :~289), then repeats the ZWNJ +
  search-node construction and selection normalization verbatim. It checks
  `event.isComposing` (:~224), mirroring the controlled path's
  `editor.isComposing()` guard.
  **Correction to the review evidence**: the two paths do not have "the same
  before/after regexes" — only the after-regex is shared; the before-check
  differs by design (post-insertion vs pre-insertion). Also, the
  no-dependency-array effect at :~416-505 is the **fourth** of five
  `useEffect`s in the file (controlled :~194, native :~217, update listener
  :~327, guards :~416, transform :~508), not the fifth; the substantive
  claim (no dep array, five handlers) is correct.
- Mutual exclusion: when the controlled handler consumes the event (returns
  `true`), Lexical cancels DOM insertion, so no `input` event fires; the
  native listener only runs when Lexical let the browser insert text without
  dispatching the command (comment at :~215-216). Both paths must remain
  registered at their current points.
- The guard effect (:~416-505) registers `KEY_ESCAPE_COMMAND` (revert to
  '@' text with focus), `DELETE_CHARACTER_COMMAND` (revert at search-node
  boundaries), `FORMAT_TEXT_COMMAND`/`FORMAT_ELEMENT_COMMAND` (swallow via
  `$skipFormatCommandIfNeeded`), and `PASTE_COMMAND` (append plain text into
  the search node). None of the five handlers captures React state or props —
  they read only the selection and `editor.getRootElement()` (:~478) — so
  registering once per editor is semantically identical minus the churn.
- The paste guard's `document.activeElement !== editor.getRootElement()`
  check (:~478) is pinned by e2e: `test/e2e/cards/bookmark-card-with-search.test.ts:373-385`
  ("can paste into URL input") exists because this handler once hijacked
  pastes inside card input fields.
- The update listener (:~327-412) opens with plan 006's gate (:~334-341):
  skip unless `focusedAtLinkNodeRef.current` is set or dirty sets are
  non-empty. The body scans `$nodesOfType(AtLinkNode)`, removes at-links
  without focus, extracts the query from `getChildAtIndex(1)`, normalizes a
  ZWNJ-anchored selection into the search node (:~387-394, reading
  `window.getSelection()?.anchorOffset === 0`), and reverts an emptied
  search node on backspace (:~397-399).
- The `AtLinkNode` shape transform (:~508-553) enforces ZWNJ-first-child,
  search-node-second, replaces non-search children, and consolidates
  multiple search nodes. Do **not** confuse it with
  `registerRemoveAtLinkNodesTransform`
  (`src/transforms/transforms/remove-at-link-nodes.ts:31`), a different
  transform registered on the **render** editor
  (`src/html/renderer/LexicalHTMLRenderer.ts:58`) that deletes at-link nodes
  during export. They run on different editors with opposite goals; this
  plan does not touch the render-side transform, and the two must not be
  unified.
- Existing coverage map (the characterization gap):
  - `test/nodes-base/nodes/at-link.test.ts` / `at-link-search.test.ts` — node
    classes only (clone, JSON, DOM, `exportDOM`); headless already.
  - `test/transforms/transforms/remove-at-link-nodes.test.ts` — the
    render-side transform above, not the plugin's.
  - `test/unit/plugins/AtLinkPlugin.test.tsx` (83 lines, 3 tests) — renders
    null without `searchLinks`, a node-narrowing smoke test, props accepted.
    No behavior pins. It mounts `InklingAtLinkPlugin` with a real
    `createEditor` from `lexical` and a mocked `useLexicalComposerContext` —
    the harness pattern Step 1 extends.
  - e2e `test/e2e/linking.test.ts` describe `with @-link` (:~31-272, 7
    tests): default-links display, search, no-result + Enter, Enter without
    selection keeps typed text (pins commit `5dbd19d`), backspace removal,
    bookmark creation on an empty line, paste into the search node. These
    are the ONLY pins for `$insertAtLink`, `$removeAtLink`, the shape
    transform, and the guards.
- `AtLinkPlugin` is not exported from `src/index.ts` (verified: no
  `AtLink`/`at-link` matches in the barrel); it reaches consumers only via
  `src/plugins/AllDefaultPlugins.tsx:33`. No public surface moves in this
  plan, so `pnpm verify:package` / `pnpm verify:types` are not required.
- jsdom is 29.1.1, vitest 4.1.9, environment jsdom globally
  (`vitest.config.ts:19`); `InputEvent` with `data` and `inputType` is
  constructible in this jsdom generation (needed for the native-path pins).
  `test/unit/**` is inside the vitest `include` set (`vitest.config.ts:22`).
- `src/plugins/behaviour/` is the established home for headless
  register-once editor modules (`registerClickAndCut.ts`,
  `registerCardCommands.ts`, …, consumed by `InklingBehaviourPlugin.tsx`),
  with tests in `test/unit/plugins/behaviour/`. Behaviour modules import
  `mergeRegister` from `@lexical/utils` (registerClickAndCut.ts:3); the
  plugin currently imports it from `lexical` (:~5) — match the destination
  directory's idiom when moving.

## Scope

**In scope**:

- Characterization pins for both insertion paths and the node lifecycle,
  landed before any production change (new file, illustrative path
  `test/unit/plugins/behaviour/at-link.test.ts`).
- A new headless module (illustrative path `src/plugins/behaviour/at-link.ts`)
  owning `$removeAtLink`, `$shouldConvertAtLink`, `$insertAtLink`, the
  insertion registrations, the shape transform, and the command guards —
  exposed as `register*` functions `(editor) => unregister` in the
  `src/plugins/behaviour/` idiom, with the pure `$`-prefixed helpers exported
  for direct pinning.
- Collapsing the native fallback to detection-only + shared `$insertAtLink`.
- The dependency-array fix for the guard effect, absorbed by registering
  guards once per editor.
- `src/plugins/AtLinkPlugin.tsx` slimmed to the search session: state + ref
  mirror, update listener (with plan 006's gate intact as its first check),
  `onItemSelect`, popup render, and the gating wrapper — consuming the
  lifecycle module. The file keeps its path and both exports
  (`InklingAtLinkPlugin` named, `AtLinkPlugin` default); the existing test
  imports (`@/plugins/AtLinkPlugin`) keep working.

**Out of scope**:

- `src/hooks/useSearchLinks.ts`, `src/components/ui/AtLinkResultsPopup.tsx`,
  `KeyboardSelectionWithGroups.tsx` — the search/popup implementation is
  untouched.
- `onItemSelect`'s link/bookmark creation and analytics (`trackEvent`,
  `isInternalUrl`) — session concerns; they stay in the plugin.
- `src/transforms/transforms/remove-at-link-nodes.ts` and the render-side
  transform (different editor, opposite goal — do not unify).
- Node classes `AtLinkNode` / `AtLinkSearchNode` / `ZWNJNode`.
- Any change to e2e specs, demo wiring, or the public barrel.
- The latent limitation that the native listener only attaches if
  `editor.getRootElement()` is non-null at effect time (:~218-221). Preserve
  current attach semantics exactly; record, do not fix.

## Commands you will need

| Purpose                    | Command                                                                                         | Expected on success                       |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Pin file only              | `pnpm vitest run test/unit/plugins/behaviour/at-link.test.ts`                                   | green                                     |
| Existing plugin tests      | `pnpm vitest run test/unit/plugins/AtLinkPlugin.test.tsx`                                       | green, untouched expectations             |
| At-link e2e net            | `pnpm test:e2e:quiet test/e2e/linking.test.ts test/e2e/cards/bookmark-card-with-search.test.ts` | pass (dev server on 5174 is auto-started) |
| Static + full gates        | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit`                            | all pass (unit builds via `pretest:unit`) |
| Render-layer drift (cheap) | `pnpm vitest run test/nodes-base test/html-renderer`                                            | 730 passed + 21 todo, unchanged           |

## Git workflow

- Work commits **directly on `main`** — no branches, no push, no PRs. This
  overrides the `advisor/NNN-<slug>` branch convention in `plans/README.md`.
- Commit 1: `test(at-link): pin both insertion paths and the node lifecycle before the split`
- Commit 2: `refactor(at-link): extract the headless node-lifecycle module`
- Commit 3: `refactor(at-link): collapse the native-input fallback to detection-only`
- Conventional messages; keep each commit's diff limited to its step.

## Steps

### Step 1: Pin both insertion paths and the node lifecycle

Before touching production code, lock current behavior. Create
`test/unit/plugins/behaviour/at-link.test.ts` (illustrative path). The pins
are black-box: they mount the real `InklingAtLinkPlugin` (harness pattern
from `test/unit/plugins/AtLinkPlugin.test.tsx` — `createEditor` from
`lexical` with `[AtLinkNode, AtLinkSearchNode]`, mocked
`useLexicalComposerContext`, `renderHook`, `act`, the `updateEditor`
promise helper) and drive it through dispatched commands and DOM events, so
the SAME file keeps passing unchanged after the split. Set a root element
(`editor.setRootElement(document.createElement('div'))` inside `act`) so the
native listener attaches; pass `searchLinks: vi.fn().mockResolvedValue([])`.

- **Controlled-path matrix** — set a collapsed selection in
  `editor.update`, then `editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND,
'@')` and pin the resulting `editor.getEditorState().toJSON()`:
  (a) empty paragraph (element anchor) → at-link with ZWNJ + empty search
  node, selection inside the search node at offset 0;
  (b) `'hello '` with caret at end → converts;
  (c) `'hello'` with caret at end (no trailing whitespace) → does NOT
  convert (handler returns false, state unchanged);
  (d) caret immediately before a `'.'` text sibling → converts (after-regex
  allows `.`);
  (e) caret at offset 0 of a text node whose previous text sibling ends in
  whitespace → converts (sibling adjustment);
  (f) bold-formatted anchor text → converts and
  `atLinkNode.getLinkFormat()` equals the bold format bit;
  (g) non-collapsed selection → no-op.
- **Native-path matrix** — build the post-insertion state directly (text
  with `'@'` already inserted, collapsed text selection right after it),
  then dispatch `new InputEvent('input', { inputType: 'insertText', data: '@' })`
  on the root element. Pin cases (b), (c), (d), (e) from above.
  **Convergence pin**: for each shared case, the native path's resulting
  state JSON must equal the controlled path's state JSON for the same
  pre-insert context. This pin is what Step 3 leans on.
- **Removal pins** — from a converted state with the selection in the search
  node: `KEY_ESCAPE_COMMAND` reverts to text `'@' + query` carrying the
  original format with the caret at its end; `DELETE_CHARACTER_COMMAND`
  (backward, offset 0) reverts to `'@'`; a `FORMAT_TEXT_COMMAND` dispatch is
  swallowed (search node text unchanged).
- **Transform pins** — with the plugin mounted, build invalid at-link trees
  in an update and assert normalization: missing ZWNJ first child → inserted;
  a non-search child with text → replaced by a search node; two search nodes
  → consolidated into one with concatenated text. (These pin :~508-553.)
- **Session pins** — selection moved outside the at-link → the at-link is
  removed (this is the behavior plan 006's gate preserves); ZWNJ-anchored
  selection is normalized into the search node.
- If jsdom refuses to construct `InputEvent` with `data`/`inputType`, that
  is a STOP condition — both insertion paths must be pinned before anything
  moves; do not pin by invoking listener internals directly.
- Paste-into-search-node is e2e-covered (`linking.test.ts:253`); add a unit
  pin only if jsdom's `ClipboardEvent` supports `clipboardData` — otherwise
  record the gap in the test file comment and rely on e2e.
- Record in the commit message: the new test count, and the green e2e run of
  `pnpm test:e2e:quiet test/e2e/linking.test.ts test/e2e/cards/bookmark-card-with-search.test.ts`
  as the pre-split baseline.

### Step 2: Extract the headless node-lifecycle module

One commit, pure move plus the dependency-array fix:

- Create `src/plugins/behaviour/at-link.ts` (illustrative path) and move,
  **verbatim**: `$removeAtLink`, `$shouldConvertAtLink`, `$insertAtLink`, the
  controlled-insertion handler, the native `input` listener (both phases,
  still self-contained — the collapse is Step 3), the `AtLinkNode` shape
  transform, and the five guard commands. Expose them in the
  `src/plugins/behaviour/` idiom: pure `$`-prefixed helpers exported, plus
  `register*` functions `(editor) => unregister` (illustrative:
  `registerAtLinkInsertion`, `registerAtLinkNodeTransform`,
  `registerAtLinkGuards`; one combined `registerAtLinkNodeLifecycle` is also
  acceptable — executor detail, the seam's shape is not).
- The native listener keeps its current attach semantics (early return when
  `editor.getRootElement()` is null at registration time) and its
  composition guard. Keep registration points and priorities
  (`COMMAND_PRIORITY_HIGH`) exactly as today.
- `src/plugins/AtLinkPlugin.tsx` consumes the module: the three registration
  effects become `React.useEffect(() => register…(editor), [editor])`; the
  update listener and `onItemSelect` import `$removeAtLink` (and the `$is*`
  guards they already use) from the module. The plan-006 gate stays the
  first statement of the update listener, verbatim.
- **The deliberate change rides along here**: the guards, which capture no
  React state (verified in Current-state evidence), now register once per
  editor instead of on every render. Record this in the commit message as
  the intentional behavioral delta (registration timing only; handler logic
  untouched).
- Match the destination directory's import idiom (`mergeRegister` from
  `@lexical/utils`).
- Proof: every Step-1 pin green **unchanged**; `test/unit/plugins/AtLinkPlugin.test.tsx`
  green unchanged (it imports both plugin exports from the same path); the
  two e2e specs pass.

### Step 3: Collapse the native-input fallback to detection-only

- Split the native listener's read phase into an exported pure predicate
  (illustrative: `$shouldConvertInsertedAt()`): collapsed range selection,
  text anchor, `isSimpleText()`, sibling adjustment, `/(^|\s)@$/` +
  `/^($|\s|\.)/` — moved verbatim.
- The listener's update phase becomes: re-read the selection, delete the
  '@' via `selection.deleteCharacter(true)`, then call the shared
  `$insertAtLink()`. Post-deletion state equals the pre-insertion state, so
  `$insertAtLink`'s internal `$shouldConvertAtLink()` re-check passes; keep
  the double check — it keeps `$insertAtLink` total and is cheap. Delete the
  duplicated ZWNJ/search-node construction and selection normalization from
  the listener.
- Document the deliberate asymmetries in the module header comment (this is
  the "document why, don't flatten" record):
  1. the native before-regex includes the literal `@` because it runs
     post-insertion; the controlled check runs pre-insertion and must not
     see one;
  2. the native predicate accepts only text anchors — post-insertion
     selection is always text; the element-anchor branch exists only in the
     pre-insertion path (empty paragraph);
  3. both paths skip during composition (`event.isComposing` /
     `editor.isComposing()`) — identical IME safety, kept at their own
     layers;
  4. the paths are mutually exclusive in practice (a consumed controlled
     command prevents DOM insertion, so no `input` event fires) — the
     listener is fallback-only and both registrations stay.
- Final plugin shape: `AtLinkPlugin.tsx` holds only the search session
  (state + ref mirror, gated update listener, `useSearchLinks`,
  `onItemSelect`, popup, gating wrapper) and imports the lifecycle module.
  Tidy the plugin's module comment to describe the session role.
- Proof: the Step-1 convergence pins pass unchanged — both paths now
  literally share `$insertAtLink`, and the state-JSON equality assertions
  are the evidence. Full gates: `pnpm format`, `pnpm format:check`,
  `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, plus the two e2e specs.

## Test plan

| Scenario               | Command                                                              | Required invariant                                 |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Characterization pins  | `pnpm vitest run test/unit/plugins/behaviour/at-link.test.ts`        | green against the un-split plugin                  |
| Convergence matrix     | same file                                                            | native vs controlled state JSON identical per case |
| Existing plugin tests  | `pnpm vitest run test/unit/plugins/AtLinkPlugin.test.tsx`            | green, zero expectation edits                      |
| Shape transform pins   | same new file                                                        | ZWNJ/search-node normalization identical post-move |
| Removal/guard pins     | same new file                                                        | escape/backspace revert, format swallowed          |
| Plan-006 gate behavior | e2e `linking.test.ts` (removal on backspace/blur)                    | pass; gate stays first in the listener             |
| Paste guard regression | e2e `bookmark-card-with-search.test.ts` ("can paste into URL input") | pass                                               |
| Render-layer drift     | `pnpm vitest run test/nodes-base test/html-renderer`                 | 730 passed + 21 todo, unchanged                    |
| Full gates             | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit` | pass; unit = 1707 + new pins passed, 21 todo       |

## Acceptance criteria

- `src/plugins/AtLinkPlugin.tsx` contains only the search session and popup;
  all insertion, transform, and guard logic lives in the headless module and
  is imported by the plugin. The file keeps its path and both exports.
- Exactly one `$insertAtLink` implementation exists; the native `input`
  listener is detection-only (`$shouldConvertInsertedAt`-style predicate) +
  delete + shared insert. The module comment records the four deliberate
  asymmetries.
- The guard commands register once per editor; the commit message records
  this as the one intentional behavioral delta.
- Plan 006's gating condition (`focusedAtLinkNodeRef.current` + empty dirty
  sets) is verbatim the first check of the update listener.
- New headless pins cover both insertion paths and the lifecycle; the
  convergence matrix asserts state-JSON equality. No pre-existing test
  expectation changed anywhere.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`
  green; the two at-link e2e specs pass. Baselines only grew.

## STOP conditions

- Any drift-check file changed since `d998080`, or the recorded test
  baselines (1707 + 21 todo; 730 + 21 todo) do not reproduce at execution
  start. Reconcile the evidence section against live code before proceeding;
  do not plan around stale line numbers.
- jsdom cannot construct a dispatchable `InputEvent` carrying
  `data`/`inputType`. Both insertion paths must be pinned before the split —
  stop and report rather than pinning listener internals directly or moving
  code unpinned.
- Any Step-1 pin fails against the un-split code. The pins are wrong about
  current behavior — fix the pins, never the production code, in Step 1.
- Any pre-existing test expectation needs editing in Steps 2-3 (the standing
  red line: never update expectations to mask drift). Revert the offending
  commit, keep the pins, reassess the move.
- The convergence matrix shows differing state JSON between the two paths
  for the same context, and the difference is not fully explained by the
  documented post-insertion asymmetries (e.g. `deleteCharacter` merging text
  nodes differently than the pre-insertion layout). Keep Step 2's
  verbatim-both-paths extraction as the landing, document the divergence in
  the module comment, and report — do not flatten a real difference.
- Preserving the plan-006 gate verbatim conflicts with the extraction (e.g.
  the ref-mirror pattern cannot survive the session staying React). Stop and
  report; the gate is not negotiable.
- Coverage thresholds (`vitest.config.ts:36`) fail after the move. Add pins
  to the new module — never loosen thresholds.

## Rollback plan

Each step is its own commit; revert the offending commit alone
(`git revert <sha>`). Step 1's pins are black-box through the mounted plugin
and remain valid against un-split code, so they are the evidence for the
next attempt in every rollback scenario. If Step 3's collapse proves
unsound, revert it alone — Step 2's verbatim extraction (with the
dependency-array fix) stands on its own and is already an improvement. If
Step 2 itself is unsound, revert to the pre-Step-2 commit; the pins keep the
at-link behavior characterized for a retry. Nothing in this plan touches the
public barrel, node classes, or e2e specs, so no downstream cleanup is ever
needed beyond the reverts.
