# Plan 045: One media-upload intent module

> **Executor instructions**: This plan consolidates the six near-clone media
> upload flows (four handler modules plus video's and gallery's inline
> re-implementations) behind one upload-intent module: file(s) and per-card
> metadata extraction in, typed node patch out through plan 044's write seam,
> object-URL preview lifecycle created and revoked in one place, and the
> trigger-on-insert / initial-file effects owned once. The design is decided;
> do not redesign the module. Characterize current behavior FIRST — every
> migration commit must keep the pinned behavior identical, including each
> card's divergent empty-result and rejection policy. Interface names marked
> "illustrative" may be refined by the executor; the shape (one headless
> runner, one preview-lease owner, one pair of effect hooks, patches through
> 044's seam) may not. **Plan 044 must land before Step 2.**
>
> Batch decisions (2026-07-16 grilling): work commits **directly on `main`** —
> no branches, no push, no PRs (this overrides the `advisor/NNN-<slug>`
> convention in `plans/README.md`). Conventional commit messages
> (`refactor:`, `fix:`, `test:`, `docs:`, `chore:`). One plan per candidate;
> execution follows dependency order — 044 lands before this plan.
>
> **Drift check (run first)**: baselines were taken at commit `d998080` —
> `pnpm test:unit` = 206 files / 1707 passed / 21 todo;
> `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730
> passed / 21 todo. Before starting, run
> `git diff --stat d998080..HEAD -- src/utils src/hooks src/nodes src/plugins test/unit`
> and expect non-empty output only where plans 041–044 record touches;
> anything else means re-baseline and reassess before writing code.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM — behavior-preserving consolidation of demo-visible upload
  flows that e2e specs pin end-to-end; gallery's multi-file flow and video's
  thumbnail sub-flow have real ordering constraints
- **Confidence**: HIGH
- **Depends on**: 044 (the typed write seam for dynamic card-node props; this
  plan's module emits every node patch through it)
- **Category**: architecture deepening / upload-flow consolidation
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

One intent — _the user picked file(s); preview locally, upload, extract
metadata, write the result onto the card node_ — is implemented six times
with three different object-URL ownership patterns, and the two effects that
kick the flow off are copy-pasted into four card components each. The
skeleton is small but has no single interface, so every card re-carries it
and the copies drift in exactly the places where leak and race bugs live:

- The preview-URL lifecycle has three owners. The handlers revoke in
  `finally` (imageUploadHandler.ts:48-50, audioUploadHandler.ts:49-51).
  Video keeps a `previewThumbnailUrlRef` (VideoNodeComponent.tsx:56) with a
  hand-rolled replace-and-revoke callback (:68-72) and a separate
  unmount-cleanup effect (:75-80). Gallery keeps a `Set<string>` in
  `previewUrlsRef` (GalleryNodeComponent.tsx:55), revokes per-image on
  success (:163-164), on delete (:83-86), on failure (:143-144), and
  wholesale on unmount (:95-101). Three implementations of "create on
  select, revoke when done or gone" — each one a place a leak or a
  double-revoke can hide, and each one auditable only by reading the whole
  component.
- Every node write is an untyped `(node as GeneratedDecoratorNodeBase).foo =
bar` cast (e.g. imageUploadHandler.ts:26,41-46,
  VideoNodeComponent.tsx:129-161, FileNodeComponent.tsx:81,105,116,132).
  Plan 044 puts those writes behind a typed seam; the upload flows are its
  largest single cluster of callers, so they should flow through the seam
  from one module rather than be migrated six times.
- The `triggerFileDialog` open-picker-on-insert effect (~25 lines, same
  "setTimeout … dev mode" comment) exists in Image
  (ImageNodeComponent.tsx:233-256), Audio (AudioNodeComponent.tsx:107-130),
  Video (VideoNodeComponent.tsx:247-270), and File
  (FileNodeComponent.tsx:121-141) — with three different dependency-array
  idioms (see evidence). The `uploadInitialFile` init effect is likewise
  repeated four times with four different guards.
- The `UploadFn` type is declared four times (imageUploadHandler.ts:7,
  audioUploadHandler.ts:8, fileUploadHandler.ts:11,
  thumbnailUploadHandler.ts:5-8 — the last carrying the `formData` variant),
  plus a fifth structural copy as gallery's `ImageUploaderLike`
  (GalleryNodeComponent.tsx:25-33).

Deepening this into one module gives the codebase a single interface to
audit for the preview lifecycle (the leak habitat), a single implementation
of the two kickoff effects (today's three re-fire semantics collapse into
one documented one), and one adapter through which every upload-driven node
patch reaches plan 044's seam. Per-card variance — metadata extraction and
the empty-result policy — stays local to each card as data, not as six
copies of the skeleton.

## Current-state evidence

Verified fresh against commit `d998080`. Where the review brief diverged
from the code, the code wins — corrections are marked **(correction)**:

- The four handlers in `src/utils/`:
  - `imageUploadHandler` (imageUploadHandler.ts:9-53): null-guard →
    `URL.createObjectURL(files[0])` preview → set `previewSrc` →
    `getImageDimensions(previewUrl)` → `upload()` → patch
    `{ width, height, src: imageSrc ?? '', previewSrc: null }` →
    `revokePreviewUrl` in `finally`. On an empty upload result it still
    writes `src: ''` and clears `previewSrc` (:44-45). Rejections
    propagate (pinned by test).
  - `audioUploadHandler` (audioUploadHandler.ts:10-54): null-guard → object
    URL used for **metadata only** (`getAudioMetadata(objectURL)`; no
    `previewSrc` is ever set) → `upload()` → **bails early, node
    untouched, when `result?.[0]?.url` is falsy** (:28-30) → patch
    `{ duration, src, mimeType, title }` (`title` via
    `prettifyFileName`) → revoke in `finally`.
  - `fileUploadHandler` (fileUploadHandler.ts:13-53): null-guard →
    `upload()` — **no object URL at all (correction**: the brief's "guard →
    object-URL preview" skeleton is literally true only for image; file and
    thumbnail have no preview stage**)** → bails on `!result ||
!result[0]` (:27-29, with an explanatory comment about the empty-state
    fallback) → patch `{ fileTitle, fileName, fileSize, src: src ?? '' }`.
  - `thumbnailUploadHandler` (thumbnailUploadHandler.ts:10-39): null-guard →
    **reads `node.src` first** (`getEditorState().read`, :22-27) and passes
    it as `formData: { url: mediaSrc }` to an extended `UploadFn` (:29) →
    writes `thumbnailSrc` only when `uploadResult?.[0]?.url` is truthy
    (:33). Only caller: AudioNodeComponent (:72, :98) — video's thumbnail
    flow is a separate inline implementation.
- The two inline re-implementations:
  - `VideoNodeComponent.handleVideoUpload` (:94-164): `extractVideoMetadata`
    failure is **caught** and surfaced via `setMetadataExtractionErrors`
    with the exact message `The file type you uploaded is not supported.
Please use .${videoMimeTypes.join(', .').toUpperCase()}` (:106-113),
    then returns; on success sets a preview thumbnail object URL (:116-118);
    empty `videoUrl` clears the preview and returns with the node untouched
    (:123-126); patches `{ src, duration, fileName, width, height,
mimeType }` plus `thumbnailWidth/Height` only when
    `customThumbnailSrc` is unset (:128-144); then a **thumbnail
    sub-flow** (:146-161): builds `new File([thumbnailBlob],
\`${file.name}.jpg\`, { type: 'image/jpeg' })`, uploads via the
`mediaThumbnail`uploader with`formData: { url: videoUrl }`, writes
`thumbnailSrc`, and finally clears the preview (:163).
**(correction**: the brief lists two inline flows, but the same file
has a third one — `handleCustomThumbnailChange`(:174-192):`image`uploader →`getImageDimensions(imageUrl)`on the **result** URL →
patch`{ customThumbnailSrc, thumbnailWidth, thumbnailHeight }`. It is
    the same intent and is in scope for migration.**)**
  - `GalleryNodeComponent.handleImageUploads` (:103-176): multi-file; caps
    at `MAX_IMAGES` (= 9, re-exported via the `src/nodes/GalleryNode.ts`
    shim from `@/nodes/base/nodes/gallery/GalleryNode`) with the exact
    message `'Galleries are limited to 9 images'` (:109); per file: object
    URL → tracked in `previewUrlsRef` → `getImageDimensions(previewSrc)` →
    pushed to **local React state first** (:132-135, `recalculateImageRows`
    included); one batched `upload(strippedFiles)` (:138); on falsy result,
    strips the new images' previews, revokes them, and sets
    `'Something went wrong while uploading images. Please refresh the page
and try again'` (:140-151); on success matches results to previews by
    `fileName` (:158), revokes each preview, and only then writes the node
    via `setImages` (:72-80 → `galleryNode.setImages`). Reorder interplay:
    `useGalleryReorder` matches dragged images by `src` **or `previewSrc`**
    (useGalleryReorder.ts:140) and reorders by identity (:102), so a user
    can reorder while uploads are in flight — the migrated flow must keep
    local-state-first ordering and identity semantics.
- The `triggerFileDialog` effect, four copies — near-verbatim body but
  **not** identical **(correction**: the brief says verbatim**)**:
  Image (:233-256, comment at :233-234, deps `[triggerFileDialog, nodeKey,
editor, fileInputRef]`), Audio (:107-130, comment at :107-108, **no deps
  array** — re-checked every render), Video (:247-270, comment at
  :247-248, **no deps array**), File (:121-141, **no comment**, deps
  `[openFileSelection]` — a stable module import, so effectively mount-only
  — with an `oxlint-disable`). All four clear the flag by writing
  `triggerFileDialog = false` on the node inside the timeout. Once-only
  firing is pinned by test/unit/nodes/ImageNodeComponent.test.tsx:100-112
  (mocked `openFileSelection`, `toHaveBeenCalledTimes(1)`).
- The `uploadInitialFile` init effect, four copies with **four different
  guards (correction**: brief implies repetition; the guards diverge**)**
  — Image (:153-195: `file && !src`; the effect is shared with
  `populateImageDimensions`, which is **not** upload flow and stays put),
  Audio (:50-63: `file && !src && !audioUploader.isLoading`), Video
  (:82-92: `file && !videoUploader.isLoading` — no src check), File
  (:62-72: `file && !fileSrc`).
- Image-only extra flow: the `data:`-URL conversion effect
  (ImageNodeComponent.tsx:130-151) also calls `imageUploadHandler` (:142);
  `onFileChange` resets `node.src = ''` before invoking the handler
  (:205-212) — a pre-upload patch the runner must model. The same reset
  exists in FileNodeComponent (:77-85) and HeaderNodeComponent (:139-143).
  ImagePlugin.tsx:21-28 wraps the handler in a `handleImageUpload` callback
  used only in a deps array — migrate the call, do not delete the callback
  in this plan.
- `backgroundImageUploadHandler` (imageUploadHandler.ts:61-82, used only by
  HeaderNodeComponent.tsx:146) **(correction**: the brief does not mention
  it**)**: upload → dimensions from the **result** URL → returns metadata;
  it performs **no node write** (header patches `backgroundImageSrc/Width/
Height` itself at :151-159). Not a seam migration target; keep its
  behavior identical (re-home with the module or leave in place — executor
  detail).
- Call-site inventory for deletion-time safety: `imageUploadHandler` —
  ImageNodeComponent :142, :157, :212, :295 and ImagePlugin.tsx:24;
  `audioUploadHandler` — AudioNodeComponent :53, :67, :94;
  `thumbnailUploadHandler` — AudioNodeComponent :72, :98;
  `fileUploadHandler` — FileNodeComponent :57, :65, :85. None of the
  handlers is exported from `src/index.ts` (verified — no `upload` matches
  in the barrel), so nothing here is public surface.
- Existing pins: test/unit/utils/imageUploadHandler.test.ts (3 cases:
  create/revoke lifecycle on success, revoke on upload rejection, revoke on
  metadata failure — rejections pinned to propagate) and
  test/unit/utils/audioUploadHandler.test.ts (3 cases incl. the empty-URL
  early bail). **No tests exist for `fileUploadHandler` or
  `thumbnailUploadHandler`.** Component tests pin only fragments:
  ImageNodeComponent (render + trigger-once), AudioNodeComponent (render),
  VideoNodeComponent (loop toggle only), GalleryNodeComponent (render +
  `onFileChange` adapter).
- E2E pins the real flows: test/e2e/cards/gallery-card.test.ts (upload
  :177, 9-image limit :309, reorder-after-upload ~:355-465),
  image-card.test.ts, video-card.firefox.test.ts, audio-card.test.ts,
  file-card.test.ts.
- The card declarations already name the transient props these flows
  consume — `triggerFileDialog` and `initialFile` in image.declaration.ts
  (:20-34, plus `previewSrc` with `datasetKey: '__previewSrc'`),
  video.declaration.ts (:19-26), audio.declaration.ts (:7-14),
  file.declaration.ts (:7-13); the mechanism is `TransientPropSpec`
  (generate-decorator-node.ts:128-167). **No declaration changes are
  needed** — the hooks attach to the props the declarations already name.
- `revokePreviewUrl` (src/utils/revokePreviewUrl.ts) guards on the `blob:`
  prefix; `openFileSelection` (src/utils/openFileSelection.ts:9-11) just
  clicks the input ref.
- Plan 044's write seam is not yet on disk at planning time (only plan 040
  exists under `plans/`); its landed module and symbol names are the
  executor's source of truth. This plan refers to it as "044's write seam"
  and forbids reintroducing the raw `GeneratedDecoratorNodeBase` cast for
  upload patches.

## Scope

**In scope**:

- One headless upload-intent module (illustrative path:
  `src/utils/upload-intent.ts`) owning: the single `UploadFn` type home
  (including the `formData` variant); the object-URL preview lease (create
  on select, revoke on done/unmount/failure — one implementation over
  `revokePreviewUrl`); and the intent runner — file(s) + per-card metadata
  extractor + uploader in, typed node patch out through plan 044's write
  seam, with the pre-upload patch (src reset) and per-card empty-result
  policy as options.
- One pair of effect hooks (illustrative: `useTriggerFileDialog`,
  `useInitialFileUpload` under `src/hooks/`) owning the two duplicated
  effects; they attach to the `triggerFileDialog` / `initialFile` transient
  props the card declarations already name.
- Migrating the four handlers (and all enumerated call sites, including
  ImagePlugin.tsx:24 and the image `data:`-URL effect), video's three
  inline flows, and gallery's multi-file flow onto the module; deleting the
  four handler modules and the duplicated refs/effects.
- Characterization tests for everything currently unpinned.

**Out of scope**:

- `backgroundImageUploadHandler`'s behavior (no node write; re-home at
  most, zero behavior change) and HeaderNodeComponent's own patches.
- `populateImageDimensions` (ImageNodeComponent.tsx:168-191) — dimension
  backfill, not upload flow.
- The `mediaThumbnail`/`image`/`video`/`audio`/`file` uploader hooks
  themselves (`fileUploader.useFileUpload`, InklingComposerContext.tsx:13)
  — host-provided; unchanged.
- `useFileDragAndDrop`, `useGalleryReorder`, `extractVideoMetadata`,
  `getImageDimensions`, `getAudioMetadata` — inputs to the flow, not the
  flow; unchanged.
- Adding anything to `src/index.ts` — the module stays internal.
- Fixing suspected leak/race bugs beyond what single-ownership of the
  lifecycle delivers structurally; behavior stays pinned.

## Commands you will need

| Purpose                 | Command                                                                                                                                                                                                  | Expected on success                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Drift baseline          | `pnpm test:unit`                                                                                                                                                                                         | 206 files / 1707 passed / 21 todo before Step 1 |
| Render-side invariant   | `pnpm vitest run test/nodes-base test/html-renderer`                                                                                                                                                     | 46 files / 730 passed / 21 todo — never moves   |
| Handler pins            | `pnpm vitest run test/unit/utils`                                                                                                                                                                        | green; re-pointed files keep expectations       |
| Per-card component pins | `pnpm vitest run test/unit/nodes/<Card>NodeComponent.test.tsx`                                                                                                                                           | green, expectations unchanged from Step 1       |
| Static + full gates     | `pnpm typecheck && pnpm lint && pnpm test:unit`                                                                                                                                                          | all pass (unit builds via `pretest:unit`)       |
| Format                  | `pnpm format && pnpm format:check`                                                                                                                                                                       | exits 0                                         |
| Card e2e (final gate)   | `pnpm test:e2e:quiet test/e2e/cards/image-card.test.ts test/e2e/cards/video-card.firefox.test.ts test/e2e/cards/gallery-card.test.ts test/e2e/cards/audio-card.test.ts test/e2e/cards/file-card.test.ts` | green — these flows are demo-visible            |

## Git workflow

- Branch: none — commit directly on `main` (batch decision); do not push.
- Commit 1: `test(uploads): characterize handler, inline-flow, and effect behavior`
- Commit 2: `refactor(uploads): introduce the upload-intent module`
- Commit 3: `refactor(uploads): route card upload handlers through the intent module`
- Commit 4: `refactor(uploads): migrate video inline flows to the intent module`
- Commit 5: `refactor(uploads): migrate gallery multi-file flow to the intent module`
- Commit 6: `refactor(uploads): own trigger-on-insert and initial-file effects once`
- Commit 7: `test(uploads): guard the upload seam and run full gates`
- Do not push or open a PR.

## Steps

### Step 1: Characterize current upload behavior

Lock current behavior before touching production code:

- Run `pnpm test:unit`; record the green baseline (expect 1707 passed / 21
  todo; the new pins below raise the count — record the new number in the
  commit message).
- Add `test/unit/utils/fileUploadHandler.test.ts`: null-input bail;
  failed-upload bail (`!result || !result[0]`, node untouched);
  success patch `{ fileTitle, fileName, fileSize, src }`; `src: ''` when
  the result item lacks `url`.
- Add `test/unit/utils/thumbnailUploadHandler.test.ts`: reads current
  `node.src` and passes it as `formData: { url }`; writes `thumbnailSrc`
  only when a URL comes back; node untouched otherwise.
- Extend `test/unit/nodes/VideoNodeComponent.test.tsx` to pin
  `handleVideoUpload`: metadata-extraction failure sets the exact error
  message and writes nothing; success writes the full patch (including the
  `customThumbnailSrc`-unset conditional thumbnail dimensions); the
  thumbnail sub-flow uploads a synthesized `${file.name}.jpg` via
  `mediaThumbnail` with `formData: { url: videoUrl }`; the preview
  thumbnail is set, then cleared; empty `videoUrl` clears the preview and
  leaves the node untouched.
- Extend `test/unit/nodes/GalleryNodeComponent.test.tsx` to pin
  `handleImageUploads`: the 9-image cap message; the failure path
  (previews stripped and revoked, exact error message, node written with
  cleaned images); result-to-preview matching by `fileName`; preview revoke
  on success; revoke-all on unmount. Mock
  `@/utils/getImageDimensions` and the uploader as the existing suites do.
- Pin the effects: trigger-once tests for Audio, Video, and File mirroring
  Image's (mock `@/utils/openFileSelection`, assert single call and that
  the node flag is cleared); an `initialFile` kickoff pin per card
  respecting its current guard (`!src` for image/audio/file,
  `!uploader.isLoading` for audio/video).
- Record the per-card policy matrix (empty-result behavior, rejection
  propagation, pre-upload src reset) in the commit message — it is the
  contract the runner's options must reproduce.

### Step 2: Introduce the upload-intent module

Create the headless module (path illustrative, e.g.
`src/utils/upload-intent.ts`), with unit tests, changing **no** call sites:

- The single `UploadFn` type (both arities: plain and the
  `formData`-carrying variant used by thumbnail/video/gallery flows).
- The preview-lease owner (illustrative: `createPreviewLease(file | blob)`
  → `{ url, release() }`, idempotent release, built on
  `revokePreviewUrl`'s `blob:` guard) — the one place
  `URL.createObjectURL` is called for upload previews.
- The intent runner (illustrative: `runUploadIntent({ files, uploader,
extractMetadata, patch, onEmptyResult, prePatch })`): guard → optional
  pre-upload node patch (the src reset) → optional preview lease →
  per-card `extractMetadata` → `upload()` → typed node patch **through
  plan 044's write seam** (use 044's landed export; do not cast to
  `GeneratedDecoratorNodeBase`) → lease release in `finally`. Options
  express the Step-1 matrix: image's write-`''`-anyway, audio/file's
  early bail, thumbnail's write-only-on-URL, rejection propagation.
- Module unit tests (illustrative: `test/unit/utils/upload-intent.test.ts`)
  replaying the Step-1 matrix against a headless editor.
- All Step-1 tests stay green unchanged. `pnpm typecheck`, `pnpm lint`.

### Step 3: Migrate the four handlers onto the module

- Re-implement `imageUploadHandler`, `audioUploadHandler`,
  `fileUploadHandler`, and `thumbnailUploadHandler` as thin per-card
  configurations of the runner (metadata extractor + empty-result policy +
  pre-patch), or delete the four modules and move the six call-component
  sites plus ImagePlugin.tsx:24 onto the module directly. Prefer deletion —
  the call-site inventory is complete and nothing is public.
- If deleted, re-point `test/unit/utils/imageUploadHandler.test.ts` and
  `audioUploadHandler.test.ts` at the module with **expectations
  unchanged** (create/revoke lifecycle, rejection propagation, empty-URL
  bail). `fileUploadHandler.test.ts` / `thumbnailUploadHandler.test.ts`
  from Step 1 survive as-is or move with the same treatment.
- Migrate ImageNodeComponent's remaining call sites (:142 data-URL effect,
  :157 initial effect, :212 with its :205-210 src reset as the runner's
  pre-patch, :295 drop) and AudioNodeComponent's five (:53, :67, :72, :94,
  :98).
- `backgroundImageUploadHandler` keeps its exact behavior (re-home next to
  the module or leave; executor detail).
- Run `pnpm vitest run test/unit/utils test/unit/nodes
test/unit/plugins/ImagePlugin.test.tsx` — green, zero expectation drift.

### Step 4: Migrate video's inline flows

- `handleVideoUpload` becomes a runner configuration: extractor =
  `extractVideoMetadata` with its **caught** failure mapped to
  `setMetadataExtractionErrors` (exact message preserved), preview lease on
  the thumbnail blob, empty-`videoUrl` policy = clear preview + node
  untouched, the `customThumbnailSrc`-unset conditional in the patch.
- The thumbnail sub-flow becomes a second, sequentially-composed runner
  call (synthesized `File`, `mediaThumbnail` uploader, `formData: { url:
videoUrl }`) — do not invent a declarative chain; imperative composition
  in the component is the honest shape.
- `handleCustomThumbnailChange` becomes a third runner configuration
  (dimensions from the result URL, no preview lease).
- Delete `previewThumbnailUrlRef`, `setPreviewThumbnailWithCleanup`, and
  the unmount-cleanup effect (:56, :68-80); the component's unmount
  release comes from the lease owner (executor detail: a small
  `usePreviewLease` hook bridging the lease to React state for
  `previewThumbnail`).
- `pnpm vitest run test/unit/nodes/VideoNodeComponent.test.tsx` — Step-1
  pins green unchanged.

### Step 5: Migrate gallery's multi-file flow

- `handleImageUploads` becomes a multi-file runner configuration: per-file
  leases from one owner (replacing `previewUrlsRef`, :55), batched upload,
  fileName-matched result merge, local-state-first then `setNodeImages`
  ordering, `recalculateImageRows` calls, both exact error messages, and
  the failure cleanup all preserved.
- `deleteImage`'s per-image revoke (:83-86) and the unmount
  revoke-all effect (:95-101) delegate to the lease owner.
- Preserve the reorder interaction exactly: previews must remain matchable
  by `previewSrc` (useGalleryReorder.ts:140) and image identity must be
  stable while uploads are in flight.
- `pnpm vitest run test/unit/nodes/GalleryNodeComponent.test.tsx` — Step-1
  pins green unchanged.

### Step 6: Own the trigger-on-insert and initial-file effects once

- Add the effect hooks (illustrative: `useTriggerFileDialog({ editor,
nodeKey, fileInputRef, triggerFileDialog })` and `useInitialFileUpload({
initialFile, isReady, run })` under `src/hooks/`).
- `useTriggerFileDialog` fires when the prop is true (the audio/video
  every-render semantics, which subsume image's deps-pinned and file's
  mount-only cases for the insert flow), keeps the `setTimeout` + cleanup
  and the shared comment, and clears the flag **through 044's write seam**.
  The once-only pin (ImageNodeComponent.test.tsx:100-112 and its new
  siblings) must pass unchanged.
- `useInitialFileUpload` takes each card's existing guard as `isReady`
  (image `!src`, audio `!src && !isLoading`, video `!isLoading`, file
  `!fileSrc`) — the guards stay per-card data, not a new unified policy.
- Delete the four trigger effects and four initial-file effects. Image's
  combined effect keeps `populateImageDimensions` in place
  (ImageNodeComponent.tsx:168-191); only its upload part moves.
- Full unit suite green; `pnpm typecheck`, `pnpm lint`.

### Step 7: Guard the seam; run full gates

- Add a shrink-only import guard (executor detail: a small Vitest file
  reading sources, mirroring test/nodes-base/nodes/render-policy-imports.test.ts):
  no file under `src/nodes/` or `src/plugins/` may call
  `URL.createObjectURL` / `URL.revokeObjectURL` directly — the lease owner
  is the only caller outside `src/utils/extractVideoMetadata.ts` (internal
  to metadata extraction, allowlisted).
- Confirm nothing new reached `src/index.ts`; if any type leaked into the
  barrel, keep it internal instead — only if the public surface actually
  changed would `pnpm verify:package` / `pnpm verify:types` be required
  (they are not, by design).
- Run: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit` (expect the recorded new baseline), and the render-side
  invariant `pnpm vitest run test/nodes-base test/html-renderer` (still 730
  passed / 21 todo — this plan touches nothing under `src/nodes/base/`).
- Final gate — the demo-visible card e2e specs:
  `pnpm test:e2e:quiet test/e2e/cards/image-card.test.ts
test/e2e/cards/video-card.firefox.test.ts
test/e2e/cards/gallery-card.test.ts test/e2e/cards/audio-card.test.ts
test/e2e/cards/file-card.test.ts`.

## Test plan

| Scenario                 | Command                                                                                                     | Required invariant                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Baseline                 | `pnpm test:unit`                                                                                            | 1707 passed / 21 todo before Step 1               |
| Handler characterization | `pnpm vitest run test/unit/utils`                                                                           | new pins green; matrix recorded                   |
| Video/gallery flow pins  | `pnpm vitest run test/unit/nodes/VideoNodeComponent.test.tsx test/unit/nodes/GalleryNodeComponent.test.tsx` | exact messages, ordering, revoke lifecycle pinned |
| Handler migration        | `pnpm vitest run test/unit/utils test/unit/plugins`                                                         | expectations unchanged (imports may move)         |
| Video migration          | `pnpm vitest run test/unit/nodes/VideoNodeComponent.test.tsx`                                               | Step-1 pins green unchanged                       |
| Gallery migration        | `pnpm vitest run test/unit/nodes/GalleryNodeComponent.test.tsx`                                             | Step-1 pins green unchanged; reorder intact       |
| Effect unification       | `pnpm vitest run test/unit/nodes`                                                                           | once-only pins green for all four cards           |
| Render-side invariant    | `pnpm vitest run test/nodes-base test/html-renderer`                                                        | 730 passed / 21 todo — untouched                  |
| Full gates               | `pnpm typecheck && pnpm lint && pnpm test:unit`                                                             | all pass                                          |
| Demo-visible e2e         | five card specs (Step 7)                                                                                    | green                                             |

## Acceptance criteria

- One module owns the upload intent: guard, optional pre-patch, preview
  lease, metadata extraction, upload, typed patch through plan 044's write
  seam, release-in-`finally`. The four handler modules are deleted or are
  trivial re-exports; `UploadFn` has exactly one home.
- `URL.createObjectURL` for upload previews is called in exactly one place;
  video's `previewThumbnailUrlRef` + cleanup effect and gallery's
  `previewUrlsRef` + cleanup effect are gone, and the guard test keeps
  `src/nodes/` and `src/plugins/` free of direct object-URL calls.
- The `triggerFileDialog` and `uploadInitialFile` effects each exist once;
  the four per-card copies are deleted, once-only firing stays pinned, and
  per-card initial-file guards are preserved as data.
- Every Step-1 pinned expectation passes unchanged (imports may be
  re-pointed); per-card empty-result and rejection policies are provably
  identical to the recorded matrix.
- No raw `GeneratedDecoratorNodeBase` cast remains in any upload path; all
  upload-driven node patches go through 044's seam.
- Nothing was added to `src/index.ts`; `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit`, and the five card e2e specs are green.

## STOP conditions

- **Standing red line**: any Step-1 pinned expectation drifts in a
  migration commit. Revert that one commit, keep the characterization
  tests, reassess the runner option involved — never update expectations to
  mask drift.
- Plan 044 has not landed (no typed write seam on `main`). Step 1
  (characterization) may ship alone; do not start Step 2, and do not bridge
  the gap with the raw `GeneratedDecoratorNodeBase` cast "temporarily" —
  sequence, don't rework around it.
- The runner's options cannot express a card's pinned policy (empty-result
  handling, rejection propagation, the pre-upload src reset) without
  behavior change. Keep that card's flow as-is behind the module's
  interface as a named adapter, record the divergence in the module
  comment, and move on — partial migration is acceptable, drift is not.
- Gallery's reorder interaction breaks (reorder during in-flight upload no
  longer matches by `previewSrc`, or image identity is lost). Keep
  gallery's flow as-is behind the interface; ship Steps 1-4 and 6; record.
- Video's thumbnail sub-flow cannot preserve its ordering (videoUrl must
  exist before the thumbnail upload; preview cleared only at the very end).
  Keep the imperative two-call composition in the component — that is the
  designed shape — and do not force a declarative pipeline.
- The unified trigger hook changes observable timing (once-only pins or the
  card e2e dialog flows regress). Keep the per-card effects, ship only the
  headless module + handler migrations, and record the split.

## Rollback plan

Each step is its own commit on `main`; revert the offending commit alone
(`git revert <sha>` — no push) and keep Step 1's characterization tests.
The handler characterization (Step 1) targets behavior, so it stays valid
against un-migrated code; the video/gallery pins live in the component test
files and likewise survive reverts of Steps 4-6. If the module itself
(Step 2) proves unsound, revert Steps 2-7 as a chain — Step 1's tests still
pass against the original handlers, and the policy matrix in commit 1's
message remains the evidence for the next attempt. Nothing in this plan
touches `src/nodes/base/`, the public barrel, or the card declarations, so
no revert can strand the render seam or the public surface.

## Execution notes

Plan 045 landed in eight commits on main (`6931af6..e60b07a`) plus a
post-review cleanup (`439849c`). Step 1 (`6931af6`) characterized the
handlers, inline flows, and effects — the policy matrix (per-card guards,
arity, empty-result policy, preview lifecycle) pinned before any
production change. Step 2 (`44921fa`) introduced `src/utils/upload-intent.ts`
with 17 module tests and zero call-site changes. `dcc63bc` was a disclosed
non-plan commit normalizing plan 044's markdown emphasis for oxfmt (the
heredoc-appended execution notes had broken `format:check`). Step 3
(`38c78cd`) routed the card upload handlers through the intent module and
deleted the four handler modules; the re-pointed test suites kept
byte-identical expectations. Steps 4–5 (`87c41a2`, `d31cb95`) migrated
video's inline flows (adding `src/hooks/usePreviewLease.ts`) and gallery's
multi-file flow (as a documented in-module adapter — the flow can't be a
runner configuration because of its local-state-first ordering, recorded
in a comment per the STOP clause). Step 6 (`5a95308`) owned the
trigger-on-insert and initial-file effects once
(`useTriggerFileDialog`, `useInitialFileUpload`), deleting all 8 effect
copies; the three dependency-array idioms were subsumed onto every-render
checks, an intentional, pinned delta. Step 7 (`e60b07a`) added the
import-guard test pinning the object-URL caller set to exactly
`upload-intent.ts`, `revokePreviewUrl.ts`, `extractVideoMetadata.ts`.

Reviews: spec and quality both APPROVED. Post-review nits fixed in
`439849c`: a duplicated `BackgroundImageUploadResult` interface deleted,
`stripFileExtension` unexported (no external consumer); CONTEXT.md gained
"Upload intent" and "Preview lease" glossary entries. Acknowledged,
unreachable behavior delta left as-is: a null `files` no longer resets
file-node `src` before the bail (real change events always carry a
FileList); `upload?.()` became `upload()` (the type declares it required
and the default context provides a noop). Two plan defects surfaced and
were handled per the plan's own clauses: the evidence prose had audio's
extract-after-upload order backwards (code was pinned as-is), and the
stated 730-test render-side baseline was stale after 041–044 (actual:
735). Moot step: `ImagePlugin.tsx` was already deleted by plan 043.

Preserved behaviors (all pinned, all green): per-card initial-file guards
as data (image `!src`, audio `!src && !isLoading`, video `!isLoading`,
file `!fileSrc`); video preview surviving a rejected upload; one-arg vs
two-arg upload arity; gallery local-state-first ordering and image
identity for `useGalleryReorder`; `uploadOptions` resolved inside an
editor read. Gates at HEAD: full unit 213 files / 1797 passed / 21 todo;
nodes-base+html-renderer 46 files / 735 passed / 21 todo;
typecheck/lint/format clean; scoped card e2e 95 passed. `src/index.ts`
untouched, so verify:package/verify:types not required.
