# Plan 047: Split the composer context by lifecycle

> **Executor instructions**: This plan splits `InklingComposerContext` — 13
> fields of unrelated lifecycles on one interface — into three lifecycle
> contexts (host-integration, collaboration, UI prefs) and replaces the two
> mutation channels disguised as reads (`dragDropHandler`,
> `onWordCountChangeRef`) with per-top-level-composer editor-side handles
> following the plan-038 card-selection-store pattern. The design is decided;
> do not redesign the grouping. Module and interface names marked
> "illustrative" may be refined by the executor; the grouping, the handle
> shape (per-top-level-composer store, fed at mount, read synchronously,
> render-only `useSyncExternalStore` binding), and the registerContainer
> split may not. Work commits DIRECTLY on `main` — no branch, no push, no PR
> (this overrides the `advisor/NNN-<slug>` convention in `plans/README.md`).
>
> **Drift check (run first)**: baseline at HEAD `d998080` is
> `pnpm test:unit` = 206 files / 1707 passed / 21 todo and
> `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730
> passed / 21 todo. This plan ADDS characterization tests in Step 1 and
> handle tests in Steps 3/5, so counts grow only by those; no existing
> expectation may change except where a step below pins a deliberate
> interface change.
> `git diff --stat d998080..HEAD -- src/context src/components src/hooks src/plugins src/nodes src/utils/draggable src/utils/buildCardMenu.ts test/unit test/e2e/plugins/DragDropReorderPlugin.test.ts test/e2e/plugins/WordCountPlugin.test.ts test/e2e/cards CONTEXT.md`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MEDIUM — the lifecycle split is mechanical across 41 consumer
  files; the two handle migrations change wiring whose only real coverage
  is e2e drag/word-count specs
- **Confidence**: HIGH
- **Depends on**: —
- **Category**: architecture deepening / module depth
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

`InklingComposerContext` is a shallow module: one interface carrying 13
fields of unrelated lifecycles (`src/context/InklingComposerContext.tsx:54-68`),
consumed by 41 source files. Every consumer depends on the whole bag, so the
interface offers no leverage — you cannot tell from a consumer's imports
whether it reads host config, collaboration wiring, a UI preference, or a
per-composer editor-side channel. Worse, two fields are not reads at all:

- **`dragDropHandler` is a mutation channel.** `DragDropReorderPlugin`
  installs the handler by mutating the memoized context value
  (`inkling.dragDropHandler = dndHandler` at
  `src/plugins/DragDropReorderPlugin.tsx:264`, `delete inkling.dragDropHandler`
  at :286). The provider's memo never carries the field
  (`src/components/InklingComposer.tsx:145-174`), no React update ever fires
  for it, and the only thing making `useCardDragAndDrop`
  (`src/hooks/useCardDragAndDrop.ts:112,116`) and `useGalleryReorder`
  (`src/hooks/useGalleryReorder.ts:253,257`) find the handler is mount
  order: `<DragDropReorderPlugin />` renders before `{children}` at
  `src/components/InklingComposableEditor.tsx:162,168`, and passive effects
  run in tree order, so the plugin's installing effect precedes the hooks'
  registration effects. When `isDragReorderEnabled` is false the plugin
  never mounts and both hooks silently no-op for the editor's lifetime.
- **`onWordCountChangeRef` is hand-rolled pub/sub.** The top-level
  `WordCountPlugin` writes `.current` in a layout effect
  (`src/plugins/WordCountPlugin.tsx:76-78`) and clears it on unmount
  (:205-207); `InklingNestedComposer` reads it during render to decide
  whether to mount a nested `WordCountPlugin`
  (`src/components/InklingNestedComposer.tsx:50-52`). The write does not
  schedule a render; the read works only because decorator cards reconcile
  in a later commit than the host plugin's layout effect.

Both are exactly the problem plan 038 solved for card selection: non-React
code needing synchronous truth that React renders against. The codebase
already has the proven pattern — a 47-line per-top-level-composer store
(`src/plugins/behaviour/cardSelectionStore.ts`), fed once by editor-side
registration, read synchronously, with a render-only `useSyncExternalStore`
binding (`src/hooks/useCardSelection.ts`) and a provider-created instance
with a module-default fallback (`src/context/CardSelectionStoreContext.tsx`).
CONTEXT.md calls this the **card selection store**; this plan extends the
same idiom to two more per-composer channels instead of leaving them as
mutation channels on a read-model context.

The drag-drop seam has a second shallowness: `registerContainer`'s option
bag (`ContainerDragHandlers`, `src/utils/draggable/DragDropContainer.ts:8-28`)
is two interfaces wearing one signature — a draggable side
(`draggableSelector`, `getDraggableInfo`, `createDragPreviewElement`) and a
droppable side (`droppableSelector`, `getIndicatorPosition`, `onDrop`, and
seven enter/over/leave callbacks) — plus lifecycle callbacks and an
`isDragEnabled` flag that rides the `[key: string]: unknown` index
signature (passed at `useCardDragAndDrop.ts:119` and
`useGalleryReorder.ts:260`, neither of which names it in the type). All
three call sites hand-build the full ~15-key bag and fill what they don't
use with permanently-empty callbacks: five in the plugin
(`DragDropReorderPlugin.tsx:270-274`), three in each hook
(`useCardDragAndDrop.ts:124-126`, `useGalleryReorder.ts:265-267`). And the
plugin carries four dead `droppables.slice(...)` calls whose results are
discarded (`DragDropReorderPlugin.tsx:150-156`) — deleted here.

## Current-state evidence

Verified fresh against commit `d998080`:

- The interface has 13 fields (`InklingComposerContext.tsx:54-68`):
  `fileUploader`, `cardConfig`, `darkMode`, `enableMultiplayer`,
  `isTKEnabled?`, `multiplayerEndpoint?`, `multiplayerDocId?`,
  `multiplayerUsername?`, `editorContainerRef`, `createWebsocketProvider`,
  `onWordCountChangeRef`, `dragDropHandler?`, `onError`. Defaults at
  :70-94 install a no-op uploader and a no-op websocket-provider-shaped
  object; consumers can render outside a provider and tests rely on that
  (`test/unit/context/context.test.tsx:10-26` pins the defaults, including
  `dragDropHandler` being `undefined`).
- 43 source files reference the module: the definition, the provider
  (`src/components/InklingComposer.tsx`), and **41 consumers** — 38 runtime
  plus 3 type-only (`src/utils/buildCardMenu.ts:1`,
  `src/nodes/cards/card-menus.ts:3`, `src/hooks/useVisibilityToggle.ts:3`,
  all importing `CardConfig`). 19 test files also reference it.
- Per-field consumer map (from `React.useContext(InklingComposerContext)`
  destructure sites):
  - `fileUploader` (8): ImageNodeComponent:55, AudioNodeComponent:38,
    VideoNodeComponent:52, FileNodeComponent:49, GalleryNodeComponent:43,
    header/HeaderNodeComponent:72, ImagePlugin:17, DragDropPastePlugin:86.
  - `cardConfig` (23): the eight `*NodeComponent` files above except
    FileNodeComponent (Callout:31, Bookmark:54, Html:21, Toggle:29,
    CodeBlock:29, Button:30, Header:72, Image:55, Audio:38, Video:52,
    Gallery:43), SlashCardMenuPlugin:44, PlusCardMenuPlugin:22,
    AtLinkPlugin:636, InklingCardWrapper:30, LinkInputWithSearch:18-20,
    LinkActionToolbarWithSearch:23, SettingsPanel:206,
    SnippetActionToolbar:15, SnippetCreateToolbar:15,
    FloatingFormatToolbar:51, FormatToolbar:75-77, GifPlugin:17.
  - `darkMode` (7): HtmlNodeComponent:21, CodeBlockNodeComponent:29,
    InklingComposableEditor:80, cards/CalloutCard:123, cards/CodeBlockCard:34,
    Portal:17, EmojiPickerPortal:63.
  - `isTKEnabled` (1): InklingComposableEditor:80 (gates `<TKPlugin />` at
    :167).
  - `createWebsocketProvider` (1): InklingNestedComposer:32, used at :46.
  - `onError` (1): InklingErrorBoundary:7.
  - `editorContainerRef` (2 files): InklingComposableEditor:80 — written at
    :110 (only when `!isNested`) and passed to `InklingBehaviourPlugin` at
    :148; DragDropReorderPlugin:257 — read to construct the handler.
  - `dragDropHandler` (3 files): mutation at DragDropReorderPlugin:264,286;
    reads at useCardDragAndDrop:112,116 (effect deps :143) and
    useGalleryReorder:253,257 (effect deps :285).
  - `onWordCountChangeRef` (2 files): WordCountPlugin:67 (writes :77,
    clears :206), InklingNestedComposer:32 (reads :50-52).
  - **Write-only fields**: `enableMultiplayer`, `multiplayerEndpoint`,
    `multiplayerDocId`, `multiplayerUsername` are placed into the memo
    (InklingComposer.tsx:151-155) but no consumer reads them from the
    context — only `createWebsocketProvider` is consumed. The split records
    this honestly by grouping them under collaboration, their only reader's
    lifecycle.
- `useCardDragAndDrop`'s registration effect (:111-148) has **no cleanup**;
  `useGalleryReorder`'s does (:275-280). The plugin tears the whole handler
  down on unmount (:283-287; `DragDropHandler.destroy()` → `cleanup()`
  disables and clears all containers, `DragDropHandler.tsx:73-83,116-121`),
  which is what currently bounds the leak.
- `registerContainer` (`DragDropHandler.tsx:87-113`) delegates to
  `new DragDropContainer(element, options)` and returns the minimal
  `{ enableDrag, disableDrag, refresh, destroy }` view. Three call sites
  exist (the plugin + the two hooks). `DragDropContainer`'s constructor
  `Object.assign`s the bag onto itself with `isDragEnabled: true` as the
  only default (`DragDropContainer.ts:64-87`).
- Existing pins that must keep passing:
  - `test/unit/hooks/useGalleryReorder.test.ts` — pins the registered
    option bag via `expect.objectContaining` and drop/drop-end/getDraggableInfo
    behavior end-to-end through the bag.
  - `test/unit/utils/draggable/DragDropContainer.test.ts` and
    `DragDropHandler.test.ts` — construct full handler bags via a
    `createHandlers()` factory; these factories change shape in Step 4 but
    their behavioral expectations must not.
  - `test/unit/plugins/WordCountPlugin.test.tsx:47-56` — hand-rolled
    context value; :248 pins that nested plugins do not own the shared
    callback.
  - `test/unit/InklingComposer.test.tsx:90,149` — consumes `fileUploader`
    and `createWebsocketProvider` through the context.
  - e2e: `test/e2e/plugins/DragDropReorderPlugin.test.ts` (real mouse
    drags), `test/e2e/plugins/WordCountPlugin.test.ts` (3 tests, including
    nested editors), `test/e2e/cards/gallery-card.test.ts:251,275,440`
    (drops + dragging an image card onto a gallery),
    `test/e2e/cards/image-card.test.ts:930-1030` (drag to create a
    gallery), plus dnd data-attribute assertions at
    `list-behaviour.test.ts:275,300` and `image-card.test.ts:395+`.
- Barrel surface: `src/index.ts` does **not** export the context module or
  its types. But `FileUploader`, `FileUploaderInput`, and `CardConfig`
  (declared in `InklingComposerContext.tsx:12-52`) are inlined into
  `dist/editor.d.ts` (lines ~2915, ~2940, ~2941 via `InklingComposerProps`;
  `CardConfig` again at ~4363 via the card-menu `isHidden` signature).
  `LexicalProviderFactory`, `InklingComposerContextValue`,
  `onWordCountChangeRef`, and `dragDropHandler` do not appear in the
  emitted declarations. So the split is barrel-invisible as long as the
  three exported type shapes keep their names and structure — note for
  plan 048, gated by `pnpm verify:types`.

## Scope

**In scope**:

- Three lifecycle contexts replacing `InklingComposerContext`
  (illustrative modules under `src/context/`):
  host-integration (`fileUploader`, `cardConfig`, `onError`, plus the
  `FileUploader`/`FileUploaderInput`/`CardConfig` types),
  collaboration (`enableMultiplayer`, `multiplayerEndpoint`,
  `multiplayerDocId`, `multiplayerUsername`, `createWebsocketProvider`,
  plus `LexicalProviderFactory`), and UI prefs (`darkMode`, `isTKEnabled`).
  Each keeps today's default values so provider-less consumers and tests
  behave identically.
- A per-top-level-composer **drag-drop handle** (editor-side store in the
  plan-038 shape) owning the `DragDropHandler` instance and the container
  element; the plugin feeds it, the two hooks read/subscribe. Deleting the
  context-mutation channel.
- A per-top-level-composer **word-count handle** owning the shared
  `onChange` callback; the top-level plugin feeds it in the same effect
  points as today, `InklingNestedComposer` subscribes render-only.
- Splitting `ContainerDragHandlers` into honest draggable/droppable/
  lifecycle interfaces with named `isDragEnabled`, dropping the empty
  callbacks at all three call sites and the config index signature.
- Deleting the four dead `droppables.slice(...)` calls
  (`DragDropReorderPlugin.tsx:150-156`).
- CONTEXT.md entries for the new handles.

**Out of scope**:

- `DragDropHandler`/`DragDropContainer` internals beyond the option-bag
  interface and the no-op defaults (indicator positioning, scroll handling,
  event listeners — untouched).
- `InklingSelectedCardContext`'s remaining React state (`isDragging`,
  `showVisibilitySettings`) — a separate shallow-context question, not this
  plan.
- `SharedHistoryContext`, `SharedOnChangeContext`, `TKContext`,
  `CardContext`.
- Any change to what `WordCountPlugin` counts or when it emits.
- Fixing gallery/image drag behavior when `isDragReorderEnabled` is false
  (that product decision stays as-is; the handle only removes the silent
  mount-order dependency).
- The demo, Storybook, and e2e content correctness.

## Commands you will need

| Purpose                         | Command                                                                                                                                                                             | Expected on success                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Drift baseline                  | `pnpm test:unit`                                                                                                                                                                    | 1707 passed + 21 todo before any change   |
| Nodes-base baseline (sanity)    | `pnpm vitest run test/nodes-base test/html-renderer`                                                                                                                                | 730 passed + 21 todo (untouched by plan)  |
| Characterization / hook tests   | `pnpm vitest run test/unit/hooks test/unit/context test/unit/plugins/WordCountPlugin.test.tsx test/unit/InklingComposer.test.tsx`                                                   | green                                     |
| Drag-drop unit tests            | `pnpm vitest run test/unit/utils/draggable test/unit/hooks`                                                                                                                         | green                                     |
| Targeted e2e (Steps 3-5)        | `pnpm test:e2e:quiet test/e2e/plugins/DragDropReorderPlugin.test.ts test/e2e/plugins/WordCountPlugin.test.ts test/e2e/cards/gallery-card.test.ts test/e2e/cards/image-card.test.ts` | green                                     |
| Static + full gates             | `pnpm typecheck && pnpm lint && pnpm test:unit`                                                                                                                                     | all pass                                  |
| Public type surface (Steps 2,5) | `pnpm verify:types`                                                                                                                                                                 | emitted declarations keep the same shapes |
| Format                          | `pnpm format && pnpm format:check`                                                                                                                                                  | exits 0                                   |

## Git workflow

- Branch: none — commit directly on `main` (grilling decision, overrides
  the `advisor/NNN-<slug>` convention). Do not push, do not open a PR.
- Commit 1: `test(composer-context): pin drag-drop and word-count channel behavior`
- Commit 2: `refactor(composer-context): split composer context by lifecycle`
- Commit 3: `refactor(drag-drop): per-composer handle replaces context mutation`
- Commit 4: `refactor(drag-drop): split registerContainer option bag, drop dead slice calls`
- Commit 5: `refactor(word-count): per-composer handle replaces shared callback ref`

## Steps

### Step 1: Pin drag-drop and word-count channel behavior

Before touching production code, lock current semantics:

- Run the baseline (`pnpm test:unit`); record 1707 passed + 21 todo.
- Add `test/unit/hooks/useCardDragAndDrop.test.tsx` mirroring
  `useGalleryReorder.test.ts`'s structure: (a) with no `dragDropHandler` in
  the context value the hook never calls `registerContainer` (the silent
  no-op when reorder is disabled); (b) with a mock handler it registers the
  container with an option bag `expect.objectContaining` the named
  callbacks; (c) the enable/disable effect pair calls `enableDrag()` /
  `disableDrag()` on the registered container.
- Extend `test/unit/plugins/WordCountPlugin.test.tsx` (or add a focused
  file): pin that a top-level plugin writes the shared callback into
  `onWordCountChangeRef.current` and clears it on unmount, and that
  `InklingNestedComposer` mounts a nested `WordCountPlugin` iff the ref is
  set at render time (a light render with the nested composer machinery
  mocked is acceptable — the pin is the conditional, not Lexical's nested
  composer).
- In the commit message, record the two mount-order dependencies verbatim:
  plugin-before-`{children}` at `InklingComposableEditor.tsx:162,168` for
  drag-drop, and layout-effect-write vs decorator-render timing for
  word-count. These are the semantics Steps 3 and 5 deliberately relax.
- No production code changes.

### Step 2: Split the composer context by lifecycle

One mechanical commit; no behavior change, no expectation updates.

- Create the three context modules under `src/context/` (names
  illustrative: `InklingHostIntegrationContext.tsx`,
  `InklingCollaborationContext.tsx`, `InklingUiPrefsContext.tsx`) with the
  field groups from Scope. Move `FileUploader`, `FileUploaderInput`,
  `CardConfig` to host-integration and `LexicalProviderFactory` to
  collaboration **without changing their shapes** — they are inlined into
  `dist/editor.d.ts` and the emitted declaration must be identical. Port
  the default values from `InklingComposerContext.tsx:70-94` to their new
  homes (no-op uploader and no-op websocket-provider-shaped default
  included).
- Rewire `src/components/InklingComposer.tsx` to provide the three contexts
  (nested providers where the single provider sits at :178; keep the memo
  split so each value changes only with its own props).
- Keep `src/context/InklingComposerContext.tsx` alive in this commit as the
  temporary home of exactly `editorContainerRef`, `dragDropHandler?`, and
  `onWordCountChangeRef` — the files that read those
  (`InklingComposableEditor`, `DragDropReorderPlugin`, `useCardDragAndDrop`,
  `useGalleryReorder`, `WordCountPlugin`, `InklingNestedComposer`) keep
  importing it until Steps 3/5.
- Migrate all remaining consumers to their lifecycle context (the consumer
  map in Evidence is the checklist). `InklingNestedComposer` splits its read:
  `createWebsocketProvider` from collaboration, `onWordCountChangeRef` from
  the legacy module.
- Migrate the 19 test files' imports and hand-rolled values
  (`WordCountPlugin.test.tsx:47-56` keeps the legacy fields only;
  `useGalleryReorder.test.ts:21-28` keeps its `{ dragDropHandler }` value
  against the legacy module; `context.test.tsx:10-26` splits the default
  assertions across the three new contexts). No assertion about behavior
  may change in this commit.
- Gates: `pnpm typecheck && pnpm lint && pnpm test:unit`, then
  `pnpm verify:types` — the emitted declaration must keep the same
  `CardConfig`/`FileUploader`/`FileUploaderInput` shapes. If it does not,
  see STOP conditions. Run `pnpm format` before committing.

### Step 3: Drag-drop handle replaces the context mutation

- New store module (illustrative: `src/plugins/behaviour/dragDropHandle.ts`)
  in the exact plan-038 shape: state `{ containerElement: HTMLElement | null;
handler: DragDropHandler | null }`, `getState` / `setState(partial)` /
  `subscribe`, with the same reference-equality change guard as
  `cardSelectionStore.ts:29-33`. New binding modules mirroring
  `CardSelectionStoreContext.tsx` (context default = a fallback instance for
  provider-less consumers) and `useCardSelection.ts` (render-only
  `useSyncExternalStore`; selectors must return primitives or stable
  references — `s => s.handler`, `s => s.containerElement`).
- Create one handle per top-level composer (useState initializer in
  `InklingComposer`, provided alongside the lifecycle contexts; nested
  composers must NOT re-provide — cards inside nested editors register on
  the top-level handler, exactly as today's shared context works).
- `InklingComposableEditor`: keep a local ref for `InklingBehaviourPlugin`
  (:148) and feed the handle's `containerElement` from the same ref
  callback (:108-112, still only when `!isNested`).
- `DragDropReorderPlugin`: read `containerElement` via the binding; the
  constructing effect (:256-288) creates the `DragDropHandler`, publishes
  it with `setHandler`, registers the root container unchanged, and on
  cleanup publishes `null` and destroys the handler. No context mutation.
- `useCardDragAndDrop` / `useGalleryReorder`: replace
  `inkling?.dragDropHandler` with the bound `handler` in the registration
  effect and its deps. The effect now re-runs when the handler identity
  changes — this removes the mount-order dependency (a deliberate,
  recorded improvement): a card whose registration effect runs before the
  plugin's now registers when the handler appears instead of never.
  `useCardDragAndDrop`'s effect gains the cleanup it never had
  (unregister on handler swap/unmount); calling the registerContainer-returned
  `destroy()` after the handler was destroyed must remain harmless — it is
  (`DragDropHandler.tsx:107-111` disables and filters). Record both
  improvements in the commit message.
- Delete `editorContainerRef` and `dragDropHandler` from the legacy
  context module; migrate `useGalleryReorder.test.ts`'s provider value to
  the handle (a real handle instance, not a mock context — the mock
  `DragDropHandler` stays). Add handle unit tests: publish/subscribe
  semantics and the change guard.
- CONTEXT.md gains a "Composer handle" entry (or per-handle entries) in the
  voice of the existing "Card selection store" entry.
- Gates: hook/draggable unit tests, then the targeted e2e line from
  Commands (DragDropReorderPlugin + gallery-card + image-card specs) —
  these are the only real coverage of drag timing. `pnpm typecheck`,
  `pnpm lint`, `pnpm test:unit`.

### Step 4: Split the registerContainer option bag; delete dead slice calls

- Replace `ContainerDragHandlers` (`DragDropContainer.ts:8-28`) with the
  honest split (names illustrative): a draggable config
  (`draggableSelector`, `getDraggableInfo`, `createDragPreviewElement?`,
  `isDragEnabled?`), a droppable config (`droppableSelector`,
  `getIndicatorPosition`, `onDrop`, and the five enter/over/leave callbacks
  optional), and a lifecycle group (`onDragStart?`, `onDragEnd?`,
  `onDropEnd?`). Drop the config's `[key: string]: unknown`; name
  `isDragEnabled` — it rides the index signature today.
  `DragDropContainer`'s constructor assembles the same flat members with
  no-op defaults for absent optional callbacks, so `DragDropHandler` keeps
  calling `container.onDragStart(...)` etc. untouched.
- Update the three call sites: the plugin drops its five empty callbacks
  (:270-274), each hook drops its three (`useCardDragAndDrop.ts:124-126`,
  `useGalleryReorder.ts:265-267`).
- Delete the dead `droppables.slice(...)` if/else at
  `DragDropReorderPlugin.tsx:150-156` (four calls, results discarded — no
  side effects, verified).
- Migrate the `createHandlers()` factories in
  `test/unit/utils/draggable/DragDropContainer.test.ts` and
  `DragDropHandler.test.ts` to the new shape — this is a deliberate
  interface change, not drift: every behavioral expectation in those files
  stays. Update the `objectContaining` pins in the hook tests to the nested
  shape.
- Gates: `pnpm vitest run test/unit/utils/draggable test/unit/hooks`, the
  same targeted e2e line, then full static gates.

### Step 5: Word-count handle replaces the shared ref

- New store module (illustrative: `src/plugins/behaviour/wordCountHandle.ts`)
  holding `{ onChange: ((count: number) => void) | null }`, same plan-038
  shape; binding modules mirroring Step 3 (illustrative binding:
  `useWordCountCallback`). One instance per top-level composer.
- `WordCountPlugin`: feed the handle where it writes the ref today
  (layout effect, top-level only, :69-78) and clear it where it clears
  today (:205-207); effect deps swap `onWordCountChangeRef` for the handle.
  Counting, throttling, and emission logic untouched.
- `InklingNestedComposer`: replace the render-time ref read (:50-52) with
  the render-only binding. A nested composer that renders before the
  callback lands now re-renders when it lands and mounts the nested plugin —
  the layout-effect/decorator timing assumption is gone (deliberate,
  recorded improvement). Ensure exactly one nested `WordCountPlugin` per
  nested editor, as today.
- Delete `src/context/InklingComposerContext.tsx` — now empty — and sweep
  its last imports. Migrate `WordCountPlugin.test.tsx`'s hand-rolled value
  to the handle; the pin at :248 becomes a handle assertion (a nested
  plugin does not own the shared callback). Add a test that the nested
  mount reacts to the callback landing without an unrelated re-render.
- Gates: `pnpm vitest run test/unit/plugins/WordCountPlugin.test.tsx`, the
  WordCountPlugin e2e spec, then `pnpm typecheck && pnpm lint &&
pnpm test:unit && pnpm verify:types && pnpm format:check`. CONTEXT.md
  entry if Step 3's did not cover both handles.

## Test plan

| Scenario                   | Command                                                                                                                                    | Required invariant                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Baseline                   | `pnpm test:unit`                                                                                                                           | 1707 passed + 21 todo at `d998080` before changes              |
| Channel pins (Step 1)      | `pnpm vitest run test/unit/hooks test/unit/plugins/WordCountPlugin.test.tsx`                                                               | new pins green against unmodified production code              |
| Lifecycle split (Step 2)   | `pnpm typecheck && pnpm test:unit && pnpm verify:types`                                                                                    | green; no assertion changes; declaration shapes identical      |
| Drag-drop handle (Step 3)  | `pnpm test:e2e:quiet test/e2e/plugins/DragDropReorderPlugin.test.ts test/e2e/cards/gallery-card.test.ts test/e2e/cards/image-card.test.ts` | green — real drag timing unchanged                             |
| Option-bag split (Step 4)  | `pnpm vitest run test/unit/utils/draggable test/unit/hooks` + same e2e line                                                                | behavioral expectations unchanged; only factory shapes migrate |
| Word-count handle (Step 5) | `pnpm test:e2e:quiet test/e2e/plugins/WordCountPlugin.test.ts` + unit file                                                                 | nested counting green; one nested plugin per nested editor     |
| Full gates (every commit)  | `pnpm typecheck && pnpm lint && pnpm test:unit`                                                                                            | all pass                                                       |

## Acceptance criteria

- `InklingComposerContext.tsx` is deleted; three lifecycle contexts carry
  the field groups from Scope, each with today's defaults; the consumer map
  in Evidence is fully migrated (no file imports the legacy module).
- The four write-only multiplayer fields live only in the collaboration
  context; their lack of readers is recorded in the module comment.
- No context value is mutated by any consumer: the drag-drop handler and
  container element live on a per-top-level-composer editor-side handle in
  the plan-038 store shape; the word-count callback lives on a second
  handle. Both are fed at mount, read synchronously, and subscribed
  render-only via `useSyncExternalStore`.
- The mount-order dependencies recorded in Step 1 are gone: hooks register
  when the handler appears; nested composers mount the nested word-count
  plugin reactively. Both improvements are recorded in commit messages and
  CONTEXT.md.
- `registerContainer` takes the split draggable/droppable/lifecycle config;
  the eleven permanently-empty callbacks (5 plugin + 3 + 3 hooks) and the
  config index signature are gone; `isDragEnabled` is a named field.
- The four dead `droppables.slice(...)` calls are deleted.
- Behavior is otherwise identical: unit baselines grow only by Step-1/3/5
  additions; the targeted drag/word-count e2e specs pass unchanged;
  `dist/editor.d.ts` keeps identical `CardConfig`/`FileUploader`/
  `FileUploaderInput` shapes (`pnpm verify:types`).

## STOP conditions

- Any existing test expectation needs editing in Step 2 (the pure move).
  Revert the commit; the split is import-mechanical and typecheck is the
  guard — never edit expectations to make a move pass.
- `pnpm verify:types` shows a changed `CardConfig`/`FileUploader`/
  `FileUploaderInput` shape after the move. Keep the type declarations in
  whichever module emits the identical declaration (host-integration is the
  intent; the emitted shape is the requirement) — do not edit the
  type-consumer fixture to hide a shape change, and report the delta for
  plan 048.
- The Step-3 subscription changes drag behavior in e2e (container
  registration timing, double registration, lost teardown). Fall back to
  reading the handle synchronously in the registration effect exactly where
  the context was read today (keeping mount-order semantics), record the
  subscription as a documented leftover, and move on — partial leverage is
  acceptable, behavior drift is not. Do not tune e2e waits or expectations
  to force it green.
- The Step-5 reactive nested mount double-mounts or double-emits word
  counts. Ensure the feed points and the one-nested-plugin-per-editor
  invariant match today exactly; if they cannot, keep a non-reactive
  render read of the handle (still deleting the shared ref) and record it.
- The option-bag split requires touching `DragDropHandler`'s event flow or
  changing which callbacks fire. Stop — re-scope the split so
  `DragDropContainer` assembles flat members with no-op defaults and
  `DragDropHandler` stays untouched; if even that drifts, land only the
  dead-slice deletion and the empty-callback removal as named no-op
  defaults, and report.

## Rollback plan

Each step is its own commit on `main`; revert the offending commit alone
(`git revert <sha>`) and keep Step 1's pins — they are the evidence for the
next attempt. Steps are ordered so later steps depend on earlier ones only
through the legacy module's shrinking field set: Step 2 (three contexts) is
valuable and stable on its own; reverting Step 3 or Step 5 restores the
mutation channel / shared ref against the already-split contexts without
touching Step 2. If Step 2 itself proves unsound, revert to `d998080`; the
Step-1 characterization tests were written against the legacy context and
remain valid there (adjust only their provider imports). The dead-slice
deletion in Step 4 is independent and can ship alone by cherry-pick if the
option-bag split is stopped.
