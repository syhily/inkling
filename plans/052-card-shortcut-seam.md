# Plan 052: Collapse the card shortcuts into one seam

> **Executor instructions**: This plan puts every card shortcut (the
> horizontal-rule `---` shortcut and the code-fence ` ``` ` shortcut) behind
> one seam module that owns each shortcut's regex and replace-and-select
> implementation; the four call sites then express only their trigger (enter
> key, tab key, markdown-shortcut typing/import, per-update scan). The design
> is decided; do not redesign the seam. Pin current behavior PER TRIGGER
> FIRST — the regexes and replace bodies have drifted between triggers, and
> the drift may be deliberate. Interface names marked "illustrative" may be
> refined by the executor; the shape (one module, regexes single-sourced,
> per-trigger variants named and documented where they differ) may not. Work
> lands DIRECTLY on `main` — no branch, no push, no PR (2026-07-16 grilling
> decision, overriding the `advisor/NNN-<slug>` convention in
> `plans/README.md`).
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/plugins/HorizontalRulePlugin.tsx src/plugins/MarkdownShortcutPlugin.tsx src/plugins/EmEnDashPlugin.tsx src/plugins/AllDefaultPlugins.tsx src/plugins/behaviour/keyboard-navigation/enter.ts src/plugins/behaviour/keyboard-navigation/tab.ts src/nodes/HorizontalRuleNode.ts src/index.ts test/unit/plugins/MarkdownShortcutPlugin.test.ts test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts test/unit/plugins/EmEnDashPlugin.test.tsx test/e2e/text-transforms`
> If any in-scope file changed since this plan was written, compare the
> "Current-state evidence" section against the live code before proceeding;
> on a mismatch, treat it as a STOP condition.
>
> **Baselines at HEAD `d998080`**: `pnpm test:unit` = 206 files / 1707 passed
> / 21 todo; `pnpm vitest run test/nodes-base test/html-renderer` = 46 files
> / 730 passed / 21 todo (subset — untouched by this plan, sanity only).

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MEDIUM — typing/keyboard behavior; the enter/tab fence paths are unit-untested today, so Step 1's pins carry the plan
- **Confidence**: HIGH
- **Depends on**: —
- **Category**: architecture deepening / module depth
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

The same two card shortcuts are implemented repeatedly, at different depths,
and the copies have drifted:

- The **horizontal-rule shortcut exists twice**. `HorizontalRulePlugin.tsx:53-100`
  hand-rolls `--- → HR` inside `registerUpdateListener(() => { editor.update(...) })`
  — an ungated per-update scan that calls `editor.update()` on EVERY editor
  update, including every keystroke. Plan 006 gated exactly this pattern for
  drag-reorder and at-link (their listeners now read `dirtyElements`/
  `dirtyLeaves` — see DragDropReorderPlugin.tsx:291, AtLinkPlugin.tsx:328);
  this one remains. Meanwhile `MarkdownShortcutPlugin.tsx:18-37` already ships
  an `HR` element transformer with the byte-identical regex
  `/^(---|\*\*\*|___)\s?$/` (MarkdownShortcutPlugin.tsx:23 vs
  HorizontalRulePlugin.tsx:66). Both are live simultaneously in every shipped
  configuration (details in Current-state evidence).
- The **code-fence shortcut exists three times**. `enter.ts:105-129` and
  `tab.ts:64-87` are verbatim duplicates — same regex `/^```(\w{1,10})?/`,
  same `replace(/^```/, '')` language extraction, same
  insertAfter/remove/NodeSelection dance. `MarkdownShortcutPlugin.tsx:39-60`
  (`CODE_BLOCK`) is the third. The copies have drifted on three axes: the
  transformer regex requires trailing whitespace (`/^```(\w{1,10})?\s/`,
  MarkdownShortcutPlugin.tsx:48) while enter/tab do not; the transformer takes
  the language from the `\w{1,10}` match capture (:50) while enter/tab take
  the entire rest of the line; the transformer rewrites the paragraph via
  `parentNode.replace(...)` (:52) while enter/tab use
  `topLevelElement.insertAfter(...)` + `topLevelElement.remove()`.
- Small frictions riding along: `HorizontalRulePlugin.tsx:18` guards
  registration with `editor.hasNodes([])` — `[].every(...)` is vacuously true
  (Lexical `hasNodes`, Lexical.dev.mjs:14447-14449), so the guard never bails.
  And `EmEnDashPlugin` is rendered inside the `{/* Card Plugins */}` group of
  `AllDefaultPlugins.tsx:34-47` (at :39) although it is a text plugin.

Every one of these is the same class of friction plans 036–040 attacked:
policy that belongs behind one interface is copied at each call site, and the
copies drift. One seam module owning the regexes and the replace-and-select
implementations gives the shortcuts locality: one place to audit, one place
the per-trigger semantics are named and documented.

The trailing-whitespace divergence between the transformer and the enter/tab
paths may be deliberate — the transformer fires on the space keystroke while
typing, enter/tab fire on the key regardless of trailing space. This plan
pins behavior per trigger and only then unifies; where unification would
change WHEN a shortcut fires, per-trigger variants stay in the seam as named,
documented implementations rather than being flattened (see STOP conditions).

## Current-state evidence

Verified fresh against commit `d998080`:

- **HR hand-rolled scan**: `HorizontalRulePlugin.tsx:53-100`. The second
  `useEffect` registers `registerUpdateListener(() => { editor.update(...) })`
  with no dirty-set or tag reads at all. Body: bail when `editor.isComposing()`
  (:58), when the selection isn't a collapsed range (:62), when the top-level
  paragraph's full text doesn't match `/^(---|\*\*\*|___)\s?$/` (:66-68), and
  when the native anchor isn't a text node inside the root (:72-81). Replace
  logic (:83-97): if the paragraph has a next sibling, `parentNode.replace(line)`;
  otherwise `parentNode.insertBefore(line)` then
  `parentNode.replace($createParagraphNode())` — the last-block branch creates
  a FRESH paragraph; then `line.selectNext()`. The first `useEffect` (:17-50)
  registers `INSERT_HORIZONTAL_RULE_COMMAND` behind the vacuous
  `editor.hasNodes([])` guard (:18); that effect is insert-command plumbing,
  out of this seam's scope except the guard fix.
- **HR transformer**: `MarkdownShortcutPlugin.tsx:18-37`. Same regex (:23).
  `replace` (:24-35): `if (isImport || parentNode.getNextSibling() !== null)
  parentNode.replace(line)` else `parentNode.insertBefore(line)` — the
  last-block branch KEEPS the emptied paragraph (no fresh paragraph), and
  there is an `isImport` branch the hand-rolled path lacks. Then
  `line.selectNext()`. Carries `// TODO: Get rid of isImport flag` (:27).
- **Fence enter path**: `enter.ts:104-129` inside `registerEnterCommand`
  (registered at `COMMAND_PRIORITY_LOW`, :134). Guarded on `!isNested &&
  event`; reads `selection?.getNodes()[0]`, requires `$isTextNode`; regex
  `/^```(\w{1,10})?/` (:110); language = `textContent.replace(/^```/, '')`
  (:112) — the entire rest of the line, not the `\w{1,10}` capture; bail to
  `false` when `getTopLevelElement()` is null (:114-116); body
  `topLevelElement.insertAfter($createCodeBlockNode({ language,
  _openInEditMode: true }))` then `topLevelElement.remove()` (:117-120);
  NodeSelection on the replacement (:122-125); `return true`.
- **Fence tab path**: `tab.ts:63-87` inside `registerTabCommand`. Byte-for-byte
  the same block as enter's (regex :69, extraction :71, bail :73-75, body
  :76-79, NodeSelection :81-84). tab.ts continues into list-indent handling
  inside the same `if (!isNested && event)` block (:89-110) — out of scope.
- **Fence transformer**: `MarkdownShortcutPlugin.tsx:39-60`. Regex
  `/^```(\w{1,10})?\s/` (:48) — the trailing `\s` means it fires on the space
  keystroke after the fence, not on the fence alone.
  `test/unit/plugins/MarkdownShortcutPlugin.test.ts:123-136` pins this:
  `'does not import code fences as code blocks (fence regexp requires trailing
  whitespace)'`. Language = `match[1]` (:50); body
  `parentNode.replace(codeBlockNode)` (:52) + the same NodeSelection dance
  (:54-57).
- **Both HR mechanisms are live at once**: `InklingComposableEditor.tsx:152`
  mounts `MarkdownShortcutPlugin` (with `DEFAULT_TRANSFORMERS`, which include
  `HR` — MarkdownShortcutPlugin.tsx:75; the email editor passes
  `EMAIL_TRANSFORMERS`, which also include `HR` — :105), and
  `HorizontalRulePlugin` is mounted separately in `AllDefaultPlugins.tsx:40`
  and `EmailEditor.tsx:112`. Lexical's markdown update listener
  (LexicalMarkdown.dev.mjs:2078+) fires element transformers on its
  dirty-anchor heuristics and skips historic/collaboration tags (:2082-2085);
  it ALSO registers a `KEY_ENTER_COMMAND` handler at `COMMAND_PRIORITY_LOW`
  (:2132) — the same priority as `registerEnterCommand`, but Inkling's
  registers first (`InklingBehaviourPlugin` at InklingComposableEditor.tsx:147
  mounts before `MarkdownShortcutPlugin` at :152). So in shipped
  configurations the transformer fires first on `---` and the hand-rolled
  listener is largely shadowed; the listener remains the only path when a
  consumer mounts `HorizontalRulePlugin` with custom transformers that exclude
  `HR`. Do not delete the listener in this plan.
- **Test coverage today**: `test/unit/plugins/behaviour/
  registerKeyboardNavigation.test.ts` has exactly 50 `it(...)` cases and NONE
  cover the fence shortcut (its only `$createCodeBlockNode` use, :258, is an
  unrelated meta+enter fixture). The enter/tab fence paths have no unit
  coverage and no e2e coverage. `test/unit/plugins/MarkdownShortcutPlugin.test.ts`
  covers the transformer sets (12 cases) including the fence-whitespace pin.
  No `HorizontalRulePlugin` unit test exists. E2E: `test/e2e/text-transforms/
  horizontal-line-rule.test.ts` (typing `---` → HR), `test/e2e/text-transforms/
  code-block.test.ts` (typing ```` ```javascript ```` with trailing space →
  code block in edit mode), `test/e2e/text-transforms/markdown.test.ts:133-138`
  (paste `---` → HR), and `test/e2e/text-transforms/emdash-endash.test.ts`
  (the EmEnDash interaction below).
- **EmEnDash interaction**: `EmEnDashPlugin.tsx:29-31` skips a text node whose
  content is exactly `---` "so the HR transform can fire" (comment at :27-28
  and :96-98), gated on a registered `horizontalrule` node type (:99-101).
  Its listener is already gated the plan-006 way (`dirtyLeaves` + historic/
  history tags, :103-122) — reuse this idiom for the HR listener. Its unit
  tests (`test/unit/plugins/EmEnDashPlugin.test.tsx`) run with `nodes: []`,
  so the `---` skip path is only e2e-covered.
- **Undo hazard**: the hand-rolled HR listener has no historic-tag skip. On
  undo of an HR creation the restored `---` paragraph matches the regex, so
  the listener may re-fire and resurrect the card (Lexical's own listener
  skips historic). Characterization must record what actually happens today;
  suppressing a re-fire via gating is a deliberate fix to document in the
  commit message, not drift to mask.
- **Public surface**: `HR` and `CODE_BLOCK` are exported from
  `MarkdownShortcutPlugin.tsx:18,39` and re-exported by the barrel renamed —
  `HR_TRANSFORMER` / `CODE_BLOCK_TRANSFORMER` (src/index.ts:48,52,131,132) —
  alongside the five transformer sets (`ELEMENT_TRANSFORMERS`,
  `DEFAULT_TRANSFORMERS`, `BASIC_TRANSFORMERS`, `EMAIL_TRANSFORMERS`,
  `MINIMAL_TRANSFORMERS`, src/index.ts:130-136). The seam must keep these
  exports and their `Transformer` object shape stable; the seam module itself
  stays internal (NOT added to src/index.ts).
- **Guard fix target**: the `HorizontalRuleNode` class is exported from the
  transition shim `src/nodes/HorizontalRuleNode.ts:12`, so
  `editor.hasNodes([HorizontalRuleNode])` is available at the call site.

## Scope

**In scope**:

- A new seam module (illustrative path `src/plugins/card-shortcuts.ts`) owning:
  the divider regex (single-sourced — both HR call sites already use the
  byte-identical `/^(---|\*\*\*|___)\s?$/`), the fence regexes per trigger
  (named; the transformer's trailing-`\s` variant documented as a trigger
  constraint), and the replace-and-select implementations for both shortcuts,
  with per-trigger named variants wherever Step 1's pins show divergence.
- Migrating the four call sites: `enter.ts`, `tab.ts`, the `HR`/`CODE_BLOCK`
  transformers in `MarkdownShortcutPlugin.tsx`, and the
  `HorizontalRulePlugin.tsx` update listener. After migration each call site
  expresses only its trigger.
- Gating the HR per-update scan on dirty sets and tags, per plan 006's
  pattern and the EmEnDashPlugin idiom.
- Fixing the vacuous `editor.hasNodes([])` guard.
- Moving `EmEnDashPlugin` out of the Card Plugins group in
  `AllDefaultPlugins.tsx`, and sweeping comments that describe pre-seam
  behavior (HorizontalRulePlugin.tsx:52, EmEnDashPlugin.tsx:27-28 and :96-98).

**Out of scope**:

- Deleting the hand-rolled HR listener (public plugin; the only path when
  consumers exclude the `HR` transformer). Record a follow-up if evidence
  shows it is fully dead.
- The `INSERT_HORIZONTAL_RULE_COMMAND` effect (HorizontalRulePlugin.tsx:17-50)
  beyond the guard fix, and the `isImport` TODO (MarkdownShortcutPlugin.tsx:27)
  beyond preserving its exact behavior.
- Lexical's own markdown KEY_ENTER handler and listener heuristics
  (vendored runtime — never patched; see AGENTS.md tradeoffs).
- Other ungated update listeners (SlashCardMenuPlugin.tsx:162,
  PlusCardMenuPlugin.tsx:136, FormatToolbar.tsx:138) — card-menu/toolbar
  plugins, not shortcuts.
- The list-indent handling in tab.ts:89-110 and all other enter.ts behaviors.
- `src/markdown/` round-trip API and its documented constrained node set.

## Commands you will need

| Purpose                      | Command                                                            | Expected on success                                  |
| ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Drift check                  | see blockquote above                                               | empty diff vs `d998080` for in-scope files           |
| Characterization baseline    | `pnpm test:unit`                                                   | 1707 passed + 21 todo before Step 1                  |
| Keyboard-navigation commands | `pnpm vitest run test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` | 50 cases green; grows with Step 1 pins  |
| Transformer sets             | `pnpm vitest run test/unit/plugins/MarkdownShortcutPlugin.test.ts` | green, including the :123 whitespace pin             |
| EmEnDash                     | `pnpm vitest run test/unit/plugins/EmEnDashPlugin.test.tsx`        | green unchanged                                      |
| Shortcut e2e                 | `pnpm test:e2e:quiet test/e2e/text-transforms/`                    | HR, fence, emdash, markdown suites pass              |
| Static + full gates          | `pnpm typecheck && pnpm lint && pnpm test:unit`                    | all pass (unit builds via `pretest:unit`)            |
| Format                       | `pnpm format && pnpm format:check`                                 | exits 0                                              |
| Public-surface gates         | `pnpm verify:package && pnpm verify:types`                         | pass — public transformer objects are touched        |

## Git workflow

- Commit DIRECTLY on `main`. No branch, no push, no PR.
- Commit 1: `test(plugins): pin card-shortcut behavior per trigger`
- Commit 2: `refactor(plugins): route the code-fence shortcut through a card-shortcut seam`
- Commit 3: `refactor(plugins): route the horizontal-rule shortcut through the seam`
- Commit 4: `fix(plugins): make the HorizontalRulePlugin node guard real`
- Commit 5: `perf(plugins): gate the HR per-update scan on dirty sets and tags`
- Commit 6: `chore(plugins): recategorize EmEnDashPlugin as a text plugin`
- Conventional messages; keep each commit independently revertable.

## Steps

### Step 1: Pin current card-shortcut behavior per trigger

Before touching production code, lock current behavior. Record the
`pnpm test:unit` baseline (1707 passed + 21 todo at `d998080`) before adding
cases, and record the new count in the commit message.

- Fence via enter/tab (currently zero coverage): add cases to
  `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` using its
  existing `dispatchAndCommit` harness — or a sibling file if the harness
  doesn't mount cleanly; check how it builds editors first. Pin:
  (a) ` ```js ` + Enter on a paragraph whose text is exactly ```` ```js ````
  → code block with language `js`, selected, in edit mode, paragraph gone;
  (b) same via Tab; (c) bare ```` ``` ```` + Enter → code block with empty
  language; (d) fence with a language longer than 10 word chars → no
  transform (regex doesn't match, command returns false); (e) language
  extraction: text ```` ```js extra ```` + Enter → language is the FULL rest
  of the line (`js extra`), documenting the divergence from the
  transformer's `match[1]` capture; (f) `isNested` guard — no transform when
  nested (mirror an existing nested-guard case in the file).
- Fence via transformer: keep `MarkdownShortcutPlugin.test.ts:123-136` (the
  trailing-whitespace pin) untouched; add a typing-path case if the harness
  supports it, otherwise note that `code-block.test.ts` e2e is the pin.
- HR via hand-rolled listener: create a unit test mounting
  `HorizontalRulePlugin` the way `EmEnDashPlugin.test.tsx` mounts its plugin
  (`renderHook` + `LexicalComposerContext.Provider` + a root element), with
  `HorizontalRuleNode` registered and NO markdown transformers mounted, so
  the listener is the only path. Pin: (a) typing `---` as a whole paragraph →
  HR card; (b) the last-block branch — HR at document end produces HR + a
  paragraph after it; (c) `***` and `___` variants; (d) text that merely
  contains dashes (`a---b`) → no transform; (e) undo of the HR creation —
  RECORD what happens today (restored `---` stays, or the listener re-fires);
  this pin decides whether Step 5's historic-tag skip is a no-op or a
  deliberate fix; (f) IME guard if simulable, else note e2e-only.
- Run the full suite; everything green before Step 2.

### Step 2: Introduce the seam and route the code-fence shortcut through it

Create the seam module (path illustrative, e.g. `src/plugins/card-shortcuts.ts`):

- Own the fence regexes as named exports: the enter/tab trigger regex
  `/^```(\w{1,10})?/` and the transformer trigger regex `/^```(\w{1,10})?\s/`,
  with a module comment explaining the trigger semantics — the transformer
  fires on the space keystroke while typing; enter/tab fire on the key
  regardless of trailing space. Do NOT flatten the two regexes into one.
- Own the replace-and-select implementation. Default to ONE shared body
  (illustrative: `$insertCodeBlockForShortcut`) — construction via
  `$createCodeBlockNode({ language, _openInEditMode: true })`, paragraph
  rewrite, NodeSelection on the new node — and migrate all three call sites
  to it. The Step-1 pins decide whether `parentNode.replace(...)` and
  `insertAfter(...)` + `remove()` are net-identical here (same position,
  paragraph children dropped either way, same selection): if any pinned case
  diverges, keep TWO named implementations in the seam with the divergence
  documented in the module comment, per the STOP conditions — the seam's
  value is one audited home, not forced uniformity.
- Migrate `enter.ts:104-129` and `tab.ts:63-87` to one-liners: trigger check
  (`!isNested && event`, `$isTextNode`, regex test) then delegate. The
  verbatim duplication collapses; the `// code card shortcut` comments become
  a single pointer to the seam.
- Migrate the `CODE_BLOCK` transformer (`MarkdownShortcutPlugin.tsx:39-60`):
  keep the exported object name, its `type: 'element'`, and its regex (now
  imported from the seam); its `replace` delegates to the seam body. Keep the
  `export` function (:41-47) untouched — it is markdown-export logic, not a
  shortcut.
- The seam module must NOT be added to `src/index.ts`; `MarkdownShortcutPlugin`
  keeps exporting `HR`/`CODE_BLOCK` exactly as today.
- Verify: the keyboard-navigation file, `MarkdownShortcutPlugin.test.ts`, and
  the full unit suite — zero expectation changes from the Step-1 baseline.

### Step 3: Route the horizontal-rule shortcut through the seam

- Add the divider regex to the seam (single source) and the HR
  replace-and-select implementation. Compare the two bodies against Step-1
  pins: the transformer keeps the emptied paragraph in its last-block
  `insertBefore` branch (MarkdownShortcutPlugin.tsx:28-32) while the
  hand-rolled path creates a fresh paragraph (HorizontalRulePlugin.tsx:90-95),
  and the transformer has the `isImport` branch. If the pins show observable
  divergence (node identity, selection target, import behavior), keep named
  per-trigger variants in the seam, documented; otherwise converge on one
  body (illustrative: `$insertHorizontalRuleForShortcut(parentNode, { isImport })`).
- Migrate the `HR` transformer `replace` (:24-35) to delegate, preserving the
  `isImport`/`getNextSibling` branch structure exactly; keep the exported
  object and its `export` function untouched.
- Migrate the listener body in `HorizontalRulePlugin.tsx:53-100` to delegate:
  the effect keeps only its trigger checks (composing, collapsed range,
  regex, native-anchor containment) and calls the seam. Gating comes in Step
  5 — this commit must be behavior-identical.
- Update the EmEnDash `---`-skip comments (EmEnDashPlugin.tsx:27-28, :96-98)
  to name the seam's HR shortcut instead of "the HR transform". No logic
  change there.
- Verify: HR unit pins from Step 1, `MarkdownShortcutPlugin.test.ts`,
  `EmEnDashPlugin.test.tsx`, full unit suite — zero expectation changes.

### Step 4: Make the HorizontalRulePlugin node guard real

Replace the vacuous `editor.hasNodes([])` at `HorizontalRulePlugin.tsx:18`
with `editor.hasNodes([HorizontalRuleNode])`, importing the class from
`@/nodes/HorizontalRuleNode` (exported at src/nodes/HorizontalRuleNode.ts:12).
This changes behavior only for consumers who mount the plugin without
registering the node — today the guard never bails and such a consumer hits a
runtime error on `---` anyway. Apply the same guard to the update-listener
effect so both registrations respect it (executor detail: one early return
covering both effects, or per-effect guards — keep it simple). Full unit
suite green; no expectation changes anticipated.

### Step 5: Gate the HR per-update scan on dirty sets and tags

Apply plan 006's pattern, in the idiom already used by
`EmEnDashPlugin.tsx:103-122`:

- Destructure `{ dirtyLeaves, dirtyElements, tags }` from the update payload.
  Skip when `tags` has `historic`/`history-push`/`history-merge` (undo/redo
  and coalesced entries), and skip when both dirty sets are empty
  (selection-only updates cannot have produced a matching paragraph).
- The transform must still fire on the keystroke that completes `---` (that
  update dirties the text leaf), and on composition end — keep the existing
  `editor.isComposing()` bail; verify the composition-end update carries
  dirty leaves (it does for committed text; if a corner case surfaces, the
  e2e and Step-1 pins catch it).
- If the Step-1 undo pin showed the listener re-firing on undo, this commit
  fixes it: update that ONE pin with the corrected expectation and put the
  before/after evidence in the commit message. Any other expectation change
  is drift — STOP per the conditions below.
- Verify: Step-1 HR pins, EmEnDash suite, full unit suite, and
  `pnpm test:e2e:quiet test/e2e/text-transforms/`.

### Step 6: Recategorize EmEnDashPlugin; run full gates

- In `AllDefaultPlugins.tsx`, move `<EmEnDashPlugin />` (:39) out of the
  `{/* Card Plugins */}` group (:34) into the Inkling/text-plugin group above
  (:28-33, alongside `EmojiPickerPlugin`/`AtLinkPlugin`). Render-order
  caution: plugin order affects update-listener registration order. Check the
  new position keeps `EmEnDashPlugin` before `HorizontalRulePlugin` (it
  stays before — the card group renders after) so the `---` skip keeps its
  current race semantics; if any Step-1 pin or text-transforms e2e shifts,
  revert the move and report rather than re-ordering further. `EmailEditor.tsx`
  already lists it outside any card grouping (:110) — leave it.
- If the seam crystallized the term, add a `CONTEXT.md` glossary entry for
  the card shortcut (one trigger-agnostic definition naming the seam module)
  in this commit or the Step-2 commit — executor judgment, keep it to a few
  lines in the existing format.
- Run: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit`, `pnpm test:e2e:quiet test/e2e/text-transforms/`,
  `pnpm verify:package`, `pnpm verify:types`. The verify gates matter here:
  the barrel re-exports `HR_TRANSFORMER`/`CODE_BLOCK_TRANSFORMER` and the
  transformer sets (src/index.ts:48,52,130-136), and those objects were
  touched.

## Test plan

| Scenario                        | Command                                                            | Required invariant                                      |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Baseline                        | `pnpm test:unit`                                                   | 1707 passed + 21 todo at `d998080` before Step 1        |
| Fence pins (enter/tab)          | `pnpm vitest run test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` | new pins green; pre-existing 50 cases unchanged |
| Transformer sets                | `pnpm vitest run test/unit/plugins/MarkdownShortcutPlugin.test.ts` | green; the :123 trailing-whitespace pin untouched        |
| HR listener pins                | new unit file from Step 1                                          | green; only the recorded undo pin may change, in Step 5 |
| EmEnDash                        | `pnpm vitest run test/unit/plugins/EmEnDashPlugin.test.tsx`        | green unchanged                                          |
| Shortcut e2e                    | `pnpm test:e2e:quiet test/e2e/text-transforms/`                    | HR, code-block, emdash, markdown suites pass             |
| Static + full gates             | `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm format:check` | all pass                                             |
| Public surface                  | `pnpm verify:package && pnpm verify:types`                         | pass                                                     |

## Acceptance criteria

- One seam module owns both shortcuts' regexes and replace-and-select
  implementations; `enter.ts`, `tab.ts`, the `HR`/`CODE_BLOCK` transformers,
  and the `HorizontalRulePlugin` listener each express only their trigger.
- The fence regex pair is single-sourced in the seam; the trailing-`\s`
  divergence is documented there as a per-trigger constraint, not flattened.
- Where Step-1 pins showed replace-body divergence, the seam carries named
  per-trigger implementations with the reason in the module comment; where
  they showed equivalence, one shared body.
- The HR update listener reads dirty sets and tags; every observable behavior
  is unchanged except the recorded undo fix (if Step 1 proved the re-fire),
  which carries before/after evidence in its commit message.
- `editor.hasNodes([])` is gone; the guard checks `HorizontalRuleNode`.
- `EmEnDashPlugin` sits in the text-plugin group of `AllDefaultPlugins.tsx`;
  comments referencing the pre-seam "HR transform" name the seam.
- `MarkdownShortcutPlugin` still exports `HR`, `CODE_BLOCK`, and the five
  transformer sets with unchanged object shapes; the seam is not in the
  barrel; `pnpm verify:package` and `pnpm verify:types` pass.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`, and
  `pnpm test:e2e:quiet test/e2e/text-transforms/` green.

## STOP conditions

Stop, revert the offending commit, and report — do not push through — if:

- Any Step-1 pin fails after a migration commit. Never update test
  expectations to make a migration pass (standing red line); the one
  sanctioned exception is the Step-5 undo pin with recorded evidence.
- Unifying the fence replace bodies changes WHEN the fence fires, the
  extracted language, or leftover paragraph text for any trigger. Keep
  per-trigger named implementations in the seam, document the divergence in
  the module comment, and move on — partial unification is acceptable,
  behavior change is not.
- Same for the HR bodies: the fresh-paragraph vs emptied-paragraph last-block
  branches or the `isImport` branch cannot be converged without moving a
  pinned behavior. Named variants, documented, done.
- Dirty-set gating breaks the typing-`---` path or any Step-1 pin twice after
  honest attempts — the gate condition is wrong; report which update shape
  was missed (plan 006's precedent: report measurements rather than ship a
  behavior change).
- Evidence shows the hand-rolled HR listener is fully shadowed in every
  shipped configuration. Do NOT delete it in this plan (public plugin,
  consumer-configurable transformers); record the finding as a follow-up
  candidate and finish the gating.
- `pnpm verify:package` or `pnpm verify:types` fails, or keeping the public
  transformer objects stable forces the seam module into `src/index.ts`.
  Keep the public surface exactly as-is; the seam is internal.
- The EmEnDash move shifts any pin or e2e — render order is load-bearing
  here; revert the move and report instead of hunting for a "safe" slot.

## Rollback plan

Each step is its own commit on `main`; revert the offending commit alone
(`git revert <sha>`) and keep Step 1's characterization tests — they are the
evidence for the next attempt and pass against un-migrated code. If the seam
module itself (Step 2) proves unsound, revert Steps 2–5 as a set; Step 1's
pins and Step 6's e2e runs remain valid. Steps 4, 5, and 6 are independent of
the seam and of each other: any of them can be cherry-reverted without
touching the rest, and Step 5's undo fix (if taken) can ship alone by
reverting only the seam commits.
