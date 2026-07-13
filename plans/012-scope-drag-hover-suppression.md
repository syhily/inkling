# Plan 012: Scope drag/drop hover suppression to the editor root

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/utils/draggable/DragDropHandler.tsx test/unit/utils/draggable/DragDropHandler.test.ts`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`DragDropHandler._removeHoverClasses()` queries `[class*="hover:"]` against the entire document on every drag start, then iterates every match to strip and later restore hover classes. On pages with many Tailwind hover-styled elements, this causes noticeable jank before the drag preview appears. The same visual result can be achieved by toggling a single class on the editor root or body.

## Current state

- `src/utils/draggable/DragDropHandler.tsx:356-369`:

```ts
  _removeHoverClasses() {
    this._restoreHoverClasses()

    this._elementsWithHoverRemoved = new Map()

    const elementsWithHover = document.querySelectorAll('[class*="hover:"]')

    elementsWithHover.forEach((element) => {
      const hoverClasses = Array.from(element.classList.values()).filter((cls) => cls.startsWith('hover:'))

      this._elementsWithHoverRemoved.set(element as HTMLElement, hoverClasses)

      ;(element as HTMLElement).classList.remove(...hoverClasses)
    })
  }

  _restoreHoverClasses() {
    if (!this._elementsWithHoverRemoved) {
      return
    }

    this._elementsWithHoverRemoved.forEach((hoverClasses, element) => {
      element.classList.add(...hoverClasses)
    })

    this._elementsWithHoverRemoved = undefined
  }
```

Repo conventions:

- The editor root is marked with `data-inkling="editor"` (see `src/components/InklingComposer.tsx`).
- Drag/drop code is class-based and uses TypeScript.

## Commands you will need

| Purpose   | Command                               | Expected on success |
| --------- | ------------------------------------- | ------------------- |
| Typecheck | `pnpm typecheck`                      | exit 0, no errors   |
| Lint      | `pnpm lint`                           | exit 0              |
| Tests     | `pnpm test:unit -t "DragDropHandler"` | all pass            |
| Full unit | `pnpm test:unit`                      | all pass            |

## Scope

**In scope**:

- `src/utils/draggable/DragDropHandler.tsx` — replace the global class scan with a scoped CSS strategy.
- `src/styles/components/*` or `src/styles/index.css` — add a single CSS rule that suppresses hover effects inside `[data-inkling-dragging]`.
- Tests in `test/unit/utils/draggable/` if they exist; otherwise create `test/unit/utils/draggable/DragDropHandler.test.ts`.

**Out of scope**:

- Changing drag preview creation.
- Refactoring the entire drag/drop class.

## Git workflow

- Branch: `advisor/012-scope-drag-hover-suppression`
- Commit message style: `perf(draggable): suppress hover effects via editor-root class instead of global scan`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a CSS suppression rule

In the project's stylesheet (likely `src/styles/index.css` or a drag-specific CSS file), add:

```css
[data-inkling-dragging] [class*='hover:'] {
  pointer-events: none !important;
}
```

If the project prefers a different selector scope, place the rule under `.lexical [data-inkling-dragging]` to keep styles isolated. The goal is: when a single attribute/class is present on the editor root, all descendant hover-prefixed Tailwind classes stop reacting to pointer events.

### Step 2: Replace `_removeHoverClasses` and `_restoreHoverClasses`

In `src/utils/draggable/DragDropHandler.tsx`:

1. Remove the `_elementsWithHoverRemoved` property and the `_removeHoverClasses`/`_restoreHoverClasses` methods.
2. In `dragStart`, add the suppressing marker to the editor root element (or `document.body` if the root is not reachable):

```ts
  _setHoverSuppression(suppress: boolean) {
    const editorRoot = document.querySelector('[data-inkling="editor"]')
    if (editorRoot) {
      if (suppress) {
        editorRoot.setAttribute('data-inkling-dragging', 'true')
      } else {
        editorRoot.removeAttribute('data-inkling-dragging')
      }
    }
  }
```

3. Call `_setHoverSuppression(true)` in `dragStart` after the cursor-style override and `_setHoverSuppression(false)` in `dragEnd`.

Target shape in `dragStart`:

```ts
// prevent hover effects showing whilst dragging
this._setHoverSuppression(true)
```

And in `dragEnd`:

```ts
this._setHoverSuppression(false)
```

### Step 3: Add a unit test

Create `test/unit/utils/draggable/DragDropHandler.test.ts` (or add to an existing file) that:

1. Instantiates `DragDropHandler` with a mocked editor container.
2. Calls the public `dragStart`/`dragEnd` methods.
3. Asserts that `[data-inkling-dragging]` is added on drag start and removed on drag end.

If the class has no easy public API to trigger `dragStart` directly, test the `_setHoverSuppression` method or extract it to a testable helper.

**Verify**: `pnpm test:unit -t "DragDropHandler"` → all pass.

### Step 4: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- New test: `test/unit/utils/draggable/DragDropHandler.test.ts`.
- Test cases: drag start adds suppression attribute; drag end removes it.
- Existing e2e drag tests should still pass (run `pnpm test:e2e` if time permits).

## Done criteria

- [ ] `_removeHoverClasses` and `_restoreHoverClasses` are removed.
- [ ] Hover suppression is controlled by a single attribute/class on the editor root.
- [ ] A CSS rule suppresses hover pointer events while the attribute is present.
- [ ] Regression tests exist and pass.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- `DragDropHandler.tsx` does not contain the excerpted hover-class methods.
- There is no suitable editor-root selector (`[data-inkling="editor"]`) available.
- Removing the methods breaks the e2e drag tests and the cause is not obvious.

## Maintenance notes

- If the project later adds non-Tailwind hover styles, extend the CSS rule rather than reintroducing the DOM scan.
- Keep the suppression scope as narrow as possible to avoid breaking hover behavior outside the editor.
