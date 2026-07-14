# Plan 034: Characterize and stabilize modifier-Backspace beside decorator cards

> **Executor instructions**: This plan begins with investigation because the
> browser maps Meta/Control+Backspace to different Lexical commands by
> platform. Do not replace the skipped block with one cross-platform snapshot.
> First lock command-level invariants, then add platform-specific E2E
> expectations, and change production code only for a reproduced invariant
> violation.
>
> **Drift check (run first)**:
> `git diff --stat 316dd61..HEAD -- src/plugins/behaviour/keyboard-navigation/delete-line.ts src/plugins/behaviour/keyboard-navigation/backspace.ts src/utils/\$isAtTopOfNode.ts test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts test/e2e/card-behaviour.test.ts playwright.config.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: HIGH — native deletion semantics differ by operating system, browser, visual line geometry, and Lexical command mapping
- **Confidence**: LOW on the exact production fix; HIGH that the skipped coverage must be decomposed
- **Depends on**: none
- **Category**: bug investigation / test reliability
- **Planned at**: commit `316dd61`, 2026-07-14

## Why this matters

Two CMD/CTRL+Backspace E2E tests are skipped as one block. Their comment mixes
two separate facts: macOS Meta+Backspace deletes to line start, while
Windows/Linux Control+Backspace usually deletes a word; and a multi-line
paragraph next to a card has reportedly been removed/converted to card
selection on macOS. The current `DELETE_LINE_COMMAND` handler intentionally
overrides Lexical to prevent deleting a sibling card, but it relies partly on
DOM range geometry and has a special branch for a first-line text node followed
by a line break.

Without deterministic command tests, it is unclear whether the reported bug is
in browser-to-command mapping, caret geometry, or Inkling's node mutation. A
single skipped HTML expectation hides all three.

## Current-state evidence

- `test/e2e/card-behaviour.test.ts:1707-1765` skips two cases under
  `test.describe.skip('CMD+BACKSPACE')` and calls `ctrlOrCmd(page)` for both.
- The first skipped expectation deletes a one-line populated paragraph after a
  card and selects the card.
- The second expects the first line content to be removed while two line breaks
  and later content remain; the card stays unselected.
- `delete-line.ts:34-60` intercepts `DELETE_LINE_COMMAND` when a decorator is
  adjacent and the native range is visually on the first line.
- For backward deletion when `anchorNode.getNextSibling()` is a line break, it
  removes only `anchorNode` and returns. Otherwise it removes the entire top
  level element and selects the card.
- `$isAtTopOfNode` uses range client rectangles and a pixel threshold. jsdom
  does not naturally provide those geometry semantics.
- `registerKeyboardNavigation.test.ts` covers ordinary Backspace selection of
  a previous card but has no `DELETE_LINE_COMMAND` cases.

## Product invariants to confirm

These are the proposed compatibility rules; obtain product confirmation if a
current test/consumer contradicts them:

1. A modifier deletion inside a paragraph must never delete an adjacent card
   unless the card was already explicitly selected and the existing selected-
   card command handles it.
2. A one-line paragraph immediately after a card may be removed and the card
   selected when macOS “delete line backward” removes all paragraph content;
   preserve the current skipped expectation unless UX owners reject it.
3. A multi-line paragraph with remaining lines must remain a paragraph. Deleting
   the first visual line must not select/delete the card.
4. Linux/Windows Control+Backspace keeps native delete-word semantics and must
   not be forced to behave like macOS delete-line.
5. Forward modifier deletion beside a following card obeys the symmetric card-
   preservation rule where Lexical emits `DELETE_LINE_COMMAND(false)`.
6. Plain Backspace behavior covered by existing tests remains unchanged.

## Scope

**In scope**:

- Command-level tests for `DELETE_LINE_COMMAND`
- Platform/browser E2E decomposition of the skipped cases
- Minimal fix in `delete-line.ts` only if the reproduced command-level state
  violates the confirmed invariants
- Test-only diagnostics for serialized state, Lexical selection, and native
  range geometry

**Out of scope**:

- Making all OS text-editing shortcuts identical
- Reimplementing Lexical's general word/line deletion
- Changing plain Backspace, list, quote, aside, or link workarounds without a
  related regression
- UA/platform branching in production code
- Keeping permanent console instrumentation

## Commands you will need

| Purpose               | Command                                                                                                                              | Expected on success                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Unit characterization | `pnpm test:unit -- test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts`                                                   | deterministic delete-line matrix passes                   |
| Chromium E2E case     | `pnpm test:e2e -- test/e2e/card-behaviour.test.ts --grep "modifier Backspace"`                                                       | host-applicable expectations pass                         |
| Cross-browser E2E     | `pnpm test:e2e -- test/e2e/card-behaviour.test.ts --grep "modifier Backspace" --project chromium --project firefox --project webkit` | supported projects pass or have documented platform skips |
| Full gates            | `pnpm typecheck && pnpm lint && pnpm test:unit`                                                                                      | all pass                                                  |
| Format                | `pnpm format && pnpm format:check`                                                                                                   | exits 0                                                   |

## Git workflow

- Branch: `advisor/034-stabilize-modifier-backspace`
- Commit 1: `test(keyboard): characterize delete-line beside cards`
- Commit 2 (only if needed): `fix(keyboard): preserve multiline content near cards`
- Commit 3: `test(e2e): split modifier backspace by platform semantics`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Capture the real event-to-command matrix

Run the two existing scenarios manually/targeted in each available combination:

- macOS Chromium, WebKit, Firefox: `Meta+Backspace`;
- Linux CI/browser environment: `Control+Backspace`;
- Windows only if a supported runner is available; do not infer it from Linux.

For investigation only, record after each keypress:

- browser/OS and modifier;
- which Lexical command handler ran (`DELETE_LINE_COMMAND`,
  `KEY_BACKSPACE_COMMAND`, or neither);
- `isBackward` payload;
- serialized editor state before/after;
- Lexical anchor/focus node type/key/offset;
- native selection anchor and `Range.getClientRects()` values;
- selected card key/state.

Add a temporary test-only command listener or `page.evaluate` hook at a higher
diagnostic priority. Remove it before commit. Do not add production analytics
or OS detection.

Put the resulting matrix in the PR description or comments beside platform-
specific tests. If the reported macOS multi-line failure does not reproduce,
do not invent a fix; continue with command-level coverage and narrowly unskip
verified expectations.

### Step 2: Add deterministic `DELETE_LINE_COMMAND` unit cases

Extend `registerKeyboardNavigation.test.ts`. Import
`DELETE_LINE_COMMAND`, `LineBreakNode` helpers, and any required test node.
Construct state through Lexical APIs:

- decorator + one-line paragraph, caret at end;
- decorator + paragraph `first line` + line break(s) + `later line`, caret at
  the end and beginning of the first line;
- same paragraph with inline formatting/link splitting the first visual line;
- paragraph not adjacent to a card;
- paragraph before a following card with `isBackward: false`;
- explicitly selected card.

Because the handler calls `$isAtTopOfNode`, provide a real `Selection`/range
double whose client rects place the caret on or off the top line. Prefer a
small helper that builds `getRangeAt(0).cloneRange().getClientRects()` and a
top-level element rect. Do not mock the entire keyboard module or bypass the
registered command.

Assert command handled/unhandled result, exact root child types/text, and
Lexical selection after dispatch. These tests invoke `DELETE_LINE_COMMAND`
directly, so they are independent of host OS keyboard mapping.

### Step 3: Decide whether production code is actually wrong

Compare results with the confirmed invariants:

- If all deterministic cases pass and only browser mapping differs, make no
  production change. Split E2E expectations by platform/command.
- If the multi-line state removes the top-level paragraph or selects/deletes
  the card while later line content exists, fix `delete-line.ts`.
- If only DOM geometry misclassifies the visual line, improve/test
  `$isAtTopOfNode` separately and keep node deletion logic unchanged.
- If a browser never emits `DELETE_LINE_COMMAND`, determine whether Lexical
  upstream owns mapping before adding a raw keydown interceptor.

No production fix is a valid completion outcome when the behavior invariants
already hold; the improved result is deterministic coverage and correctly
scoped E2E tests.

### Step 4: If needed, fix multi-line deletion using node structure

Only after a red command-level test, change the adjacent-card branch so it
distinguishes:

- a top-level element whose content will become empty; versus
- a top-level element that contains line breaks/content outside the deletion
  range.

For backward deletion on the first visual line with later content, preserve the
top-level paragraph and card. Remove only content from the current caret back
to that line's start, matching the captured native/Lexical behavior. Handle
text split across formatted/link nodes by operating on a range or well-tested
siblings, not only `anchorNode.remove()`.

Do not remove all nodes before the first line break if the caret is in the
middle of a text node; preserve text after the caret. Do not mutate serialized
content after the first line break. Restore a valid collapsed selection at the
start of the remaining line/paragraph.

For a genuinely one-line paragraph that becomes empty, retain the current
top-level removal/card selection behavior if product invariants confirm it.

Prefer Lexical public selection/node APIs. Do not edit node internals or call
browser `execCommand`.

### Step 5: Replace the blanket skipped describe with explicit tests

Rename cases around behavior, e.g. `modifier Backspace preserves adjacent
card`. Do not use one `ctrlOrCmd` expectation for all systems.

- Add Linux/Windows Control+Backspace delete-word expectations applicable to
  CI. Assert the card remains and only the expected word/text changes.
- Add macOS Meta+Backspace tests guarded by a narrow host/platform annotation
  if physical macOS behavior cannot run in Linux CI.
- Keep deterministic direct-command unit tests unskipped on every platform so
  the core invariant is always gated.
- If Playwright supports project metadata for platform-specific workers, use
  that instead of user-agent sniffing.

Every remaining `test.skip` must include the exact unavailable environment and
a tracking reference. Remove the broad “suspected product bug” comment after
the red case is fixed or disproven.

### Step 6: Check adjacent deletion regressions

Run or add cases for:

- plain Backspace on empty paragraph after card;
- plain Backspace at start of populated paragraph (existing previous-card
  removal behavior);
- Delete/forward delete;
- lists, links, quote/aside conversions;
- selected card deletion;
- nested editors, where top-level card behavior is disabled.

Do not update those expectations merely because modifier deletion changed.

### Step 7: Run full gates

Run:

```bash
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit -- test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts
pnpm test:unit
pnpm test:e2e -- test/e2e/card-behaviour.test.ts --grep "modifier Backspace"
```

Run all three configured browser projects where the host supports them. Record
macOS-only verification separately if CI is Linux.

## Test plan

| Scenario                        | Command/platform            | Required invariant                                |
| ------------------------------- | --------------------------- | ------------------------------------------------- |
| one-line after previous card    | direct delete-line backward | paragraph may empty/select card; card not deleted |
| multiline first line after card | direct delete-line backward | later lines and paragraph remain; card unselected |
| caret mid first line            | direct delete-line backward | only text back to line start deleted              |
| no adjacent card                | direct command              | handler falls through to Lexical                  |
| card selected                   | direct command              | existing explicit card deletion path              |
| Linux/Windows shortcut          | Control+Backspace           | word deletion; adjacent card preserved            |
| macOS shortcut                  | Meta+Backspace              | line deletion matches direct-command invariant    |

## Acceptance criteria

- The blanket skipped describe is removed or replaced by narrowly explained
  environment guards.
- Direct `DELETE_LINE_COMMAND` behavior is tested on every CI platform.
- A multiline paragraph with remaining content is never removed or converted
  to card selection by modifier Backspace.
- Adjacent cards are never deleted as a side effect of native line/word
  deletion.
- OS-specific word/line semantics remain native; production code has no UA
  branch.
- Plain Backspace and existing keyboard behavior remain green.
- All applicable gates pass.

## STOP conditions

- Product owners do not agree whether an emptied one-line paragraph should
  select the adjacent card. Preserve current behavior and request a decision.
- The reported macOS bug cannot be reproduced and recorded state already
  satisfies the invariants. Do not change production code.
- Browser-to-Lexical command mapping differs within the same supported browser
  version unpredictably. Escalate upstream with a minimal reproduction before
  intercepting raw OS keys.
- Correct line deletion requires reimplementing bidirectional text, IME, or
  grapheme segmentation. Fall back to Lexical/upstream APIs instead of a local
  text algorithm.
- `$isAtTopOfNode` geometry is the actual cause across unrelated commands.
  Split a focused geometry plan and keep this mutation patch small.

## Rollback plan

Revert production mutation separately from the new deterministic tests only if
the fix causes native editing regressions. Keep the platform matrix and direct-
command coverage; they are required evidence for the next solution.
