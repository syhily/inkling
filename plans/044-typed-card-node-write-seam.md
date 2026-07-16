# Plan 044: Put card-node writes behind a typed seam

> **Executor instructions**: This plan replaces the
> `$getNodeByKey(key)` + `as GeneratedDecoratorNodeBase` write idiom with one
> typed write seam, `$updateCardNode(nodeKey, guard, update)`, colocated with
> the node generator. The seam's shape is decided (mutator callback, not a
> patch object — see "Current-state evidence" for why); do not redesign it.
> Every migration is type-level: no renderer, serializer, or React output may
> change, and no test expectation may be touched. Interface names marked
> "illustrative" may be refined by the executor; the shape may not.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/nodes/base/generate-decorator-node.ts src/nodes/base/inkling-default-nodes.ts src/nodes src/utils/imageUploadHandler.ts src/utils/thumbnailUploadHandler.ts src/utils/fileUploadHandler.ts src/utils/audioUploadHandler.ts src/hooks/useVisibilityToggle.ts src/hooks/useFileDragAndDrop.ts src/hooks/useGalleryReorder.ts src/components/ui/cards src/components/ui/MediaUploader.tsx src/components/ui/SettingsPanel.tsx src/context/InklingComposerContext.tsx test/typecheck`
> If an in-scope file changed since `d998080`, re-verify the census below
> (`rg -c 'as GeneratedDecoratorNodeBase' src`) before executing.
>
> **Baseline (pinned at `d998080`)**: `pnpm test:unit` = 206 files / 1707
> passed / 21 todo; `pnpm vitest run test/nodes-base test/html-renderer` = 46
> files / 730 passed / 21 todo; typecheck, lint, format:check clean. This plan
> changes no test files, so every number must be identical at the end.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW-MEDIUM — compile-time refactor of editor-side write paths; the only semantic change is deliberate guard narrowing (`if (node)` → the card's `$is*` guard), unobservable in every reachable flow
- **Confidence**: HIGH
- **Depends on**: none
- **Category**: architecture deepening / type honesty
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

Plan 025 built exact per-card dataset types (`DecoratorNodeValueMap`,
`*Data` types, interface-merged node classes like `interface VideoNode extends
DecoratorNodeValueMap<typeof videoProperties>`), and every base node exports
a narrowing `$is*` guard. The editor's write paths ignore all of it. A field
edit anywhere in the card UI is written as:

```ts
editor.update(() => {
  const node = $getNodeByKey(nodeKey)
  if (node) {
    ;(node as GeneratedDecoratorNodeBase).buttonText = value
  }
})
```

`GeneratedDecoratorNodeBase` (src/nodes/base/generate-decorator-node.ts:216)
carries `[key: string]: unknown` (line 219), so the cast erases the typed
dataset plan 025 built: **any** field name compiles with **any** value type.
A rename in a card spec (`src/nodes/base/nodes/<card>/`) leaves the UI
writing a dead field, and nothing fails until a user notices. The idiom is
also pure boilerplate — the same four-line shape 57 times — which is why it
keeps getting copied.

Two smaller folds compound the same untyped seam:

- HeaderNodeComponent bridges its ~40 assembled props into `HeaderCard`
  through a `{...({...} as any)}` spread (HeaderNodeComponent.tsx:315-363),
  and `HeaderCardProps` ends in `[key: string]: unknown`
  (src/components/ui/cards/HeaderCard/HeaderCard.tsx:80). The cast currently
  masks real drift: the spread passes `header` and `subheader`, which
  `HeaderCard` never destructures (dead props), and passes
  `headerTextEditor: LexicalEditor | null` into an interface that requires
  non-null `LexicalEditor`.
- The card-UI structural types (`DragHandlerLike`, `FileUploaderLike`,
  `FileInputRef`, `FileChangeEvent`) are declared in
  src/components/ui/cards/AudioCard.tsx:18-31 — an arbitrary owner — and
  re-declared with shape drift in three more files (`setRef` optional in one,
  required in another), while the `*Holder` intermediaries in VideoCard and
  ImageCard re-declare the parent's props almost verbatim to do one
  populated/empty fork. Pure interface bookkeeping at every layer.

One typed seam at the write site, one honest props interface at the header
bridge, and one module for the card-UI types deletes all three.

## Current-state evidence

Verified fresh against commit `d998080`:

- **The cast census is 57 `as GeneratedDecoratorNodeBase` casts across 12
  files** (`rg -c 'as GeneratedDecoratorNodeBase' src`):
  `src/nodes/header/HeaderNodeComponent.tsx` 18,
  `src/nodes/VideoNodeComponent.tsx` 17,
  `src/nodes/FileNodeComponent.tsx` 4,
  `src/nodes/ButtonNodeComponent.tsx` 3,
  `src/nodes/CalloutNodeComponent.tsx` 2,
  `src/nodes/BookmarkNodeComponent.tsx` 2,
  `src/nodes/GalleryNodeComponent.tsx` 2,
  `src/utils/imageUploadHandler.ts` 2,
  `src/utils/thumbnailUploadHandler.ts` 2,
  `src/utils/fileUploadHandler.ts` 1,
  `src/utils/audioUploadHandler.ts` 1,
  `src/hooks/useVisibilityToggle.ts` 3.
  Correction to the review brief: the 12 files are **not** all
  `*NodeComponent.tsx` — 7 are node components (48 casts); the other 5 are
  hooks/utils (9 casts). The plan covers all 57.
- **Same idiom, different erased type**: AudioNodeComponent writes through
  `$getNodeByKey(nodeKey) as CardNode | null` at
  src/nodes/AudioNodeComponent.tsx:77,86,120 (`node.title`, `node.thumbnailSrc`,
  `node.triggerFileDialog`). `CardNode` (src/types/lexical-internals.ts:9-16)
  intersects `GeneratedDecoratorNodeBase`, so it inherits the same index
  signature. These 3 write sites are in scope. The `as CardNode` casts in
  `src/plugins/behaviour/*` and `src/components/InklingCardWrapper.tsx` call
  cross-card methods (`isEmpty()`, `getIsVisibilityActive()`) and are NOT in
  scope.
- **The typed alternative already exists in-repo**: ImageNodeComponent and
  HtmlNodeComponent write via `$getNodeByKey` + `$isImageNode`/`$isHtmlNode`
  - direct typed assignment (e.g. ImageNodeComponent.tsx:172-177, 205-210;
    HtmlNodeComponent.tsx:30-34). The seam formalizes this idiom; it does not
    invent one.
- **Every write in the census is a typed dataset field or a declared typed
  accessor** — verified per card: header's `swapped`/`accentColor` and 13
  more are all in `headerProperties` (src/nodes/base/nodes/header/HeaderNode.ts:11-30);
  video's 13 fields in videoProperties (src/nodes/base/nodes/video/VideoNode.ts:10-24)
  plus `set triggerFileDialog` (VideoNode.ts:85-88); image's `previewSrc`/
  `triggerFileDialog` accessors (src/nodes/base/nodes/image/ImageNode.ts:61-76);
  audio's fields + `set triggerFileDialog`
  (src/nodes/base/nodes/audio/AudioNode.ts:39-42, exported as `BaseAudioNode`/
  `$isAudioNode`); file's fields + `set triggerFileDialog`
  (src/nodes/base/nodes/file/FileNode.ts:53-56); gallery's `setImages(images:
GalleryImage[])` method (src/nodes/base/nodes/gallery/GalleryNode.ts:63);
  html's `visibility: Visibility` via `DecoratorNodeValueMap<..., true>`
  (src/nodes/base/nodes/html/HtmlNode.ts:16).
- **Some casts are reads, not writes**: thumbnailUploadHandler.ts:25
  (`.src as string`), useVisibilityToggle.ts:43 (`.visibility as Visibility`),
  GalleryNodeComponent.tsx:51 (`.images as GalleryImage[] | undefined`).
  These migrate to the plain `$is*` guard idiom (no seam call); the seam is
  write-only.
- **Guard-compatibility is proven**: registered card classes extend the base
  nodes — the assembled class from `assembleCardNode`
  (src/nodes/assemble-card-node.ts:54) subclasses the declaration's
  `baseNode`, and header's wrapper `HeaderNode` extends `BaseHeaderNode`
  (src/nodes/HeaderNode.tsx:18) — so `$is<Card>Node` narrows every node the
  components ever see.
- **Each upload handler is single-card**: `imageUploadHandler` is called only
  from ImageNodeComponent, `fileUploadHandler` only from FileNodeComponent,
  `audioUploadHandler` and `thumbnailUploadHandler` only from
  AudioNodeComponent (verified by grep). `useVisibilityToggle` is called only
  from HtmlNodeComponent.tsx:26. Each takes exactly one `$is*` guard.
- **Why the seam is a mutator callback, not a patch object** (the review's
  alternative, rejected on this evidence):
  (a) a patch typed from the card's dataset cannot express the
  transient-prop writes in the census — `triggerFileDialog` and `previewSrc`
  are declared accessors outside the dataset value map;
  (b) applying a patch via `Object.assign` is unsound against getter-only
  accessors (`VideoNode.formattedDuration`, VideoNode.ts:90-96) — the type
  system cannot filter them out of a mapped `Partial<T>`;
  (c) the census contains multi-field writes and read-modify-write
  (VideoNodeComponent.tsx:129-143 writes six fields and reads
  `customThumbnailSrc` to decide two more; :206-216 does
  `n.thumbnailHeight = n.height`) — natural in a mutator, unexpressible or
  awkward in a patch.
- **Known limitation, recorded honestly**: generated classes inherit
  `[key: string]: unknown`, so an unknown field _name_ still compiles through
  the seam. The seam buys: every _known_ field's value type is checked, the
  narrowing guard is explicit per call site, and the idiom shrinks to one
  call. A `test/typecheck` fixture pins the value-type guarantee.
- **Header bridge**: the `as any` spread (HeaderNodeComponent.tsx:315-363)
  passes 41 props. `HeaderCard` never destructures `header` or `subheader`
  (verified across HeaderCard.tsx) — dead keys. The nullability mismatch is
  stale, not real: `setupNestedEditor`
  (src/utils/nested-editors.ts:39-54) **always** assigns a `LexicalEditor`
  instance, so `HeaderNode`'s `declare __headerTextEditor: LexicalEditor |
null` (src/nodes/HeaderNode.tsx:22-25) overstates nullability, and the
  honest chain is non-null end to end (`InklingNestedEditor.initialEditor`
  already requires non-null, src/components/InklingNestedEditor.tsx:25).
- **The `*Like` types and their drift**: canonical-looking declarations in
  AudioCard.tsx:18-31 (`DragHandlerLike` with `setRef?` optional,
  `FileUploaderLike`, `FileInputRef`, `FileChangeEvent`), imported by 7
  files (MediaUploader.tsx:6, ImageCard.tsx:5, VideoCard.tsx:3, FileCard.tsx:1,
  HeaderCard.tsx:8, SettingsPanel.tsx:4, VideoNodeComponent.tsx:5).
  Re-declared with drift: FileNodeComponent.tsx:17-20 (`setRef` **required**),
  GalleryNodeComponent.tsx:20-33 (`setRef` required, plus a wider
  `ImageUploaderLike` with `upload`), GalleryCard.tsx:102-105
  (`ReorderHandlerLike`), 208-217 (`FilesDropperLike` = `DragHandlerLike`,
  `UploaderLike` = `FileUploaderLike` minus the error union). The hooks own
  the truth: `useFileDragAndDrop` returns `UseFileDragAndDropResult`
  (src/hooks/useFileDragAndDrop.ts:8-11) and `useGalleryReorder` returns
  `UseGalleryReorderResult` (src/hooks/useGalleryReorder.ts:20-23); the card
  types are hand-maintained approximations, and the `as DragHandlerLike`
  casts at GalleryNodeComponent.tsx:64 and FileNodeComponent.tsx:60 exist
  only because of the drift.
- **Holder intermediaries**: `VideoHolderProps` (VideoCard.tsx:190-210, 19
  fields) duplicates `VideoCardProps` (237-260) minus the caption props;
  `VideoHolder` (212-235) does one fork — `customThumbnail || thumbnail ||
videoUploader.isLoading` → Populated/Empty. `ImageHolderProps`
  (ImageCard.tsx:35-46, 11 fields) and `ImageHolder` (186-222) are the same
  shape with the fork `previewSrc || src`. Both pass the deletion test:
  folding the fork into the parent concentrates nothing.
- **Public surface**: `src/index.ts` exports none of the touched types or
  cards (verified by grep) — no `verify:package`/`verify:types` run is
  needed.

## Scope

**In scope**:

- A typed write-seam module (path: `src/nodes/base/update-card-node.ts`;
  interface below), re-exported through `src/nodes/base/inkling-default-nodes.ts`
  next to `GeneratedDecoratorNodeBase`, plus a `test/typecheck` fixture
  pinning its guarantees.
- Migrating all 57 `as GeneratedDecoratorNodeBase` casts and
  AudioNodeComponent's 3 `as CardNode` write sites to the seam (writes) or
  the plain `$is*` guard idiom (reads).
- Header: deleting the `as any` spread and the `[key: string]: unknown`
  index signature, dropping the dead `header`/`subheader` keys, and making
  the nested-editor chain non-null end to end.
- One `card-ui-types` module owning `DragHandlerLike`, `FileUploaderLike`,
  `FileInputRef`, `FileChangeEvent`, and the gallery reorder handler type;
  deleting the local re-declarations.
- Folding `VideoHolder` and `ImageHolder` into their parent cards.

**Out of scope**:

- Renderer, serializer, parser, and export code (`src/nodes/base/nodes/**`
  renderers, `exportDOM`, `src/html/`) — plan 040's seam owns those.
- The `as CardNode` casts in `src/plugins/behaviour/*` and
  `src/components/InklingCardWrapper.tsx` (cross-card method calls, not
  field writes).
- Removing the `[key: string]: unknown` index signature from the generator
  (a deeper generator change; the limitation is recorded, not fixed).
- `ImageUploaderLike`'s `upload`-capable shape beyond what the canonical
  `FileUploaderLike` (derived from the context's `FileUploader`) covers.
- Any runtime behavior change, test change, or e2e-visible change.

## Commands you will need

| Purpose                                | Command                                             | Expected on success                                |
| -------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Drift check                            | see header block                                    | empty diff vs `d998080`                            |
| Cast census                            | `rg -c 'as GeneratedDecoratorNodeBase' src`         | matches the census above before Step 1; zero after |
| Stray erased writes                    | `rg -n 'as CardNode' src/nodes src/hooks src/utils` | only out-of-scope plugin/wrapper files remain      |
| Typecheck (includes `test/typecheck/`) | `pnpm typecheck`                                    | exit 0                                             |
| Node-component tests                   | `pnpm vitest run test/unit/nodes`                   | all pass, unchanged expectations                   |
| Full gates                             | `pnpm lint && pnpm format:check && pnpm test:unit`  | 1707 passed + 21 todo (identical to baseline)      |

## Git workflow

- Work directly on `main` — no branch, no push, no PR (batch grilling
  decision, overriding the `advisor/NNN-*` convention in plans/README.md).
- Commit 1: `refactor(nodes): put card-node field writes behind a typed $updateCardNode seam`
- Commit 2: `refactor(header): route header card writes through the seam and type HeaderCard props honestly`
- Commit 3: `refactor(cards): single-source card-ui types and fold Holder intermediaries`

## Steps

### Step 1: Introduce `$updateCardNode` and migrate every non-header write

Create `src/nodes/base/update-card-node.ts` next to the generator:

```ts
import { $getNodeByKey, type LexicalNode, type NodeKey } from 'lexical'

/**
 * The one write seam for card-node fields (CONTEXT.md: "card"). Replaces
 * the `$getNodeByKey` + `as GeneratedDecoratorNodeBase` idiom, which erased
 * the typed datasets: the guard does the narrowing, so every field the
 * mutator writes is checked against the card's own node type. Call inside
 * `editor.update()`. Known limitation: generated node classes inherit
 * `[key: string]: unknown`, so unknown field names still compile — the
 * seam's guarantee is value typing on known fields plus an explicit guard.
 */
export function $updateCardNode<T extends LexicalNode>(
  nodeKey: NodeKey,
  guard: (node: unknown) => node is T,
  update: (node: T) => void,
): void {
  const node = $getNodeByKey(nodeKey)
  if (guard(node)) {
    update(node)
  }
}
```

(Function name and module path fixed; the doc comment may be refined.)

- Re-export it from `src/nodes/base/inkling-default-nodes.ts:1` next to the
  `GeneratedDecoratorNodeBase` export — the seam lives at the same depth as
  the generator whose datasets it types.
- Add a fixture to `test/typecheck/` (extend `card-node-payloads.ts` or add
  `card-node-write-seam.ts`, matching that file's comment conventions):
  a positive case (`$updateCardNode(key, $isVideoNode, node => { node.src =
'x'; node.width = 3 })` compiles) and `@ts-expect-error` cases (wrong
  value type, e.g. `node.src = 5`; a method-only member assigned, e.g.
  `node.setImages = ...` on gallery if it type-errors — keep only cases the
  compiler genuinely rejects). No runtime assertions.
- Migrate every write site, replacing the `$getNodeByKey` + `if (node)` +
  cast body with one seam call, per card with its own guard:
  - `src/nodes/VideoNodeComponent.tsx` (17 casts): guard `$isVideoNode` from
    `@/nodes/base`. The six-field write at :129-143 becomes one seam call;
    the read of `customThumbnailSrc` at :138 is typed inside the mutator.
  - `src/nodes/FileNodeComponent.tsx` (4), `src/nodes/ButtonNodeComponent.tsx`
    (3), `src/nodes/CalloutNodeComponent.tsx` (2),
    `src/nodes/BookmarkNodeComponent.tsx` (2): guards `$isFileNode`,
    `$isButtonNode`, `$isCalloutNode`, `$isBookmarkNode` from `@/nodes/base`.
  - `src/nodes/GalleryNodeComponent.tsx`: the `setImages` write (:72-80)
    becomes `$updateCardNode(nodeKey, $isGalleryNode, node =>
node.setImages(newImages))` — delete the `typeof ... === 'function'`
    dance; the `images` read (:49-52) becomes the plain guard idiom (the
    dataset field is typed `unknown[]`; keep the existing local narrowing to
    `GalleryImage[]` there).
  - `src/nodes/AudioNodeComponent.tsx`: the 3 `as CardNode` writes (:75-91,
    :118-125) become seam calls with `$isAudioNode`.
  - Upload handlers: `imageUploadHandler.ts` (:23-28, :38-47) with
    `$isImageNode`; `fileUploadHandler.ts` (:41-50) with `$isFileNode`;
    `audioUploadHandler.ts` (:39-48) with `$isAudioNode`;
    `thumbnailUploadHandler.ts` (:31-36) with `$isAudioNode`, its `.src`
    read (:22-27) via the plain guard idiom.
  - `src/hooks/useVisibilityToggle.ts`: the `visibility` write (:53-78) via
    `$updateCardNode(nodeKey, $isHtmlNode, ...)` — `visibility` is typed
    `Visibility` on `HtmlNode`, so the `& { visibility: Visibility }`
    intersection and both `as Visibility` casts are deleted; the read
    (:38-44) via the plain guard idiom.
- After migration, `rg -n 'as GeneratedDecoratorNodeBase' src` must match
  nothing, and no migrated file may still import `GeneratedDecoratorNodeBase`
  or `CardNode` for these paths.
- Update CONTEXT.md: add a one-line "card write seam" entry naming
  `$updateCardNode`, in the style of the existing "Render context" entry.

**Verify**: `pnpm typecheck`, then `pnpm vitest run test/unit/nodes` — all
green with zero expectation changes. Runtime proof of zero drift: the seam
body is the old body with `if (node)` strengthened to the guard, and every
call site sits inside the same `editor.update()` it sat in before.

### Step 2: Migrate header's writes and type the NodeComponent→HeaderCard bridge honestly

- Migrate the 18 casts in `src/nodes/header/HeaderNodeComponent.tsx`
  (:98-306, ~15 handlers) to `$updateCardNode(nodeKey, $isHeaderNode, ...)`
  with `$isHeaderNode` from `@/nodes/HeaderNode` (the wrapper guard — the
  registered node is the wrapper class, HeaderNode.tsx:18; its type exposes
  every written field). Two-field writes (:151-159, :235-248, :259-268)
  become single seam calls.
- Tighten the nested-editor chain (evidence: `setupNestedEditor`,
  src/utils/nested-editors.ts:39-54, always assigns an instance):
  `src/nodes/HeaderNode.tsx:22-25` declares become `LexicalEditor`, not
  `LexicalEditor | null`; `HeaderNodeComponentProps`
  (HeaderNodeComponent.tsx:34,40) drops `| null` for both editors. If
  typecheck proves a real null path exists, STOP — do not add a guard to
  paper over it.
- Delete the `{...({...} as any)}` spread (HeaderNodeComponent.tsx:315-363)
  and its two oxlint-disable comments; pass the same object without the cast
  once the interface is honest. Remove the dead `header` and `subheader`
  keys from the object (`HeaderCard` never destructures them — verified).
- `HeaderCardProps` (HeaderCard.tsx:40-81): delete `[key: string]: unknown`
  (line 80). The remaining members already cover the passed props; adjust
  only what typecheck flags, preferring deletion of dead members over
  widening.
- HeaderCard imports `FileChangeEvent` from AudioCard (HeaderCard.tsx:8) —
  leave that import for Step 3.

**Verify**: `pnpm typecheck`; `pnpm vitest run test/unit/nodes` (HeaderNode
tests + the NodeComponent smoke tests). Zero expectation changes.

### Step 3: Single-source the card-UI types and fold the Holder intermediaries

- Create `src/components/ui/cards/card-ui-types.ts`. Canonical definitions —
  derive from the hooks/context that own the truth, do not hand-copy the
  drifted shapes:
  - `DragHandlerLike`: alias of `UseFileDragAndDropResult` — export that
    interface from `src/hooks/useFileDragAndDrop.ts:8-11` and alias it here
    (`setRef: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
isDraggedOver: boolean`).
  - `ReorderHandlerLike`: alias of `UseGalleryReorderResult` — export that
    interface from `src/hooks/useGalleryReorder.ts:20-23` and alias it here.
  - `FileUploaderLike`: `ReturnType<FileUploader['useFileUpload']> &
{ progress?: number }` (`FileUploader` from
    `@/context/InklingComposerContext`:12-27), with `errors` widened to
    `Array<{ message?: string }>` only if typecheck proves a call site needs
    it (VideoNodeComponent.tsx:293-297 mixes `Error[]` with
    `{ name, message }[]` — `Error` is structurally assignable to
    `{ message?: string }`, so the single object shape should suffice).
  - `FileInputRef`, `FileChangeEvent`: as declared in AudioCard.tsx:29,31
    today.
- Update every importer to take these from `card-ui-types` and delete the
  re-declarations: AudioCard.tsx:18-31 (the accidental owner), MediaUploader.tsx:6,
  ImageCard.tsx:5, VideoCard.tsx:3, FileCard.tsx:1, HeaderCard.tsx:8,
  SettingsPanel.tsx:4, VideoNodeComponent.tsx:5, FileNodeComponent.tsx:17-20,
  GalleryNodeComponent.tsx:20-33, GalleryCard.tsx:102-105,208-217.
  `GalleryNodeComponent`'s `ImageUploaderLike` folds into
  `FileUploaderLike` (the context's return type already carries `upload`).
- Delete now-redundant casts: `as DragHandlerLike` at
  GalleryNodeComponent.tsx:64 and FileNodeComponent.tsx:60 (the hook's real
  result type satisfies the alias directly), and the `setRef as (node:
HTMLElement | null) => void` cast at VideoCard.tsx:173 if the canonical
  type makes it unnecessary.
- Fold the Holders (deletion test — folding concentrates nothing):
  - VideoCard.tsx: move the `showPopulatedCard` fork (:221) into `VideoCard`,
    delete `VideoHolder` and `VideoHolderProps` (:190-235); `VideoCard`
    renders `PopulatedVideoCard`/`EmptyVideoCard` inside its existing
    `<figure>`.
  - ImageCard.tsx: move the `previewSrc || src` fork (:198) into `ImageCard`,
    delete `ImageHolder` and `ImageHolderProps` (:35-46, :186-222).
  - JSX structure, class names, data attributes, and prop drilling to
    Populated/Empty stay byte-identical — these files have Storybook stories
    and unit smoke tests watching them.

**Verify**: `pnpm typecheck`; `pnpm vitest run test/unit/nodes
test/unit/components` (card suites: `test/unit/components/ImageCard.test.tsx`,
`test/unit/components/ui/{HeaderCard,VideoCard}.test.tsx`); then full gates:
`pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm test:unit` = 1707
passed + 21 todo, identical to baseline.

## Test plan

| Scenario                | Command                                              | Required invariant                                   |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Seam typing is real     | `pnpm typecheck`                                     | fixture's `@ts-expect-error` cases error as pinned   |
| Cast census empty       | `rg -n 'as GeneratedDecoratorNodeBase' src`          | no matches after Step 2                              |
| Node-component behavior | `pnpm vitest run test/unit/nodes`                    | 8 `*NodeComponent.test.tsx` suites pass, unedited    |
| Card UI behavior        | `pnpm vitest run test/unit` (after Step 3)           | card/story-adjacent suites pass, unedited            |
| No renderer drift       | `pnpm vitest run test/nodes-base test/html-renderer` | 730 passed + 21 todo, unedited                       |
| Full gates              | `pnpm format:check && pnpm lint && pnpm test:unit`   | 1707 passed + 21 todo; lint 0 warnings; format clean |

No e2e run: the change is type-level with one deliberate, unreachable-path
guard narrowing, and no e2e asserts on these internals. Run
`pnpm test:e2e:quiet` only if a STOP-condition investigation changes runtime
code.

## Acceptance criteria

- `rg -n 'as GeneratedDecoratorNodeBase' src` finds nothing; the 57 casts
  are seam calls (writes) or `$is*` guard idioms (reads), and
  AudioNodeComponent's 3 `as CardNode` writes are gone too.
- `src/nodes/base/update-card-node.ts` exists with the mutator-callback
  interface above, re-exported from `src/nodes/base/inkling-default-nodes.ts`;
  a `test/typecheck` fixture pins its value-type guarantee.
- `HeaderCardProps` has no index signature; the `as any` spread and both
  oxlint-disable comments are deleted; the header/subheader nested-editor
  chain is non-null end to end.
- One `card-ui-types` module owns `DragHandlerLike`, `ReorderHandlerLike`,
  `FileUploaderLike`, `FileInputRef`, `FileChangeEvent`; the local
  re-declarations (FileNodeComponent, GalleryNodeComponent, GalleryCard,
  AudioCard) are deleted, and the `as DragHandlerLike` casts are gone.
- `VideoHolder`/`VideoHolderProps` and `ImageHolder`/`ImageHolderProps` are
  deleted; their forks live in `VideoCard`/`ImageCard`.
- Every gate passes with the exact baseline counts and zero test-file
  modifications (`git diff --stat -- test/` shows only the typecheck
  fixture).
- CONTEXT.md gained a "card write seam" entry.

## STOP conditions

- **Any test expectation needs changing.** Revert the step's commit; the
  standing red line applies — never update expectations to mask drift.
  Type-level steps cannot drift runtime; a red test means the migration
  changed semantics (most likely suspect: the guard is genuinely narrower
  than the old `if (node)` somewhere). Report the site.
- **Typecheck proves a null path for header's nested editors.** The
  `| null` was load-bearing after all — keep the nullable type, add the
  honest guard in HeaderNodeComponent instead of tightening
  `HeaderNode.tsx`, and record the evidence in the plan's execution notes.
- **A write in the census is not expressible through the card's node type**
  (a field neither in the dataset value map nor a declared accessor). That
  is a missing accessor on the base node — add the typed accessor (pattern:
  `set triggerFileDialog`, VideoNode.ts:85-88), do not keep a cast.
- **`FileUploaderLike`'s canonical shape rejects a call site.** A consumer
  passes something the context's `FileUploader` contract doesn't describe —
  investigate the actual runtime shape and report; widen the alias only as
  the recorded outcome of that investigation, never to silence the error.
- **Folding a Holder changes rendered output** (story/unit snapshots,
  attribute order). Un-fold that one card, keep the other, record why.
- Any verification command fails twice after a focused fix.

## Rollback plan

Each step is one commit on `main`; revert the offending step alone with
`git revert <sha>`. The steps are independent: Step 2 depends only on the
Step-1 seam existing (if Step 1 rolls back, Step 2's header writes roll back
with it — the Step-2 header-props honesty work should then be re-committed
alone, it doesn't need the seam). Step 3 touches no write path and rolls
back cleanly at any point. Because every step is type-level, rollback can
never require a data migration or a test-expectation restore — if it seems
to, that is itself the signal a STOP condition was missed.

## Execution notes

Plan 044 landed in four commits on main (`66a231f..cde26e3`) plus two
follow-ups. Step 1 (`66a231f`) added the `$updateCardNode(nodeKey, guard,
update)` seam in `src/nodes/base/update-card-node.ts` (re-exported from
`@/nodes/base/inkling-default-nodes`) and migrated the card-node field
writes behind it. Step 2 (`ff23ce8`) routed header card writes through the
seam and typed `HeaderCard` props honestly. Step 3 (`0cf0929`)
single-sourced the card-ui types and folded the Holder intermediaries.
The write-cast census went 57 → 3.

Step 4 (`cde26e3`) is a deliberate local revert, taken under the plan's
STOP conditions: `useVisibilityToggle`'s tests drive the hook with a
structural test double (a plain-object `$getNodeByKey` mock), so the
seam's `$isHtmlNode` instanceof narrowing can never match there. At the
fork the orchestrator chose option (a): keep the three residual casts
(`useVisibilityToggle.ts:43,60,72`) rather than force the seam onto a
call site whose tests can't see it. The exception is recorded in
CONTEXT.md under "Card write seam" (`docs(context): note the
useVisibilityToggle exception to the write seam`), and a post-review nit
added an in-file comment pointing at it.

Known limitation (pinned in `test/typecheck/card-node-write-seam.ts`):
the generated card classes carry `[key: string]: unknown`, so the seam
guarantees the value types of _known_ fields, not exhaustiveness against
arbitrary string keys.

Reviews: spec and quality both APPROVED. Remaining quality nits
(`HeaderNodeComponent` redundant spread/`?.`, `FileNodeComponent` possibly
redundant `as Parameters<…>` casts — noted by review as compile-unverified)
were deferred to plans 046/048. Gates at HEAD: full unit 207 files /
1746 passed / 21 todo; nodes-base+html-renderer 46 files / 735 passed /
21 todo; typecheck/lint/format:check clean.
