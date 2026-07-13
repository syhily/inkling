# Plan 012: Split the registerKeyboardNavigation god function into per-command modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/plugins/behaviour/registerKeyboardNavigation.ts src/plugins/behaviour`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED (pure structural refactor, but keyboard behavior is timing-sensitive — the e2e suite is the safety net; do not attempt without running it)
- **Depends on**: plans/018-stabilize-e2e-waits-triage-skips.md recommended first (a stable e2e suite is the characterization net for this refactor)
- **Category**: tech-debt
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

`src/plugins/behaviour/registerKeyboardNavigation.ts` is one exported function
registering ~a dozen keyboard commands in a single 1027-line file (repo median
file size: ~53 lines). Keyboard navigation is the editor's highest-churn,
highest-regression surface — recent history is a chain of e2e stabilization
commits for exactly this area (`33a23bf`, `3a4c109`, `522aaf0`). Every change
to one command risks merge conflicts with and regressions in the others, and
reviewing a diff inside a 1000-line closure is genuinely hard. Splitting each
`registerCommand` block into its own module makes changes local and reviewable
without altering behavior.

## Current state

- `src/plugins/behaviour/registerKeyboardNavigation.ts:58-61`:

  ```ts
  export function registerKeyboardNavigation(editor: LexicalEditor, deps: KeyboardNavigationDeps) {
    const { selectedCardKey, isEditingCard, setIsEditingCard, isNested, cursorDidExitAtTop } = deps

    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
  ```

  The file (1027 lines) is a sequence of `editor.registerCommand(...)` calls
  inside one `mergeRegister(...)`, sharing the destructured `deps`, local
  helpers, and imports from `lexical`, `@lexical/*`, `@/nodes/*`, and
  `./commands` / `./utils` (`$selectCard`, `RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX`,
  `SPECIAL_MARKUPS`).

- `KeyboardNavigationDeps` (`:50-56`): `{ selectedCardKey, isEditingCard,
setIsEditingCard, isNested?, cursorDidExitAtTop? }`.

- Sibling structure already exists: `src/plugins/behaviour/` contains
  `commands.ts`, `types.ts`, `utils.ts`, `registerLinkMatching.ts`,
  `registerPasteHandler.ts` — the pattern for a thin registration module
  importing from siblings.

- Callers: grep `registerKeyboardNavigation` in `src/plugins/` to find the
  plugin component(s) that call it (expected: a keyboard-navigation plugin
  file; do not change its props).

- Characterization tests: unit tests in `test/unit/plugins/` (recent commits
  added keyboard-navigation plugin unit tests — `5380998`; find the exact file
  with `ls test/unit/plugins | grep -i keyboard`) plus the e2e card-behaviour
  suite (`test/e2e/card-behaviour.test.ts`) covering arrow keys, enter,
  backspace, tab, escape around cards.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Import sorting handled by `oxfmt`.

## Commands you will need

| Purpose    | Command          | Expected on success                            |
| ---------- | ---------------- | ---------------------------------------------- |
| Install    | `pnpm install`   | exit 0                                         |
| Typecheck  | `pnpm typecheck` | exit 0                                         |
| Lint       | `pnpm lint`      | exit 0                                         |
| Unit tests | `pnpm test:unit` | all pass                                       |
| E2E        | `pnpm test:e2e`  | all pass (full suite — required for this plan) |
| Format     | `pnpm format`    | run after moves; `format:check` exits 0        |

## Scope

**In scope**:

- `src/plugins/behaviour/registerKeyboardNavigation.ts` (becomes the thin orchestrator)
- New files under `src/plugins/behaviour/keyboard-navigation/` (one per command group)

**Out of scope**:

- Any behavior change — including "small cleanups" noticed while moving code.
  If code looks wrong, leave it and file a note in the commit message.
- The calling plugin component's API or `KeyboardNavigationDeps` shape.
- `registerLinkMatching.ts`, `registerPasteHandler.ts`, `commands.ts`,
  `types.ts`, `utils.ts` in the same directory.
- The skipped e2e tests (plan 018) — do not unskip anything here.

## Git workflow

- Branch: `advisor/012-split-keyboard-navigation`
- One commit per extracted command group — this is the rare case where many
  small commits are correct; each must leave the suite green.
- Commit style: e.g. `refactor(plugins): extract enter-key handler from registerKeyboardNavigation`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0: Read the whole file and map the command groups

List every `editor.registerCommand(<COMMAND>, ...)` in order (expected:
`KEY_DOWN`, `KEY_ENTER`, arrow keys, `KEY_BACKSPACE`/`KEY_DELETE`,
`DELETE_LINE`, `KEY_TAB`, `KEY_ESCAPE`, `KEY_MODIFIER`, `FORMAT_TEXT`,
`INSERT_PARAGRAPH`, `INSERT_*_LIST`, plus custom `SELECT_CARD`/`DELETE_CARD`
handlers). Note shared closure state beyond `deps` (local `let` variables,
helper functions defined inside the function). This map determines the module
boundaries; write it into the first commit message.

### Step 1: Create the module skeleton

Create `src/plugins/behaviour/keyboard-navigation/` with one module per
logical command group (e.g. `enter.ts`, `arrows.ts`, `backspace.ts`, `tab.ts`,
`escape.ts`, `card-selection.ts`), each exporting a function:

```ts
export function registerEnterCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  return editor.registerCommand(KEY_ENTER_COMMAND, (event) => {
    …moved verbatim…
  }, COMMAND_PRIORITY_LOW)
}
```

Move code **verbatim** — same priorities, same early-return order, same
comments. Shared helpers move to `keyboard-navigation/shared.ts` (or the
existing `../utils` if they belong there); closure `let` state that is shared
between commands must be lifted into an explicit state object created in the
orchestrator and passed in — this is the only structural invention allowed,
and it must not change initialization order.

### Step 2: Rewire the orchestrator

`registerKeyboardNavigation.ts` becomes:

```ts
export function registerKeyboardNavigation(editor: LexicalEditor, deps: KeyboardNavigationDeps) {
  return mergeRegister(
    registerKeyDownPassthrough(editor, deps),
    registerEnterCommand(editor, deps),
    …one call per module…
  )
}
```

Registration **order must be preserved exactly** — Lexical dispatches commands
by priority, but equal-priority registrations fire in registration order.
Extract one command group at a time, committing and running tests between
extractions.

**Verify after each extraction**: `pnpm typecheck` → exit 0;
`pnpm test:unit -t "keyboard"` → pass.

### Step 3: Full verification

After the final extraction: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0;
`pnpm test:unit` → all pass; `pnpm format` then `pnpm format:check` → exit 0;
`pnpm test:e2e` → **full suite** passes (this refactor's only meaningful net).
If Playwright browsers cannot be installed in the environment, STOP and hand
the branch to someone who can run e2e — do not merge without it.

## Test plan

- No new tests: this is a move-only refactor. The existing keyboard unit tests
  and e2e card-behaviour suite must pass unmodified at every commit.
- Optional but encouraged: if a command group had no unit coverage (check the
  keyboard unit test file's cases), add characterization tests **in a separate
  preceding commit** on the original file, then move them with the code.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0 with zero expectation changes
- [ ] Full `pnpm test:e2e` passes
- [ ] `registerKeyboardNavigation.ts` is under ~120 lines and contains no
      `registerCommand` bodies — only orchestration
- [ ] `git diff` shows moved code verbatim (reviewer check: no logic edits
      inside moved blocks)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- A command group shares mutable closure state with another in a way that
  can't be lifted without changing initialization semantics — report the
  entanglement; leave those groups together.
- Any test requires an expectation change to pass after a move — that means
  behavior changed; find the cause or revert that extraction.
- Plan 018 has not landed and the e2e suite is currently flaky — a flaky net
  makes this refactor unreviewable; defer.
- Playwright browsers cannot be run in the environment (see Step 3).

## Maintenance notes

- New keyboard commands should be added as new modules in
  `keyboard-navigation/`, not appended to the orchestrator.
- When Lexical upgrades change command payloads (as 0.46 did), the per-command
  modules make the blast radius visible in the diff.
- Reviewers: the only thing to scrutinize is registration order and the
  shared-state lifting; everything else must be verbatim moves.
- Large siblings flagged in the audit for future splits (not this plan):
  `DragDropHandler.tsx` (697), `AtLinkPlugin.tsx` (637),
  `HeaderCard.tsx` (625), `SettingsPanel.tsx` (602).
