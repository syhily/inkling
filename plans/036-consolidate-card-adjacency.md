# Plan 036: Consolidate card adjacency behind one module

> **Executor instructions**: This is a behaviour-preserving refactor of the
> editor's hottest behaviour area. The design is decided: one module owns both
> notions of card adjacency (visual and logical, per CONTEXT.md) plus the card
> selection operations, with DOM geometry behind an internal adapter seam. Do
> not unify the two derivations into one, do not widen the module's interface
> to make a migration site fit, and do not edit any test expectation. Migrate
> one handler file per commit so a regression bisects to a single move.
>
> **Drift check (run first)**:
> `git diff --stat 1cad78b..HEAD -- src/plugins/behaviour/utils.ts src/plugins/behaviour/registerCardCommands.ts src/plugins/behaviour/registerPasteHandler.ts src/plugins/behaviour/keyboard-navigation/ src/utils/\$isAtTopOfNode.ts test/unit/plugins/behaviour/ test/e2e/card-behaviour.test.ts`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM-HIGH — hottest behaviour area in the repo; the safety net is the unit + e2e suites
- **Confidence**: HIGH
- **Depends on**: none
- **Category**: architecture deepening / refactor
- **Planned at**: commit `1cad78b`, 2026-07-15

## Why this matters

CONTEXT.md names two domain notions of **card adjacency**: visual adjacency
(the caret's rendered position, from geometry — what arrow keys care about)
and logical adjacency (the selection anchor's offset — what backspace/delete
care about). Today neither notion has a home. The "select the adjacent card
sibling" derivation is re-implemented about sixteen times across six files,
each site re-deriving adjacency inline with its own mix of geometry reads and
offset checks, and the card selection operations sit in a grab-bag `utils.ts`
that also hosts paste normalization and markdown markup constants.

This is the repo's highest-churn, highest-regression surface: the pre-split
god-function was the most-changed source file in recent history, and commit
`3b0f454` had to fix `delete-line.ts` for logic that parallels
backspace/delete — a fix that only exists because the parallel
implementations drifted. Consolidating detection and operations behind one
module gives the area a single interface with real leverage: the next
adjacency bug is fixed once, and the geometry seam lets tests inject fake
rects instead of stubbing jsdom layout.

## Current-state evidence

- The "select the adjacent decorator sibling" derivation is re-implemented
  ~16 times: `arrows.ts:107-109`, `136-138`, `143-147`, `244-246`, `277-280`,
  `298-302`, `360-364`, `398-402`; `backspace.ts:76-85`, `117-128`;
  `delete.ts:47-53`, `63-68`; `delete-line.ts:48-70`; `modifier.ts:40-70`
  (two symmetric sub-branches under one guard); `registerCardCommands.ts:137-158`;
  `behaviour/utils.ts:46-68` (all paths under
  `src/plugins/behaviour/keyboard-navigation/` unless noted).
- Derivation styles differ per notion. Visual: `arrows.ts:141` calls
  `$isAtTopOfNode` (`src/utils/$isAtTopOfNode.ts:9-27`, which reads
  `Range.getClientRects()` and the top-level element's
  `getBoundingClientRect()`); `arrows.ts:282-303` inlines the same
  caret-rect-vs-element-rect comparison for the element bottom.
  Logical: `backspace.ts:53`, `118-124` and `delete.ts:55-68` use anchor
  offsets only. Both: `delete-line.ts:46-48` combines `$isAtTopOfNode`
  geometry with sibling offset checks.
- The guard `document.activeElement !== editor.getRootElement()` is
  copy-pasted at `arrows.ts:93`, `227`, `322`, `377`; `backspace.ts:33`;
  `delete.ts:25` (in scope) and `tab.ts:27`; `enter.ts:86`;
  `registerPasteHandler.ts:25`; `AtLinkPlugin.tsx:478` (out of scope).
  `delete-line.ts:19` uses the inverted positive form.
- Churn: `git log -250 --name-only -- src/` shows the pre-split
  `registerKeyboardNavigation.ts` path as the most-changed source file
  (11 commits) before plan 012 split it; commit `3b0f454`
  (`fix(keyboard): stabilize modifier-Backspace beside cards`) rewrote
  `delete-line.ts` logic that parallels backspace/delete.
- `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` (737
  lines) stubs `document.activeElement` (line 71),
  `HTMLElement.prototype.getBoundingClientRect` (75-85),
  `Range.prototype.getBoundingClientRect` (86-98) and fabricates a native
  `Selection` (111-138) — the layout stubbing the geometry seam replaces.
- `src/plugins/behaviour/utils.ts` is four unrelated things:
  `RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX` (16), `SPECIAL_MARKUPS` (18-23,
  consumed only by `backspace.ts:24,138-140`), the card operations
  `$selectCard`/`$deselectCard`/`$removeOrReplaceNodeWithParagraph`
  (25-36, 39-44, 46-68), and `normalizePastedHtml` (75-87, consumed only by
  `registerPasteHandler.ts:11,79`). It is not re-exported from
  `src/index.ts`.
- `$selectCard`/`$deselectCard` are also imported by out-of-migration-scope
  files: `enter.ts:23`, `registerClickAndCut.ts:8`,
  `registerVisibilityHandler.ts:17`, `registerCardSelection.ts:9`. These
  consumers only re-point their import; their behaviour is untouched.
- Unit coverage is uneven: `DELETE_LINE_COMMAND` has nine tests
  (`registerKeyboardNavigation.test.ts:396-737`) and
  `registerCardCommands` has its own test file, but `delete.ts`,
  `backspace.ts`'s populated-paragraph card removal (117-128),
  `modifier.ts`'s meta+arrow card selection, and the arrow geometry paths
  have no direct unit tests.

## Scope

**In scope**:

- New module `src/plugins/behaviour/card-adjacency.ts` owning adjacency
  detection (two named queries, one per CONTEXT.md notion) and the card
  selection operations, with DOM geometry reads behind an internal adapter.
- Migration of `keyboard-navigation/arrows.ts`, `backspace.ts`, `delete.ts`,
  `delete-line.ts`, `modifier.ts`, and `registerCardCommands.ts` to the
  module — one file per commit.
- Dissolving `src/plugins/behaviour/utils.ts`:
  `normalizePastedHtml` → its only consumer, `registerPasteHandler.ts`;
  `SPECIAL_MARKUPS` → its only consumer, `backspace.ts`.
- Mechanical import re-pointing in `enter.ts`, `registerClickAndCut.ts`,
  `registerVisibilityHandler.ts`, `registerCardSelection.ts` (they consume
  `$selectCard`/`$deselectCard`; no handler-logic changes there).
- Dedupe of the `activeElement` guard **within in-scope files only**.
- New headless unit tests for the module, driven through an injected fake
  geometry adapter.

**Out of scope**:

- The Enter-handling sprawl: nested-editor re-dispatch via
  `_fromNested`/`_fromCaptionEditor` flags (`enter.ts:86`,
  `arrows.ts:87,221`), the window-capture popup keydown listeners
  (`src/components/ui/KeyboardSelectionWithGroups.tsx:111`), and the popup
  keyboard consumers (`src/plugins/SlashCardMenuPlugin.tsx`,
  `src/components/ui/UrlInput.tsx`, AtLink results). That is a separate
  future decision; do not fold any of it into this plan.
- `tab.ts`, `enter.ts`, `escape.ts`, `key-down.ts` handler logic, and the
  guards in `tab.ts:27`, `enter.ts:86`, `registerPasteHandler.ts:25`,
  `AtLinkPlugin.tsx:478`.
- `KeyboardNavigationDeps` (`keyboard-navigation/types.ts:1-7`) shape and
  command priorities/registration order in
  `registerKeyboardNavigation.ts`.
- Any behaviour change, including "obvious" cleanups of the derivations.
- Unifying visual and logical adjacency into one derivation.

## Commands you will need

| Purpose                  | Command                                                                          | Expected on success              |
| ------------------------ | -------------------------------------------------------------------------------- | -------------------------------- |
| Unit (keyboard)          | `pnpm vitest run test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` | all pass, no expectation edits   |
| Unit (new module)        | `pnpm vitest run test/unit/plugins/behaviour/card-adjacency.test.ts`             | all pass                         |
| Full unit suite          | `pnpm test:unit`                                                                 | all pass                         |
| Card-behaviour e2e       | `pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts`                            | all pass, no expectation edits   |
| Typecheck + lint         | `pnpm typecheck && pnpm lint`                                                    | exit 0                           |
| Format                   | `pnpm format && pnpm format:check`                                               | exits 0                          |

## Git workflow

- Branch: `advisor/036-consolidate-card-adjacency`
- Commit 1: `test(keyboard): pin card-adjacency characterization gaps`
  (only if Step 1 finds uncovered in-scope paths)
- Commit 2: `refactor(behaviour): add card-adjacency module with geometry seam`
- Commit 3: `refactor(behaviour): move card selection operations into card-adjacency`
- Commits 4-9 (one per file): `refactor(keyboard): migrate arrows to card-adjacency`,
  then `backspace`, `delete`, `delete-line`, `modifier`, `registerCardCommands`
- Commit 10: `refactor(behaviour): dissolve behaviour utils into consumers`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Characterize current behaviour

Run the existing nets against the unmodified code and record the baseline:

```bash
pnpm vitest run test/unit/plugins/behaviour/
pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts
```

Then map each in-scope derivation site (the ~16 listed above) to the test
that pins it. Known gaps: `delete.ts:63-68` (forward delete of a following
card from a populated element), `backspace.ts:117-128` (backspace removes a
previous card from a populated paragraph), `modifier.ts:40-70` (meta+arrow
onto boundary cards), and the geometry branches of `arrows.ts:140-149` and
`282-303` (non-empty elements). For any site with no pinning test, add a
characterization test **on the original code** in commit 1, following the
existing `mountEditor`/`setSelectionAt` helpers in
`registerKeyboardNavigation.test.ts`. Do not migrate against unpinned
behaviour.

### Step 2: Create `src/plugins/behaviour/card-adjacency.ts`

One module, three parts (all names illustrative; pick the simplest names
consistent with these roles and mark final choices in the PR description):

- **Two named queries, one per adjacency notion.** E.g.
  `$getVisuallyAdjacentCard(editor, direction)` and
  `$getLogicallyAdjacentCard(editor, direction)`, each returning the
  adjacent card node (or a small result describing side + node) or `null`.
  The visual query owns the caret-geometry derivation (caret client rects
  vs the top-level block's rect, using
  `RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX`), including the existing
  empty-paragraph/offset shortcuts that arrows use today because an empty
  paragraph has no caret rect. The logical query owns the anchor-offset
  derivation (`atStartOfElement`/`atEndOfNode` checks plus sibling lookup)
  that backspace/delete use today. Do not force a shared implementation.
- **The geometry adapter** — an internal seam, e.g. a
  `CardAdjacencyGeometry` interface (caret client rects; top-level block
  rect) whose default implementation performs the real DOM reads currently
  inlined in `arrows.ts` and `src/utils/$isAtTopOfNode.ts` (which stays
  put; the adapter delegates to it or absorbs it — executor detail, prefer
  delegating). The queries take the adapter as an optional parameter
  defaulting to the DOM implementation, so production call sites pass
  nothing and tests inject fake rects. Keep the interface exported for
  tests but out of every other module's imports.
- **The operations**, moved verbatim from `utils.ts`: `$selectCard`,
  `$deselectCard`, `$removeOrReplaceNodeWithParagraph`, and
  `RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX`. (Moved in Step 3; this step may
  land the skeleton with queries + adapter first.)

Also export one focus guard, e.g. `editorOwnsFocus(editor)` (illustrative),
so the `activeElement` check lives in one place; note that
`delete-line.ts:19` uses the inverted form and must keep its exact return
semantics when migrated.

Add `test/unit/plugins/behaviour/card-adjacency.test.ts`: headless tests
that build editors via the existing `createTestEditor` pattern and inject a
fake geometry adapter — no `getBoundingClientRect`/`Selection` stubbing.
Cover: caret on/above/below the threshold line, the two-rect caret case
(`arrows.ts:289-291` comment), empty paragraph shortcut, offset-at-start
and offset-at-end logical adjacency, non-adjacent sibling, and the three
operations' branches (`$removeOrReplaceNodeWithParagraph`: last-child →
append paragraph; next sibling is a card → select it; otherwise
`selectStart`).

### Step 3: Migrate the operations out of `utils.ts`

Move `$selectCard`, `$deselectCard`, `$removeOrReplaceNodeWithParagraph`,
and `RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX` from
`src/plugins/behaviour/utils.ts` into `card-adjacency.ts` verbatim. Re-point
every import: `registerCardCommands.ts:28`, `arrows.ts:24`,
`delete-line.ts:10`, `enter.ts:23`, `registerClickAndCut.ts:8`,
`registerVisibilityHandler.ts:17`, `registerCardSelection.ts:9`. No logic
changes in this commit; `git diff` should show moved code and import lines
only. Run the behaviour unit tests before committing.

### Step 4: Migrate the handlers, one file per commit

For each of `arrows.ts`, `backspace.ts`, `delete.ts`, `delete-line.ts`,
`modifier.ts`, `registerCardCommands.ts` (in that order):

- Replace each inline "select the adjacent card sibling" derivation with
  the matching query. Arrows (and the `isFirstLine` check in
  `delete-line.ts:46`) use the visual query; backspace/delete use the
  logical query; `delete-line.ts` consults both, mirroring its current mix.
- Replace the copy-pasted `activeElement` guard with the shared guard — at
  most one guard occurrence per in-scope consumer file (arrows registers
  four commands; route them through the one shared helper). Preserve each
  site's exact return value (`true` vs fall-through) and `preventDefault`
  timing.
- `modifier.ts` only migrates the meta+arrow card-selection block
  (40-70); the formatting/list shortcuts below it stay untouched.
- `registerCardCommands.ts` only migrates the DELETE_CARD sibling-selection
  ladder (137-158); the SELECT/EDIT/DESELECT command bodies already call
  the moved operations via Step 3.
- After each file: `pnpm vitest run test/unit/plugins/behaviour/` and, for
  arrows/backspace/delete/delete-line, the targeted e2e run
  `pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts`. Commit per file so
  a regression bisects to one migration.

If a site cannot be expressed through the two queries without changing
behaviour or widening the interface, stop — see STOP conditions.

### Step 5: Dissolve `utils.ts`

- Move `normalizePastedHtml` (`utils.ts:75-87`) into
  `registerPasteHandler.ts` as a module-local function (verified sole
  consumer; `plainTextPaste.ts` does not use it). Keep the
  Office/`pre-wrap` comment block with it.
- Move `SPECIAL_MARKUPS` (`utils.ts:18-23`) into `backspace.ts` as a
  module-local const (verified sole consumer).
- Delete `src/plugins/behaviour/utils.ts`. Grep for any remaining
  `'./utils'` / `'../utils'` imports under `src/plugins/behaviour/` —
  there must be none.

### Step 6: Full gates

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts
```

Then update `AGENTS.md` if the architecture notes should mention the new
module (the behaviour-plugin layout is not currently itemized there, so
this may be a no-op — executor detail).

## Test plan

| Scenario                                   | How tested                                                        | Required invariant                          |
| ------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------- |
| Visual query: caret rects vs threshold     | new `card-adjacency.test.ts` with fake adapter                    | matches `$isAtTopOfNode`/arrows inline math |
| Visual query: two-rect caret, empty node   | new unit tests                                                    | existing arrow shortcuts preserved          |
| Logical query: start/end offsets, siblings | new unit tests                                                    | matches backspace/delete derivations        |
| Operations: select/deselect/remove branches | new unit tests + existing `registerCardCommands.test.ts`         | verbatim move, same focus behaviour         |
| Arrow/backspace/delete/delete-line near cards | existing `registerKeyboardNavigation.test.ts` (unmodified)     | all pass                                    |
| Card commands                              | existing `registerCardCommands.test.ts` (unmodified)              | all pass                                    |
| Paste normalization                        | existing `registerPasteHandler.test.ts` + e2e paste-behaviour     | all pass (move only)                        |
| Full keyboard behaviour                    | `pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts`             | all pass, zero expectation edits            |

## Acceptance criteria

- Zero behaviour change: full unit suite and `card-behaviour` e2e suite
  pass with **no expectation edits** (new tests are additive).
- Every in-scope derivation site (~16, listed above) reads from
  `card-adjacency.ts`; no `$isDecoratorNode(sibling) && select`-style
  ladder remains in the migrated handlers.
- The new module's tests run through its own interface with an injected
  fake geometry adapter — no `getBoundingClientRect`, `Range`, or
  `Selection` stubbing in `card-adjacency.test.ts`.
- The `activeElement` guard appears at most once per in-scope consumer
  file; out-of-scope guard sites are untouched.
- `src/plugins/behaviour/utils.ts` no longer exists; `normalizePastedHtml`
  lives in `registerPasteHandler.ts`, `SPECIAL_MARKUPS` in `backspace.ts`.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` exit 0.

## STOP conditions

- A handler's behaviour cannot be preserved without exposing a new
  interface beyond the two queries + operations + guard. Stop and record
  the site; do not widen the module to force the migration.
- The `card-behaviour` e2e suite is flaky at baseline (Step 1). Do not
  migrate against a flaky net — cf. plan 012's note
  (`plans/012-split-keyboard-navigation-god-function.md`, "a flaky net
  makes this refactor unreviewable; defer"). Stabilize or defer first.
- A site genuinely needs a third adjacency notion beyond visual and
  logical. Stop — do not silently add it; record the site and bring it
  back for a design decision.
- Any existing test needs an expectation edit after a migration commit.
  Behaviour changed — find the cause or revert that commit.

## Rollback plan

Each migration is its own commit, so rollback is `git revert` of the
offending migration commit only — earlier commits (module creation,
operations move) are additive/move-only and can stay. If the consolidation
must be abandoned entirely, revert the branch's commits in reverse order;
the Step 1 characterization tests and the new module tests are written
against current behaviour and remain valid, so keep them (re-point imports
if the module itself is reverted) as the net for the next attempt.
