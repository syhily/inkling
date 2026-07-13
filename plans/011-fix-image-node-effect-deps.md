# Plan 011: Fix `ImageNodeComponent` file-dialog effect dependency array

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c295b9c..HEAD -- src/nodes/ImageNodeComponent.tsx test/unit/nodes/ImageNodeComponent.test.tsx`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c295b9c`, 2026-07-13
- **Issue**: (omit)

## Why this matters

`ImageNodeComponent` uses a `useEffect` to open the file picker immediately after a card is inserted from the card menu or slash command. The effect has no dependency array, so it runs after every render while `triggerFileDialog` is true. This causes extra render passes, repeated timeout scheduling, and can trigger the file dialog multiple times if the node update lags.

## Current state

- `src/nodes/ImageNodeComponent.tsx:231-252`:

```ts
React.useEffect(() => {
  if (!triggerFileDialog) {
    return
  }

  const renderTimeout = setTimeout(() => {
    // trigger dialog
    openFileSelection({ fileInputRef })

    // clear the property on the node so we don't accidentally trigger anything with a re-render
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.triggerFileDialog = false
      }
    })
  })

  return () => {
    clearTimeout(renderTimeout)
  }
})
```

Repo conventions:

- React hooks use explicit dependency arrays.
- The file already uses `React.useCallback` with dependency arrays elsewhere.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
| --------- | ---------------------------------------- | ------------------- |
| Typecheck | `pnpm typecheck`                         | exit 0, no errors   |
| Lint      | `pnpm lint`                              | exit 0              |
| Tests     | `pnpm test:unit -t "ImageNodeComponent"` | all pass            |
| Full unit | `pnpm test:unit`                         | all pass            |

## Scope

**In scope**:

- `src/nodes/ImageNodeComponent.tsx` — add a dependency array to the effect.
- `test/unit/nodes/ImageNodeComponent.test.tsx` — add a regression test if feasible.

**Out of scope**:

- Other components' effects.
- Changing the file selection logic itself.

## Git workflow

- Branch: `advisor/011-fix-image-node-effect-deps`
- Commit message style: `fix(nodes): add dependency array to ImageNodeComponent file dialog effect`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a stable dependency array

Change the `useEffect` to depend only on the values that can change its behavior:

```ts
React.useEffect(() => {
  if (!triggerFileDialog) {
    return
  }

  const renderTimeout = setTimeout(() => {
    openFileSelection({ fileInputRef })

    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.triggerFileDialog = false
      }
    })
  })

  return () => {
    clearTimeout(renderTimeout)
  }
}, [triggerFileDialog, nodeKey, editor, fileInputRef])
```

If `openFileSelection` is not stable and causes lint warnings, either wrap it in `useCallback` first or include it in the dependency array. Do not suppress the exhaustive-deps warning without documenting why.

### Step 2: Verify effect runs only once

Add a unit test in `test/unit/nodes/ImageNodeComponent.test.tsx` that:

1. Renders the component with a node whose `triggerFileDialog` is true.
2. Mocks `openFileSelection`.
3. Asserts `openFileSelection` is called exactly once after a render cycle.

If the existing test file is too shallow to support this easily, add at minimum a test that renders the component with `triggerFileDialog=true` and does not crash.

**Verify**: `pnpm test:unit -t "ImageNodeComponent"` → all pass.

### Step 3: Run full verification

**Verify**:

- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0
- `pnpm test:unit` → exit 0

## Test plan

- Updated/new test in `test/unit/nodes/ImageNodeComponent.test.tsx`.
- Assert the file dialog opens exactly once when `triggerFileDialog` is true.

## Done criteria

- [ ] `ImageNodeComponent` file-dialog `useEffect` has a dependency array.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0 (no new exhaustive-deps warnings).
- [ ] `pnpm test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back if:

- The effect in `src/nodes/ImageNodeComponent.tsx` does not match the excerpt above.
- Adding the dependency array causes an infinite render loop in tests.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Audit other `useEffect` calls in the file for missing dependency arrays after this lands.
- A reviewer should confirm the dependency array is complete and that no stale closure bugs are introduced.
