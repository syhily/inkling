# Plan 014: Add unit tests for slash and plus card menus

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/plugins/SlashCardMenuPlugin.tsx src/plugins/PlusCardMenuPlugin.tsx test/unit/plugins/SlashCardMenuPlugin.test.tsx test/unit/plugins/PlusCardMenuPlugin.test.tsx`
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

`SlashCardMenuPlugin` and `PlusCardMenuPlugin` are the two primary card insertion UIs. They have 0% unit coverage. A refactor of `buildCardMenu`, node registration, or query filtering could silently break `/` and `+` menu behavior, forcing slow e2e debugging.

## Current state

- `src/plugins/SlashCardMenuPlugin.tsx` — 414-line plugin that opens a slash menu when `/` is typed.
- `src/plugins/PlusCardMenuPlugin.tsx` — 284-line plugin that shows a plus button on empty paragraphs and opens a menu on click.
- No unit test files exist for either plugin.
- Both plugins depend on `InklingComposerContext` (for `cardConfig`) and `useLexicalComposerContext`.
- `buildCardMenu` (`src/utils/buildCardMenu.ts`) is the shared filtering/ordering utility.

Repo conventions:

- React component tests use `@testing-library/react` and wrap components with `LexicalComposer`.
- See existing component tests such as `test/unit/components/ui/SlashMenu.test.tsx` for patterns.

## Commands you will need

| Purpose   | Command                                 | Expected on success  |
| --------- | --------------------------------------- | -------------------- | -------- |
| Typecheck | `pnpm typecheck`                        | exit 0, no errors    |
| Lint      | `pnpm lint`                             | exit 0               |
| Tests     | `pnpm test:unit -t "SlashCardMenuPlugin | PlusCardMenuPlugin"` | all pass |
| Full unit | `pnpm test:unit`                        | all pass             |

## Scope

**In scope**:

- `test/unit/plugins/SlashCardMenuPlugin.test.tsx` (create)
- `test/unit/plugins/PlusCardMenuPlugin.test.tsx` (create)

**Out of scope**:

- Refactoring the plugin source files.
- Changing `buildCardMenu` behavior.

## Git workflow

- Branch: `advisor/014-test-slash-plus-card-menus`
- Commit message style: `test(plugins): add unit tests for slash and plus card menus`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Create test helpers

Create a shared helper (in the test file or in `test/utils/`) that renders a plugin inside a minimal `LexicalComposer` wrapped with `InklingComposerContext.Provider`.

Example helper shape:

```tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { render, screen } from '@testing-library/react'
import React from 'react'

import InklingComposerContext from '@/context/InklingComposerContext'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import SlashCardMenuPlugin from '@/plugins/SlashCardMenuPlugin'

function renderWithEditor(children: React.ReactNode) {
  return render(
    <LexicalComposer
      initialConfig={{
        namespace: 'test',
        nodes: DEFAULT_NODES,
        onError: () => {},
      }}
    >
      <InklingComposerContext.Provider
        value={{
          cardConfig: {},
          /* other required context values */
        }}
      >
        {children}
      </InklingComposerContext.Provider>
    </LexicalComposer>,
  )
}
```

Inspect `InklingComposerContext.tsx` to supply all required context values. If the context type is complex, use a partial object cast or create a minimal mock.

### Step 2: Test `SlashCardMenuPlugin`

Create `test/unit/plugins/SlashCardMenuPlugin.test.tsx` with tests that:

1. Render the plugin and verify the slash menu is not visible initially.
2. Type `/` in the editor and verify the menu appears with expected items.
3. Type a query (e.g., `/image`) and verify the menu filters to matching items.
4. Press `Enter` on a selected item and verify the correct insert command is dispatched (spy on `editor.dispatchCommand`).
5. Press `Escape` and verify the menu closes.

Use `@testing-library/user-event` or `fireEvent.input` to type. Read the editor root via `screen.getByRole('textbox')` or a test id.

### Step 3: Test `PlusCardMenuPlugin`

Create `test/unit/plugins/PlusCardMenuPlugin.test.tsx` with tests that:

1. Render the plugin and verify the plus button is not visible initially (or is hidden).
2. Move the cursor to an empty paragraph and verify the plus button appears.
3. Click the plus button and verify the card menu opens.
4. Select an item from the menu and verify the correct command is dispatched.

Because the plugin uses `document.elementFromPoint` and `getBoundingClientRect`, you may need to mock these APIs in jsdom.

### Step 4: Mock heavy dependencies

Mock `window.getSelection`, `document.elementFromPoint`, and `getBoundingClientRect` as needed. Do not mock Lexical itself; use a real headless/editor composer.

### Step 5: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit -t "SlashCardMenuPlugin|PlusCardMenuPlugin"` → all pass
- `pnpm test:unit` → exit 0

## Test plan

- New files:
  - `test/unit/plugins/SlashCardMenuPlugin.test.tsx`
  - `test/unit/plugins/PlusCardMenuPlugin.test.tsx`
- Each file covers open, filter/query, select/insert, and close behavior.
- Model the render helper after existing Lexical component tests in `test/unit/components/ui/`.

## Done criteria

- [ ] Both test files exist and pass.
- [ ] Tests exercise menu open, query filtering, item selection, and command dispatch.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the two test files are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The plugins cannot be rendered in jsdom due to missing DOM APIs that are hard to mock.
- `InklingComposerContext` requires values that cannot be reasonably mocked.
- Test coverage for the plugins does not measurably increase.

## Maintenance notes

- These tests will need updates if the menu UI components (`SlashMenu`, `PlusMenu`, `CardMenu`) change significantly.
- Prefer command-dispatch assertions over snapshot tests so refactors of menu markup do not break tests unnecessarily.
