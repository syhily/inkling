# Plan 054: Latent-fix batch from the 2026-07-16 review

> **Executor instructions**: This is a batch of five small, independent bug
> fixes surfaced by the 2026-07-16 architecture review. Each step is its own
> commit with its own pin; the steps do not depend on each other and may land
> in any order, but land them in the written order for traceability with the
> review. Two steps (1 and 5) carry an investigation preface — the evidence
> below is pre-verified, so the investigation is a confirmation pass, not a
> redesign. Do not expand any fix beyond what the step specifies; the rejected
> wider alternatives are recorded so they are not re-litigated.
>
> **Drift check (run first)**: at HEAD `d998080` the baseline is
> `pnpm test:unit` = 206 files / **1707 passed / 21 todo** and
> `pnpm vitest run test/nodes-base test/html-renderer` = 46 files /
> **730 passed / 21 todo** (carried from plan 040's acceptance record;
> `d998080` is a docs-only commit on top of it). This batch touches no
> renderer, so the nodes-base/html-renderer numbers must stay exact. The
> test:unit total changes deliberately per step (recorded per step below).
> Also run
> `git diff --stat d998080..HEAD -- src/components/InklingCardWrapper.tsx src/plugins/InklingBehaviourPlugin.tsx src/plugins/behaviour/registerMouseEvents.ts src/plugins/behaviour/keyboard-navigation/escape.ts src/utils/ctrlOrCmd.ts src/context/InklingSelectedCardContext.tsx test/unit/utils/ctrlOrCmd.test.ts test/unit/components/InklingCardWrapper.test.tsx test/unit/plugins/InklingBehaviourPlugin.test.ts test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts`
> to confirm no sibling plan has moved the target files.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW — five scoped fixes, each pinned; the widest diff touches four files
- **Confidence**: HIGH — every claim below verified fresh against `d998080`
- **Depends on**: —
- **Category**: latent bug fixes (review follow-ups)
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

The 2026-07-16 review surfaced a set of small defects that share a shape: each
is a shallow module leaking a stale or dead implementation detail — a state
sync that writes a variable to itself, a fallback selector that matches
nothing, a command that claims it handled input it ignored, a module that
throws on import outside a browser. None warrants its own refactor plan; each
warrants a real fix with a pin so the defect cannot quietly return.

Deliberately **not in scope** — absorbed by sibling plans in this batch; do
not touch them here:

- HeaderPlugin / AtLinkPlugin missing effect dep arrays — plans 043/053
  rewrite those files.
- Dead `droppables.slice` calls — plan 047.
- InklingNestedEditor dead props + `never[]` casts — plan 048.

## Current-state evidence

Verified fresh against commit `d998080`:

1. **cardWidth no-op sync** — `src/components/InklingCardWrapper.tsx:129-131`
   (`InklingCardWrapper`): `if (cardWidth !== width) { setCardWidth(cardWidth) }`
   sets the React state to its own current value — a true no-op (React bails
   out on `Object.is`-equal state). Verbatim since the initial port commit
   `e76a86c`; the comment at `:132` ("we are now using the width passed from
   the property instead of the state, as it is the source of truth") arrived
   with it. The `width` prop is resolved from the node by the shared decorate
   adapter (`src/nodes/decorate-card.tsx:24-25,31`) from the declarations
   (`image.declaration.ts:42`, `video.declaration.ts:34`,
   `header.declaration.ts:35-38,45` — all three normalize). The context state
   is **load-bearing, not dead**: it feeds the image toolbar's `isActive`
   states (`ImageNodeComponent.tsx:351,358,365`), the figure's
   `data-inkling-card-width` (`ImageCard.tsx:257` via
   `ImageNodeComponent.tsx:308`), and the wrapper effect's branch condition
   (`InklingCardWrapper.tsx:126`). Toolbar writers dual-write node + state
   (`ImageNodeComponent.tsx:267-268`; `VideoNodeComponent.tsx:235,237`), but
   nothing repairs the state on an external node change (undo/redo, collab):
   the figure attribute and toolbar actives go stale, and the effect's
   state-keyed branch can wrongly delete the decorator-div attribute
   (undo regular→wide) or set an explicit `"regular"` (undo wide→regular).
2. **Mouse-event fallback** — `src/plugins/behaviour/registerMouseEvents.ts`
   has no test anywhere (11 suites in `test/unit/plugins/behaviour/`, none for
   it). `InklingBehaviourPlugin.tsx:129` falls back to
   `document.querySelector('.inkling-editor')`, which (a) picks the FIRST
   match on a multi-editor page, (b) runs `document` access during render, and
   (c) matches **nothing** in the current product — `.inkling-editor` exists
   nowhere in `src/`, `src/styles/`, or `demo/` (the wrapper uses
   `inkling-lexical`, `InklingComposableEditor.tsx:126`). So the fallback is
   doubly stale: dead today, wrong-editor if a host page ever revives the
   class. The plugin is public (`src/index.ts:42,111`); only
   `InklingComposableEditor.tsx:147-151` passes `containerElem` internally.
3. **Escape return value** — `src/plugins/behaviour/keyboard-navigation/escape.ts:30`
   (`registerEscapeCommand`) returns `true` unconditionally at
   `COMMAND_PRIORITY_LOW`, swallowing Escape even when nothing was selected or
   editing and there is no parent editor. Handled cases: exit edit mode via
   `SELECT_CARD_COMMAND` (`:20-24`) and parent-root focus in nested editors
   (`:26-28`). The only other `KEY_ESCAPE_COMMAND` listener is
   `AtLinkPlugin.tsx:428` at `COMMAND_PRIORITY_HIGH`, so the LOW return value
   decides whether priority-0/1 consumers (and Lexical's handled-event
   bookkeeping) ever see Escape. Existing pin:
   `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts:353-374`
   (editing case returns `true`).
4. **Dead ctrlOrCmd** — `src/utils/ctrlOrCmd.ts` is one line dereferencing
   `navigator` at module top level (throws on import outside a browser). Zero
   production importers (only `test/unit/utils/ctrlOrCmd.test.ts`, 2 tests);
   not re-exported from the barrel; e2e uses its own `ctrlOrCmd(page)` at
   `test/utils/e2e.ts:507`; production's live equivalent is the lazy
   `ctrlOrCmdSymbol()` in `src/utils/shortcutSymbols.ts:5`.
5. **showVisibilitySettings** — traced end-to-end and **load-bearing**:
   written by `registerVisibilityHandler.ts:41,47,62` and
   `registerCardCommands.ts:85,122,179`; read only by
   `HtmlNodeComponent.tsx:24` (→ `:82` toolbar `isActive`, `:100` settings
   panel gate). The path is live because html is the only card with an
   indicator icon (`card-decorate.tsx:203-205`):
   `InklingCardWrapper.tsx:46-53` dispatches
   `SHOW_CARD_VISIBILITY_SETTINGS_COMMAND` → the handler sets the state →
   `HtmlNodeComponent` renders the panel in selected (non-edit) mode. The
   writes for non-html cards (`registerVisibilityHandler.ts:47`) are inert but
   harmless — no other reader exists.

## Scope

**In scope**: the five fixes below, each one commit, each with its pin.

**Out of scope**: deleting the `cardWidth` field from the `CardContext`
interface (cascades to ~12 mock sites across `test/unit/**` and
`GalleryCard.stories.tsx:64` — out of proportion for this batch; recorded as
the rejected deeper alternative); moving `showVisibilitySettings` into the
card selection store (a seam decision, not a latent fix); the sibling-plan
items listed above; any public barrel change (none of the five items touches
one — `CardContext`, `ctrlOrCmd`, and `registerMouseEvents` are not exported,
and `InklingBehaviourPlugin`'s props are unchanged — so
`verify:package`/`verify:types` are not gates here).

## Commands you will need

| Purpose                    | Command                                                                                                                    | Expected on success                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Baseline (run first)       | `pnpm test:unit`                                                                                                           | 206 files / 1707 passed / 21 todo           |
| Renderer drift check       | `pnpm vitest run test/nodes-base test/html-renderer`                                                                       | 46 files / 730 passed / 21 todo (unchanged) |
| Step 1 pin                 | `pnpm vitest run test/unit/components/InklingCardWrapper.test.tsx`                                                         | new sync tests fail pre-fix, pass post-fix  |
| Step 2 pin                 | `pnpm vitest run test/unit/plugins/behaviour/registerMouseEvents.test.ts test/unit/plugins/InklingBehaviourPlugin.test.ts` | green post-fix                              |
| Step 3 pin                 | `pnpm vitest run test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts`                                           | green post-fix                              |
| Behaviour suites (2, 3, 5) | `pnpm vitest run test/unit/plugins`                                                                                        | green                                       |
| Static + full gates        | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit`                                                       | all pass; totals per step bookkeeping       |

## Git workflow

- **Directly on `main`** — no branch, no push, no PR (2026-07-16 batch
  decision; this overrides the `advisor/NNN-<slug>` convention in
  `plans/README.md`).
- One commit per step, conventional messages:
  1. `fix(cards): sync card-width context state from the node-driven width prop`
  2. `fix(behaviour): scope mouse-deselect fallback to the editor's own root element`
  3. `fix(behaviour): return handled status from the Escape command listener`
  4. `chore(utils): delete dead ctrlOrCmd module`
  5. `docs(context): document why showVisibilitySettings stays` (expected; see Step 5)

## Steps

### Step 1: Repair the cardWidth prop→state sync in InklingCardWrapper

Investigation preface (confirm, do not redo): read
`src/components/InklingCardWrapper.tsx`, `ImageNodeComponent.tsx:258-279`,
`VideoNodeComponent.tsx:227-239`, `ImageCard.tsx:257`, and
`src/nodes/decorate-card.tsx`. Confirm the state has live readers (evidence
item 1) — it does — so the fix is **repair the sync**, not delete the state.

- Pin first, in `test/unit/components/InklingCardWrapper.test.tsx` (extend the
  existing harness; it already mounts the wrapper with real contexts): render
  with `width="wide"`, rerender with `width="regular"` and back, capturing the
  `CardContext` value via a consumer child. Assert (a) the context `cardWidth`
  follows the prop, and (b) the decorator parent element's
  `data-inkling-card-width` is present for non-regular widths and absent for
  `regular` (the "less test churn" intent documented at
  `InklingCardWrapper.tsx:125`). Verify both fail on unpatched code.
- Fix in `src/components/InklingCardWrapper.tsx`:
  - Delete the no-op `if (cardWidth !== width) { setCardWidth(cardWidth) }`.
  - Branch the data-attribute effect on `normalizedWidth` (already computed at
    `:34`, `normalizeCardWidth(width) ?? 'regular'`) instead of the stale
    state: delete the attribute when `normalizedWidth === 'regular'`, else set
    it to `normalizedWidth`. Deps collapse from `[cardWidth, containerRef,
width]` to `[normalizedWidth]`. All three width-declaring cards feed a
    normalized value through the adapter, so this is output-identical for
    every node-driven render.
  - Add the sync as its own effect
    (`React.useEffect(() => { setCardWidth(normalizedWidth) }, [normalizedWidth])`)
    with a comment: the prop (resolved from the node via the declaration) is
    the source of truth; the context state follows it so toolbar active states
    and the figure attribute track external changes (undo/redo, collab). Keep
    the toolbar writers' dual-write (`ImageNodeComponent.tsx:267-268`,
    `VideoNodeComponent.tsx:235,237`) untouched — it is the immediate-feedback
    write; the sync only repairs external divergence.
- Note for the commit message: `data-inkling-card-width` on the decorator
  parent now deletes (instead of setting an explicit `"regular"`) when an
  external change returns a card to regular width — that is the documented
  intent, and e2e pins `"regular"` only on the `figure` element
  (`test/e2e/cards/image-card.test.ts:137,322,384`), never on the decorator
  div, so no e2e drift is expected. No e2e run required.
- Gate: the pin file, then full gates. test:unit total grows by the added
  cases; record the number in the commit message.

### Step 2: Scope the mouse-deselect fallback to the editor root + test registerMouseEvents

- Fix in `src/plugins/InklingBehaviourPlugin.tsx:129`: replace the
  render-time `document.querySelector('.inkling-editor')` ref with a lazy
  adapter over the editor's own root element, e.g. a memoized
  `{ get current() { return editor.getRootElement() } }` ref-compatible
  object passed as the fallback `containerElem`. Lazy because the root element
  is null at first render and set on mount; per-editor because
  `getRootElement()` is this editor's contentEditable — multi-editor pages can
  no longer cross-scope the outside-click deselect, and the render-time
  `document` access disappears. Do not change the plugin's props interface.
- New pin `test/unit/plugins/behaviour/registerMouseEvents.test.ts` (follow
  the `registerClickAndCut.test.ts` conventions — headless `createEditor` with
  `ImageNode`, real DOM nodes appended to `document.body`, mousedown dispatched
  on the target element so it bubbles to the window listener). Cases:
  (a) mousedown outside the container with a card node-selected dispatches
  `DESELECT_CARD_COMMAND` with the card key; (b) mousedown inside the
  container does not; (c) mousedown outside with a range selection does not;
  (d) `isNested: true` registers no window listener (outside mousedown does
  nothing); (e) an event target already detached from the document returns
  early (`registerMouseEvents.ts:19-23`). Observe dispatches with a
  higher-priority `DESELECT_CARD_COMMAND` listener returning `false`.
- Add one fallback-path case to `test/unit/plugins/InklingBehaviourPlugin.test.ts`
  (its harness already mounts `InklingBehaviourPlugin({})` with no
  `containerElem`): give the editor a root element, select a card through the
  store, mousedown outside the root → deselect dispatched; also assert no
  `document.querySelector` call (spy) to keep the legacy class from returning.
- Gate: both pin files plus `pnpm vitest run test/unit/plugins`, then full
  gates. Record the new test:unit total in the commit message.

### Step 3: Return handled status from the Escape command listener

- Fix in `src/plugins/behaviour/keyboard-navigation/escape.ts`: track whether
  anything acted — `handled = true` in the edit-mode-exit branch (`:20-24`)
  and in the parent-focus branch (`:26-28`) — and `return handled` instead of
  the unconditional `true` at `:30`.
- Deliberate behavior change to pin: with a card selected but NOT in edit
  mode, Escape now returns `false` (nothing was handled) and propagates to
  lower-priority listeners; with nothing selected in a top-level editor,
  likewise. Nested editors still return `true` because the parent-root focus
  is a real action.
- Pins in `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts`:
  the existing editing case (`:353-374`) stays green unchanged; add
  (a) nothing selected, top-level → `false`; (b) selected but not editing →
  `false`; (c) nested editor (create the test editor with the public
  `createEditor({ parentEditor })` option, as `WordCountPlugin.test.tsx:203`
  does) → `true` and the parent root received focus.
- Gate: the pin file, then full gates. No e2e required; if anything about the
  propagation change looks off in review, a diagnostic run of
  `pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts` is allowed before
  committing (not a batch gate).

### Step 4: Delete the dead ctrlOrCmd module

- Delete `src/utils/ctrlOrCmd.ts` and `test/unit/utils/ctrlOrCmd.test.ts`
  (2 tests). Evidence item 4 confirms zero production importers, no barrel
  re-export, and the e2e helper's independence (`test/utils/e2e.ts:507`).
- Gate: `pnpm typecheck` (proves no hidden importer), `pnpm lint`, full
  `pnpm test:unit` — expected total drops to **1705 passed / 21 todo, 205
  files**, plus the net of Steps 1–3's added tests; state the exact expected
  number in the commit message after Steps 1–3 have landed.

### Step 5: Resolve showVisibilitySettings (investigation → keep with comment)

Investigation: re-trace the write and read sides (evidence item 5 lists every
site). Expected outcome — **load-bearing, keep**: the html card's visibility
panel is driven end-to-end through this state, and html is the only card with
an indicator icon.

- If the trace confirms: keep the state and add a short comment above the
  `showVisibilitySettings` field in `src/context/InklingSelectedCardContext.tsx`
  recording why it survives plan 038's shrink: written by the visibility
  command handlers, read only by `HtmlNodeComponent` (the sole
  indicator-icon card); folding it into the card selection store is a
  separate seam decision, not this batch. No code change; context test at
  `test/unit/context/context.test.tsx:45-59` stays green unchanged.
- If the trace contradicts (a reader or writer was missed and the state is
  truly dead): STOP per the conditions below — deletion cascades to
  `InklingBehaviourPlugin.tsx`, `registerVisibilityHandler.ts`,
  `registerCardCommands.ts`, `HtmlNodeComponent.tsx` and their tests, which is
  beyond an S batch; report instead of improvising.

## Test plan

| Scenario                     | Command                                                                          | Required invariant                                     |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Baseline                     | `pnpm test:unit`                                                                 | 206 files / 1707 passed / 21 todo at `d998080`         |
| Renderer drift               | `pnpm vitest run test/nodes-base test/html-renderer`                             | 730 passed / 21 todo, unchanged after every step       |
| cardWidth sync pin           | `pnpm vitest run test/unit/components/InklingCardWrapper.test.tsx`               | fails pre-fix, passes post-fix                         |
| Mouse events pin             | `pnpm vitest run test/unit/plugins/behaviour/registerMouseEvents.test.ts`        | new file, 5 cases green                                |
| Fallback scoping pin         | `pnpm vitest run test/unit/plugins/InklingBehaviourPlugin.test.ts`               | deselect scoped to own root; no `querySelector` call   |
| Escape pins                  | `pnpm vitest run test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` | editing case unchanged; 3 new cases green              |
| ctrlOrCmd deletion           | `pnpm typecheck && pnpm test:unit`                                               | no hidden importer; 1705 passed / 21 todo pre-1–3 nets |
| Full gates (after each step) | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit`             | all pass                                               |

## Acceptance criteria

- `InklingCardWrapper` has no self-assigning state write; the context
  `cardWidth` state provably follows the node-driven `width` prop, and the
  decorator-div data attribute is keyed off the prop.
- `registerMouseEvents` has a dedicated unit suite; the behaviour plugin's
  fallback no longer references `.inkling-editor` or touches `document`
  during render, and outside-click deselect is scoped to the editor's own
  root element.
- `registerEscapeCommand` returns `true` only when it acted; the three new
  pins plus the pre-existing editing pin are green.
- `src/utils/ctrlOrCmd.ts` and its test are gone; typecheck proves no
  importer survived.
- `showVisibilitySettings` carries a comment naming its sole reader and its
  command-handler writers (or, only on a contradicting trace, a STOP report).
- Gates green; nodes-base/html-renderer at 730 passed / 21 todo throughout;
  test:unit totals recorded per commit.

## STOP conditions

- The standing red line applies to every step: never update test expectations
  to mask drift. If a pin fails post-fix, the fix is wrong — revert the step's
  commit and reassess.
- Step 1: if repairing the sync breaks any existing wrapper, image, video, or
  header test, or an e2e assertion on `data-inkling-card-width` (diagnostic
  run allowed), the state-keyed behavior was load-bearing in a way the
  evidence missed — revert the step and report; do not broaden the fix into
  the `CardContext` interface deletion.
- Step 2: if any existing `InklingBehaviourPlugin` or behaviour test depends
  on the legacy `.inkling-editor` lookup (none was found, but the harness
  mocks vary), revert and report — do not patch around it by keeping both
  lookups.
- Step 3: if returning `false` regresses a pinned flow (slash-menu, emoji
  picker, and card-behaviour e2e all press Escape), revert the step and
  report; the escape listener's handled-set was under-characterized.
- Step 4: if typecheck reveals any importer of `@/utils/ctrlOrCmd`, restore
  the module, keep the deletion commit out, and report the importer instead.
- Step 5: if the trace contradicts the load-bearing conclusion, do not delete
  in this batch — report the trace and leave the state untouched.

## Rollback plan

Each step is an isolated commit on `main`; revert the offending step alone
(`git revert <sha>`). Steps share no files except the two plugin test files
touched by different steps (Steps 2 and 3 touch different behaviour suites;
Step 5 touches only a context comment), so reverts do not cascade. If the
batch must be abandoned wholesale, `git revert` the step commits in reverse
order; the baseline totals above are the proof the tree is back to
`d998080` behavior.

## Execution notes

Plan 054 landed in five commits on main (`48be55d..8a131e6`), one per item.
Item 1 (`48be55d`) repaired the cardWidth sync in `InklingCardWrapper` — the
`setCardWidth(cardWidth)` self-write was a true no-op; the context state is
load-bearing (image toolbar active states, the figure data attribute), so a
dedicated effect keyed on the normalized width now syncs state from the
prop. Two new tests fail pre-fix and pass post-fix. Item 2 (`ffc5ee8`)
replaced the dead, cross-scoping `.inkling-editor` querySelector fallback
with a memoized lazy root-element ref (`.inkling-editor` exists nowhere in
src/styles/demo) and added the first `registerMouseEvents` suite (5 cases)
plus a plugin-level fallback pin. Item 3 (`80c6c06`) made `escape.ts` return
its handled status instead of unconditional `true`; three new pins
(nothing-selected → false, selected-not-editing → false, nested → true with
parent-root focus). Item 4 (`c2b1bbc`) deleted `ctrlOrCmd.ts` and its test
(zero production importers; e2e keeps its own helper). Item 5 (`8a131e6`)
investigated `showVisibilitySettings` — load-bearing end-to-end (writers
`registerVisibilityHandler.ts`/`registerCardCommands.ts`, sole reader
`HtmlNodeComponent.tsx`, html being the only indicator-icon card), kept with
a documenting comment; no code change. Gates at HEAD: full unit 206 files /
1721 passed / 21 todo (1712 + 9 net new pins); nodes-base+html-renderer
735/21 unchanged; typecheck clean; lint 0/0; format:check clean; targeted
e2e diagnostics green (card-behaviour 63, slash-menu + EmojiPickerPlugin 39)
— no full e2e suite, no demo-visible path changed.
