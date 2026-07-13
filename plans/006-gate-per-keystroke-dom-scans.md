# Plan 006: Gate per-keystroke DOM scans in drag-reorder and at-link plugins

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c689f8f..HEAD -- src/plugins/DragDropReorderPlugin.tsx src/utils/draggable/DragDropContainer.ts src/plugins/AtLinkPlugin.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (refresh timing affects drop-target accuracy — the e2e card DnD suite is the safety net)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c689f8f`, 2026-07-13

## Why this matters

Two update listeners do O(document) DOM work on **every** editor update —
including every keystroke — in the default editor configuration:

1. `DragDropReorderPlugin` calls `cardContainer.refresh()` per update, which
   runs two full-root `querySelectorAll` passes and deletes/rewrites `dataset`
   attributes on every block element (attribute mutations invalidate
   style/layout). The code carries a TODO admitting this.
2. `AtLinkPlugin` runs `$nodesOfType(AtLinkNode)` — a full node-map walk —
   inside a nested `editor.update` on every update, even when no at-link has
   ever been used in the document.

On long documents both make typing measurably more expensive.

## Current state

- `src/plugins/DragDropReorderPlugin.tsx:286-293`:

  ```ts
  React.useEffect(() => {
    return editor.registerUpdateListener(() => {
      // refresh drag/drop
      // TODO: can be made more performant by only refreshing when droppable
      // order changes or when sections are added/removed
      cardContainer.current?.refresh()
    })
  }, [editor])
  ```

- `src/utils/draggable/DragDropContainer.ts:153-179` — `refresh()` deletes and
  re-adds `data-draggable`/`data-droppable` attributes across all matched
  elements (context for why per-keystroke calls are expensive; you do not need
  to change this file).

- `src/plugins/AtLinkPlugin.tsx:320-328`:

  ```ts
  React.useEffect(() => {
    return editor.registerUpdateListener(() => {
      // do nothing if we're in the middle of composing text
      if (editor.isComposing()) {
        return
      }

      editor.update(() => {
        const atLinkNodes = $nodesOfType(AtLinkNode)
        const selection = $getSelection()
  ```

  The listener's update payload (Lexical `UpdateListenerPayload`) includes
  `dirtyLeaves` and `dirtyElements` — currently ignored. The rest of the
  handler (lines 328–370) uses `atLinkNodes` only to remove stale at-link
  nodes and to track the focused one.

Repo conventions: TypeScript strict, single quotes, no semicolons, trailing
commas, width 120 (`oxfmt`). Vitest globals. Relevant tests: at-link behavior
in `test/e2e/at-link.test.ts` (or similarly named — confirm with
`ls test/e2e | grep -i link`) and card DnD in `test/e2e/cards/`; unit tests
for plugins live in `test/unit/plugins/`.

## Commands you will need

| Purpose    | Command                                                          | Expected on success |
| ---------- | ---------------------------------------------------------------- | ------------------- |
| Install    | `pnpm install`                                                   | exit 0              |
| Typecheck  | `pnpm typecheck`                                                 | exit 0              |
| Lint       | `pnpm lint`                                                      | exit 0              |
| Unit tests | `pnpm test:unit`                                                 | all pass            |
| E2E        | `pnpm test:e2e -- -g "drag"` and `pnpm test:e2e -- -g "at-link"` | pass                |
| Format     | `pnpm format:check`                                              | exit 0              |

## Scope

**In scope**:

- `src/plugins/DragDropReorderPlugin.tsx`
- `src/plugins/AtLinkPlugin.tsx`

**Out of scope**:

- `src/utils/draggable/DragDropContainer.ts` — the refresh internals are fine;
  only call frequency changes.
- Any behavioral change to what gets refreshed or how at-links are removed.
- Other update listeners (WordCountPlugin etc.) — audit found them
  appropriately scoped.

## Git workflow

- Branch: `advisor/006-gate-update-listener-scans`
- Commit style: e.g. `perf(plugins): gate drag/drop refresh to structural updates`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Gate the drag/drop refresh on structural changes

In `DragDropReorderPlugin.tsx`, change the listener to refresh only when the
update can have changed the set/order of top-level blocks:

```ts
React.useEffect(() => {
  return editor.registerUpdateListener(({ dirtyElements, tags }) => {
    if (tags.has('historic') || tags.has('history-merge')) {
      // undo/redo can reorder cards — refresh, but history-merge entries are
      // text coalescing; skip those
      if (tags.has('history-merge')) {
        return
      }
    }
    // Text-only edits never touch root children; dirtyElements contains the
    // root element when children were added/removed/reordered.
    if (dirtyElements.size === 0) {
      return
    }
    cardContainer.current?.refresh()
  })
}, [editor])
```

Refine the condition against Lexical's actual semantics: `dirtyElements` keys
are element nodes that changed; the root is included when its child list
changes. If text edits still dirty the root (verify empirically in a unit
test or via console logging during `pnpm dev`), fall back to debouncing
`refresh()` (100ms) plus forcing one refresh at drag start — the existing drag
start path is in the same plugin; call `cardContainer.current?.refresh()`
there too. Keep the TODO comment, updated to describe the implemented gating.

**Verify**: `pnpm test:e2e -- -g "drag"` → card DnD tests pass (drag a card
immediately after typing, after deleting a card, and after undo).

### Step 2: Gate the at-link scan

In `AtLinkPlugin.tsx`, early-return before `editor.update` unless the update
can involve at-link nodes:

```ts
return editor.registerUpdateListener(({ dirtyLeaves, dirtyElements }) => {
  if (editor.isComposing()) {
    return
  }

  // Skip the full-tree scan unless an at-link is active or an update touched
  // nodes that could contain one (at-link nodes only exist transiently while
  // the search popup is open, tracked in focusedAtLinkNode).
  if (!focusedAtLinkNodeRef.current && dirtyLeaves.size === 0 && dirtyElements.size === 0) {
    return
  }
  …existing editor.update body…
})
```

Implementation notes:

- The component currently stores `focusedAtLinkNode` in React state; add a
  `React.useRef` mirror updated alongside the state setter so the listener
  closure can read the current value (or read state via a ref pattern already
  used elsewhere in the file — check first).
- The scan must still run when: an at-link is focused (query typing drives the
  search), when selection changes away from an at-link (removal path), and when
  dirty sets are non-empty. Verify the removal-on-arrow-key behavior
  (lines 333–357) still triggers: moving the cursor out of an at-link produces
  a selection change with an empty dirty set **but** a focused at-link — the
  ref check covers this.

**Verify**: `pnpm test:e2e -- -g "at-link"` → pass; `pnpm test:unit -t "at-link"`
→ pass.

### Step 3: Full verification

`pnpm typecheck` → exit 0; `pnpm lint` → exit 0; `pnpm test:unit` → all pass.

## Test plan

- No new unit tests required if gating is behavior-preserving; the existing
  at-link e2e tests and card DnD e2e tests are the characterization net.
- If you change the fallback to a debounced refresh (Step 1), add/adjust a unit
  test in `test/unit/plugins/` (create `DragDropReorderPlugin.test.tsx` only if
  a straightforward mount exists — check how other plugin tests mount editors,
  e.g. `test/unit/plugins/KeyboardNavigationPlugin.test.tsx`; do not force a
  brittle test).
- Manual smoke (document in the commit): `pnpm dev`, type in a long document,
  confirm drag-reorder still highlights drop targets and at-link popup still
  filters on every keystroke.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:unit` exits 0
- [ ] Card DnD and at-link e2e tests pass (`pnpm test:e2e` filtered) — or, if
      Playwright browsers are unavailable in the environment, the executor
      reports them as not-run and the manual smoke is performed instead
- [ ] The TODO at `DragDropReorderPlugin.tsx:289` is updated to describe the
      implemented gating (or removed)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift).
- Gating breaks a DnD or at-link e2e test twice after honest attempts — the
  gating condition is wrong; report which update shape was missed.
- `dirtyElements` semantics turn out to include the root on every text edit
  (making the gate a no-op) and the debounce fallback also shows regressions —
  report measurements instead of shipping a behavior change.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- Lexical update payloads are version-sensitive; the repo just absorbed the
  0.46 upgrade. On the next Lexical bump, re-verify `dirtyLeaves`/
  `dirtyElements` semantics for both listeners (plan 011 isolates private-API
  usage; these are public but semantic).
- If future work adds virtual scrolling or incremental refresh to
  `DragDropContainer`, this gating can be removed entirely.
- Reviewers should look for behavioral changes in: drop-target availability
  right after structural edits, and at-link removal when clicking away.
