# Plan 038: Move card selection to an editor-side store

> **Executor instructions**: The undo-restore protection in
> `registerCardSelection.ts` depends on update-tag ordering and React
> decorator-reconciliation timing. Characterize it with deterministic unit
> tests in Step 1 **before** moving any state — the store swap in Step 3
> changes read timing (synchronous store reads instead of a React mirror
> refreshed by per-render effect re-registration), and that change is only
> safe against a recorded baseline. Do not redesign plan 036's card-adjacency
> module from this plan; if its landed interface conflicts with Step 4,
> coordinate instead.
>
> **Drift check (run first)**:
> `git diff --stat 1cad78b..HEAD -- src/context/InklingSelectedCardContext.tsx src/plugins/InklingBehaviourPlugin.tsx src/plugins/behaviour/registerCardSelection.ts src/plugins/behaviour/registerCardCommands.ts src/plugins/behaviour/registerVisibilityHandler.ts src/plugins/behaviour/keyboard-navigation/types.ts src/components/InklingCardWrapper.tsx src/plugins/DragDropReorderPlugin.tsx test/unit/plugins/InklingBehaviourPlugin.test.ts`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM — React/Lexical timing around undo-restore; subscription correctness during drag-reorder and nested-editor focus
- **Confidence**: MEDIUM-HIGH — the mirror flow is small and fully mapped; the preserve-on-undo path needs characterization before it is touched
- **Depends on**: 036 (card-adjacency extraction; Step 4 consumes its landed interface)
- **Category**: architecture deepening / refactor
- **Planned at**: commit `1cad78b`, 2026-07-15

## Why this matters

Card-selection truth currently lives in three places: the Lexical
`NodeSelection`, a React context mirror (`InklingSelectedCardContext`), and a
per-card derivation (`selectedCardKey === nodeKey` in `InklingCardWrapper`).
The mirror exists only so command handlers can read selection — but Lexical
handlers run outside React, so the values they close over are stale the moment
they register. The workaround is a hub effect with no dependency array
(`InklingBehaviourPlugin.tsx:84-115`) that tears down and re-registers 24
listeners (23 command registrations plus one update listener) on **every
render** purely to keep closures fresh.

This is a depth failure: the context module's interface (4 state pairs, 8
accessors) is wide, while the actual information handlers need is two values.
Moving `selectedCardKey` + `isEditingCard` into a small editor-side store —
fed once by `registerCardSelection`, read synchronously by handlers,
subscribed to by React via `useSyncExternalStore` — collapses the flow to
one direction (Lexical selection → store → handlers sync-read, React
render-only subscribe), lets the hub plugin register once per mount, and
makes handlers unit-testable without mocking a React tree.

## Current-state evidence

- `src/context/InklingSelectedCardContext.tsx:26-29` holds four `useState`
  pairs: `selectedCardKey`, `isEditingCard`, `isDragging`,
  `showVisibilitySettings`. Only the first two are read by non-React code.
- Mirror flow: `registerCardSelection.ts:29` registers an update listener
  that calls `setSelectedCardKey`/`setIsEditingCard`; keyboard handlers read
  the same values back through `KeyboardNavigationDeps`
  (`src/plugins/behaviour/keyboard-navigation/types.ts:1-7`), which carries
  `selectedCardKey`/`isEditingCard`/`setIsEditingCard` into every handler
  (`arrows.ts:27,160`, `enter.ts:26`, `escape.ts:12`, `backspace.ts:27`,
  `delete.ts:19`, `delete-line.ts:13`).
- The same mirror values are also closed over by `registerCardCommands.ts:31-39`
  (used at `:74`, `:82-83`, `:99-100`) and `registerVisibilityHandler.ts:20-26`
  (used at `:40-47`). These must migrate with the keyboard handlers or
  once-per-mount registration leaves them stale.
- The no-deps hub effect is `InklingBehaviourPlugin.tsx:84-115`; the
  `mergeRegister` cleanup at `:115` runs after every render. The same
  no-deps pattern exists at `AtLinkPlugin.tsx:416-505` and
  `InklingCardWrapper.tsx:63-117` (see Scope).
- Undo-restore protection: `registerCardSelection.ts:27` declares
  `preserveCardSelection`; the logic at `:73-112` tags a restored selection
  on `historic` updates, clears the guard on the first non-historic,
  non-`history-merge` update that still has the card selected, and re-sets a
  transiently cleared selection exactly once. The comment at `:21-26`
  attributes the transient deselection to React decorator reconciliation —
  this is the plan's risk area.
- `InklingCardWrapper.tsx:41` derives `isSelected = selectedCardKey === nodeKey`
  from the context; `DragDropReorderPlugin.tsx:34` reads `isEditingCard`
  (drives the drag enable/disable effect at `:334-340`).
- Context consumers that read only `isDragging`/`showVisibilitySettings` and
  must keep working unchanged: `src/components/ui/ActionToolbar.tsx:14`,
  `src/nodes/HtmlNodeComponent.tsx:24`.
- The provider mounts once per top-level composer
  (`src/components/InklingComposer.tsx:179`); `InklingNestedComposer.tsx`
  mounts no provider, so nested editors share the top-level context. The
  `isNested` guard in `registerCardSelection.ts:37` keeps nested editors from
  writing. (Note the different mechanism `onWordCountChangeRef` uses to
  teleport into nested composers — `InklingNestedComposer.tsx:50-52` — out
  of scope here.)
- `InklingSelectedCardContext` is not exported from `src/index.ts`; reshaping
  it is not a public-API change.
- `test/unit/plugins/InklingBehaviourPlugin.test.ts:9-37` mocks the entire
  context tree for a smoke test of a plugin mounting ~24 listeners (89 lines
  total).

## Scope

**In scope**:

- A new editor-side store module owning `selectedCardKey` + `isEditingCard`
  only, hand-rolled pub/sub (~60 lines, **no new dependency** — zustand was
  considered and rejected as not worth a bundled dep at this size), plus a
  `useSyncExternalStore` hook for React subscribers.
- Rewiring `registerCardSelection.ts` to feed the store.
- Shrinking `KeyboardNavigationDeps`, `CardCommandDeps`, and
  `VisibilityHandlerDeps` to read the store; fixing the
  `InklingBehaviourPlugin.tsx:84-115` effect to register once per mount with
  explicit deps.
- Migrating the two React readers of moving state (`InklingCardWrapper`,
  `DragDropReorderPlugin`) to the hook.
- Characterization tests for the `preserveCardSelection` undo-restore path,
  written before any production change.
- Rewriting `test/unit/plugins/InklingBehaviourPlugin.test.ts` to drop the
  whole-context mock.

**Out of scope**:

- `isDragging` and `showVisibilitySettings` — they stay in
  `InklingSelectedCardContext`; no handler reads them.
- The no-deps effects in `AtLinkPlugin.tsx:416-505` and
  `InklingCardWrapper.tsx:63-117`. Note: AtLink's handlers all read
  `$getSelection()` synchronously and close over no React state, so that
  effect has the re-registration pattern but no stale-closure hazard — a
  `[editor]` dep array fixes it; leave it to a follow-up. The wrapper's
  `CLICK_COMMAND` effect closes over `isSelected`/`isEditing`; it keeps
  working with hook values and its re-registration is a separate cleanup.
- Nested-editor selection scoping changes; nested editors keep their own
  composers. The store is scoped to the top-level editor (one instance per
  top-level provider — not a module singleton, so multiple composers on one
  page cannot clobber each other).
- `onWordCountChangeRef` and any other nested-composer state teleport.
- Plan 036's card-adjacency module design (Step 4 only consumes it).

## Commands you will need

| Purpose                    | Command                                                                          | Expected on success                         |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| Store/hook unit tests      | `pnpm vitest run test/unit/plugins/behaviour/cardSelectionStore.test.ts`         | new suite passes (path illustrative)        |
| Selection characterization | `pnpm vitest run test/unit/plugins/behaviour/registerCardSelection.test.ts`      | undo-restore matrix passes before and after |
| Plugin registration gate   | `pnpm vitest run test/unit/plugins/InklingBehaviourPlugin.test.ts`               | registration-count assertion passes         |
| Card-selection e2e         | `pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts test/e2e/selection.test.ts` | green without expectation edits             |
| Full gates                 | `pnpm typecheck && pnpm lint && pnpm test:unit`                                  | all pass                                    |
| Format                     | `pnpm format && pnpm format:check`                                               | exits 0                                     |

## Git workflow

- Branch: `advisor/038-card-selection-store`
- Commit 1: `test(behaviour): characterize preserveCardSelection undo-restore timing`
- Commit 2: `feat(behaviour): add editor-side card selection store`
- Commit 3: `refactor(behaviour): feed card selection store from registerCardSelection`
- Commit 4: `refactor(behaviour): read selection store in command handlers, register once`
- Commit 5: `refactor(cards): subscribe card wrapper and drag plugin to selection store`
- Commit 6: `test(behaviour): drop context mock from InklingBehaviourPlugin test`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Characterize `preserveCardSelection` timing before touching it

Create `test/unit/plugins/behaviour/registerCardSelection.test.ts`
(illustrative path) against a headless editor with a real card node
(`ImageNode`, as in the existing plugin test). Pass the current
`CardSelectionDeps` shape with plain `vi.fn()` setters and a local variable
standing in for `selectedCardKey` — no React. Record the baseline matrix:

- a `{ tag: 'historic' }` update that restores a `NodeSelection` on a card
  marks the selection protected;
- a subsequent untagged update that clears the selection triggers exactly one
  re-selection (`$createNodeSelection` + `$setSelection` under
  `history-merge`), and the guard is consumed by that one use;
- a further legitimate deselection is **not** blocked;
- a non-historic, non-`history-merge` update with the card still selected
  clears the guard without re-selecting;
- `collaboration` and `card-export` tagged updates are ignored
  (`registerCardSelection.ts:31-33`);
- the nested guard at `:37` (`isNested` / focused decorator) is respected;
- the `__openInEditMode` branch at `:128-137` sets editing state.

These tests pin the seam this plan cuts across. They must pass unchanged
after Step 3 — that is the regression gate for the timing swap.

### Step 2: Implement the store and hook in isolation

Create `src/plugins/behaviour/cardSelectionStore.ts` (name illustrative):
`createCardSelectionStore()` returning `{ getState, setState, subscribe }`
over `{ selectedCardKey: string | null; isEditingCard: boolean }`, with
listeners notified only when a value actually changes. Hand-rolled, no
dependency.

Create the React seam, e.g. `useCardSelection(selector)` in
`src/hooks/useCardSelection.ts` (name illustrative), built on
`React.useSyncExternalStore` with a selector + `Object.is` snapshot
comparison so subscribers re-render only when their slice changes. The store
instance is created once per top-level composer (executor detail: instantiate
in the `InklingSelectedCardContext` provider via a `useState` initializer and
expose the stable instance through a small internal context, e.g.
`CardSelectionStoreContext`; both names illustrative). Do not use a
module-level singleton.

Unit-test in isolation: set/get semantics, no notification on identical
values, unsubscribe correctness, and hook rendering (selector re-render
behavior) via `renderHook`.

### Step 3: Feed the store from `registerCardSelection`

Change `CardSelectionDeps` (`registerCardSelection.ts:11-16`) from
`{ selectedCardKey, setSelectedCardKey, setIsEditingCard, isNested? }` to
`{ store, isNested? }`. Inside the listener, replace reads of the
`selectedCardKey` closure with `store.getState().selectedCardKey` and the
setter calls with `store.setState(...)`. Keep the `preserveCardSelection`
logic byte-for-byte where possible — only the read/write primitives change.

Run the Step 1 characterization suite: it must pass with the store deps and
no expectation edits. Note for the executor: the mirror was refreshed
asynchronously by React renders between listener invocations; the store read
is synchronous and therefore never staler than the mirror — but the
characterization suite, not reasoning, is the gate.

### Step 4: Shrink the handler deps to read the store

- `KeyboardNavigationDeps` (`keyboard-navigation/types.ts:1-7`) loses
  `selectedCardKey`/`isEditingCard`/`setIsEditingCard`; handlers read
  `store.getState()` and call `store.setState`. Plan 036's card-adjacency
  module is the intended reader — this plan only swaps the source of the
  three selection fields; if 036 has already landed a different interface
  (e.g. it injects an adjacency query object), adapt the call sites in this
  plan's files, do not redesign 036's module.
- Apply the same swap to `CardCommandDeps` (`registerCardCommands.ts:31-39`)
  and `VisibilityHandlerDeps` (`registerVisibilityHandler.ts:20-26`); both
  close over the same mirror values today. `setShowVisibilitySettings` stays
  a React dispatcher passed through deps (its state stays in context).
- Both keep `isNested`/`cursorDidExitAtTop` as plain deps.

### Step 5: Register the hub plugin once per mount

Rewrite the effect at `InklingBehaviourPlugin.tsx:84-115` with an explicit
dependency array — `[editor, store, isNested, cursorDidExitAtTop,
setShowVisibilitySettings]` — and delete the per-render teardown. The plugin
no longer reads `selectedCardKey`/`isEditingCard` from
`useInklingSelectedCardContext`; it takes the store from the internal context
created in Step 2. Update the registration-count gate in the unit test: spy
on `editor.registerCommand` (or count `mergeRegister` inputs), force several
re-renders, assert the registration count is constant.

### Step 6: Migrate React subscribers; shrink the context

- `InklingCardWrapper.tsx:39-42`: replace the context read of
  `selectedCardKey`/`isEditingCard` with the Step 2 hook; `isSelected`
  (`:41`) and `isEditing` (`:42`) derivations are unchanged. `isDragging`
  still comes from context. Leave the no-deps `CLICK_COMMAND` effect at
  `:63-117` in place (hook values keep it correct); note the follow-up.
- `DragDropReorderPlugin.tsx:34`: replace `isEditingCard` with the hook so
  the effect at `:334-340` tracks the store; `setIsDragging` stays on context.
- `InklingSelectedCardContext.tsx`: remove the `selectedCardKey` and
  `isEditingCard` state pairs and their accessors from
  `InklingSelectedCardContextValue`; the context keeps only `isDragging` and
  `showVisibilitySettings`. Verify the remaining consumers compile unchanged:
  `ActionToolbar.tsx:14`, `HtmlNodeComponent.tsx:24`.

### Step 7: Rewrite the plugin test; run full gates

Rewrite `test/unit/plugins/InklingBehaviourPlugin.test.ts` to mount the real
provider (or inject a real store) instead of `vi.mock` on the context module
(`:13-15`) — the acceptance gate is that no whole-context mock remains. Keep
the existing smoke assertions and add the Step 5 registration-count
assertion. Then run:

```bash
pnpm format && pnpm format:check
pnpm typecheck && pnpm lint
pnpm vitest run test/unit/plugins/behaviour
pnpm test:unit
pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts test/e2e/selection.test.ts
```

The e2e suites cover selection (`card-behaviour.test.ts:2023` SELECTION),
arrow/enter/backspace/delete/escape card keyboard flows, and range selections
over cards — they must pass without expectation edits.

## Test plan

| Scenario                                    | Layer | Assertion                                                           |
| ------------------------------------------- | ----- | ------------------------------------------------------------------- |
| store set/get/subscribe                     | unit  | listeners fire on change only; unsubscribe works                    |
| hook selector subscription                  | unit  | re-render only when the selected slice changes                      |
| undo restores card selection                | unit  | `historic` + transient clear → exactly one re-selection             |
| guard consumed once                         | unit  | subsequent legitimate deselection is not blocked                    |
| guard cleared on stable selection           | unit  | non-historic update with card selected clears without re-select     |
| collab/export tags, nested guard            | unit  | listener ignores tagged / nested updates                            |
| handler reads fresh value without re-render | unit  | change store, dispatch command on un-rerendered plugin → fresh read |
| hub plugin registration count               | unit  | constant across forced re-renders                                   |
| card click/select/edit/escape flows         | e2e   | `card-behaviour.test.ts` green, no expectation edits                |
| range selection covering a card             | e2e   | `selection.test.ts` green, no expectation edits                     |

## Acceptance criteria

- Selection truth lives in one flow: Lexical `NodeSelection` → store →
  handlers sync-read; React subscribes render-only via
  `useSyncExternalStore`. No `useState` mirror of `selectedCardKey` or
  `isEditingCard` remains.
- `InklingBehaviourPlugin`'s listener hub registers once per mount, gated by
  a registration-count assertion in its unit test.
- `InklingSelectedCardContextValue` contains only `isDragging` and
  `showVisibilitySettings` pairs.
- `test/unit/plugins/InklingBehaviourPlugin.test.ts` no longer mocks the
  context tree.
- The Step 1 characterization suite passes unchanged after the store swap.
- `pnpm test:e2e:quiet test/e2e/card-behaviour.test.ts test/e2e/selection.test.ts`
  passes without expectation edits.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm format:check` pass.
- No new runtime dependency is added.

## STOP conditions

- The `preserveCardSelection` undo timing cannot be characterized
  deterministically in jsdom (e.g. the transient deselection depends on real
  decorator reconciliation scheduling). Keep the React mirror for that one
  path, record precisely why, and proceed with the rest only if the mirror
  can be isolated behind the store interface.
- `useSyncExternalStore` subscription shows tearing during drag-reorder or
  nested-editor focus (a card flashes selected/unselected, or drag
  enable/disable lags). Revert that consumer to context and record the
  reproduction before proceeding.
- Shrinking `KeyboardNavigationDeps` conflicts with plan 036's landed
  interface. Coordinate with the 036 executor — do not redesign 036's
  card-adjacency module from this plan.
- A second top-level composer on one page shows cross-editor selection bleed
  (should be impossible with per-provider instances; a singleton store would
  cause it). Stop and fix the instance ownership before continuing.

## Rollback plan

The store is additive through Step 3 and each commit is independently
revertable. If the timing swap regresses undo-restore behavior, revert the
Step 3–5 commits and keep the Step 1 characterization tests — they are the
required evidence for the next attempt. If a single consumer misbehaves under
the hook, revert only that consumer to context; the context shrink (Step 6)
is the last commit and can be deferred without blocking Steps 1–5.

## Execution notes

Plan 038 landed in 6 commits (`cb17ec8..b3e05fc`). Step 1 added 9 characterization tests pinning the `preserveCardSelection` undo-restore path; Step 2 added the hand-rolled `cardSelectionStore` (no new dependency), the `useCardSelection` hook on `useSyncExternalStore`, and a per-composer `CardSelectionStoreContext` instantiated in the `InklingSelectedCardContext` provider; Step 3 rewired `registerCardSelection` to feed the store with the test swap confined to `createSelectionHarness` (assertions byte-identical to the Step-1 baseline); Steps 4+5 moved all handler deps (`KeyboardNavigationDeps`, `CardCommandDeps`, `VisibilityHandlerDeps`) to synchronous store reads and cut the behaviour hub to once-per-mount registration with an explicit dep array, pinned by a forced-rerender registration-count assertion; Step 6 migrated `InklingCardWrapper` and `DragDropReorderPlugin` to the hook and shrank `InklingSelectedCardContextValue` to the `isDragging`/`showVisibilitySettings` pairs only; Step 7 rewrote the plugin test to mount the real provider, dropping the whole-context mock. Gates at `b3e05fc`: typecheck clean, lint 0/0, format:check clean (796 files), unit 1659 passed / 21 todo across 204 files; e2e 67 passed / 2 skipped with no expectation edits. Accepted deviations: Step 6's consumer migration folded into `8dfe455` (forced — the mirror stopped being fed); the commit-5 message was adjusted to match actual content; the store context lives in its own module with a module-level fallback store (test-only today, pinned by a fallback test); characterization test 9 is deliberately count-agnostic; the weak INSERT smoke leg in the plugin test is inherited, pre-existing. Follow-ups: strengthen the INSERT smoke leg; optionally harden the fallback store (throw or warn outside a provider); optionally document the store's listener re-entrancy contract (synchronous listeners, nested `setState` recurses); fix `AtLinkPlugin`'s no-deps effect with an `[editor]` dep array (already noted in the plan); the "handler reads fresh value without re-render" matrix row has no dedicated unit test (accepted gap — structurally guaranteed and e2e-covered). The `CONTEXT.md` glossary gained a **Card selection store** entry.
