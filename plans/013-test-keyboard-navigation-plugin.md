# Plan 013: Add unit tests for the keyboard navigation plugin

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/plugins/behaviour/registerKeyboardNavigation.ts test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`registerKeyboardNavigation` is 1,033 lines of logic handling arrow keys, enter, tab, backspace, delete, and modifier keys around cards, paragraphs, lists, asides, and code blocks. It has 0.4% line coverage and 0% branch coverage. Regressions in caret movement or card deletion will not be caught by unit tests, forcing slow e2e debugging.

## Current state

- `src/plugins/behaviour/registerKeyboardNavigation.ts` — the plugin under test.
- `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` — currently only asserts that the function returns a cleanup function:

```ts
import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { registerKeyboardNavigation } from '@/plugins/behaviour/registerKeyboardNavigation'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerKeyboardNavigation', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  it('registers keyboard command listeners and returns a cleanup function', () => {
    const cleanup = registerKeyboardNavigation(editor, {
      selectedCardKey: null,
      isEditingCard: false,
      setIsEditingCard: vi.fn(),
    })

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
```

Repo conventions:

- Unit tests use Vitest with `createEditor` from `lexical`.
- Commands are dispatched via `editor.dispatchCommand(...)`.
- Selection state is read inside `editor.getEditorState().read(() => { ... })` or `editor.update(() => { ... })`.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
| --------- | ------------------------------------------------ | ------------------- |
| Typecheck | `pnpm typecheck`                                 | exit 0, no errors   |
| Lint      | `pnpm lint`                                      | exit 0              |
| Tests     | `pnpm test:unit -t "registerKeyboardNavigation"` | all pass            |
| Full unit | `pnpm test:unit`                                 | all pass            |

## Scope

**In scope**:

- `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts` only.

**Out of scope**:

- Refactoring `registerKeyboardNavigation.ts`.
- Adding e2e tests.

## Git workflow

- Branch: `advisor/013-test-keyboard-navigation-plugin`
- Commit message style: `test(plugins): add keyboard navigation plugin unit tests`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Set up a realistic test editor

Expand the test helper to register the full `DEFAULT_NODES` set (or at least the nodes the keyboard plugin handles: paragraph, heading, list, aside, code block, image, etc.). The plugin needs `ImageNode` and `DEFAULT_NODES` is the simplest way to get a realistic environment.

```ts
import DEFAULT_NODES from '@/nodes/DefaultNodes'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: DEFAULT_NODES,
    onError: () => {},
  })
}
```

### Step 2: Add helper to dispatch keyboard commands

Add a helper in the test file:

```ts
function dispatchKeyCommand(editor: LexicalEditor, command: string, payload?: unknown) {
  return editor.getEditorState().read(() => {
    return editor.dispatchCommand(command as unknown as import('lexical').LexicalCommand<unknown>, payload)
  })
}
```

Use the actual command constants imported from `lexical` and the plugin's `commands.ts`.

### Step 3: Add characterization tests

Add tests covering the major branches. Aim for the following as a minimum set:

1. **Enter key**: with the cursor at the end of a paragraph, pressing enter creates a new paragraph and moves selection to it.
2. **Arrow right across a card**: with selection at the end of a paragraph immediately before an image card, arrow right selects the image card (or moves the cursor past it).
3. **Backspace at start of paragraph after a card**: backspace when the cursor is at the start of a paragraph immediately after an image card selects the image card (does not delete text).
4. **Tab key**: tab in a paragraph does/does not indent depending on context.
5. **Meta/Ctrl+Enter on selected card**: toggles edit mode if the card supports it.
6. **Delete card command**: `DELETE_CARD_COMMAND` removes the selected card.
7. **Cleanup**: unregistering the plugin removes listeners (already partially covered).

For each test:

- Set up initial editor state with `$createParagraphNode`, `$createImageNode`, etc.
- Dispatch the relevant command.
- Read the resulting state and assert selection position and node existence.

Example shape for an enter test:

```ts
it('creates a new paragraph on enter at end of paragraph', () => {
  editor.update(() => {
    const root = $getRoot()
    const p = $createParagraphNode()
    p.append($createTextNode('hello'))
    root.append(p)
    p.selectEnd()
  })

  const result = editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined)
  expect(result).toBe(true)

  editor.getEditorState().read(() => {
    const root = $getRoot()
    expect(root.getChildrenSize()).toBe(2)
    const selection = $getSelection()
    expect($isRangeSelection(selection)).toBe(true)
    expect(selection?.anchor.offset).toBe(0)
  })
})
```

### Step 4: Run tests iteratively

Run the focused test suite after each new test or small group:

```bash
pnpm test:unit -t "registerKeyboardNavigation"
```

Fix any test setup issues before adding more tests.

### Step 5: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit -t "registerKeyboardNavigation"` → all pass
- `pnpm test:unit` → exit 0

## Test plan

- File: `test/unit/plugins/behaviour/registerKeyboardNavigation.test.ts`.
- Minimum coverage goals:
  - Enter handling in paragraphs and cards.
  - Arrow key movement around cards.
  - Backspace/delete behavior at card boundaries.
  - Tab behavior.
  - Meta/Ctrl+Enter toggling edit mode.
  - DELETE_CARD_COMMAND.
- Use `DEFAULT_NODES` for a realistic editor configuration.

## Done criteria

- [ ] `registerKeyboardNavigation.test.ts` has behavioral tests for the major keyboard paths.
- [ ] All new tests pass.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the test file are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- `registerKeyboardNavigation.ts` does not expose the function or uses private editor APIs that cannot be exercised in jsdom.
- A command cannot be dispatched in tests because of missing node registration.
- Test coverage does not measurably increase after adding tests.

## Maintenance notes

- As the plugin is split into smaller handlers (see plan 006/TECH-03), these tests become the safety net.
- When adding new keyboard behavior, add a unit test here before relying on e2e.
