# Plan 046: Collapse the card action toolbar into one module

> **Executor instructions**: This plan replaces twelve copy-pasted selected-card
> action toolbars with one `CardActionToolbar` module that owns the
> snippet/edit scaffolding, the visibility rule, and the edit/snippet item
> semantics; per-card variance becomes an items array. The design is decided;
> do not redesign the module. Characterize current per-card behavior FIRST —
> every migration commit must keep the rendered toolbar DOM and behavior
> identical except the three pre-authorized deliberate changes in Step 3 and
> Step 4 (audio's snippet label, file's inert edit item, file's ungated snippet
> item). Interface names marked "illustrative" may be refined by the executor;
> the shape (one module, items array, module-owned snippet state and
> visibility rule) may not. Plan 043 must land before this plan (see Scope for
> the exact coordination point — it is narrow).
>
> Work commits DIRECTLY on `main` — no branch, no push, no PR (2026-07-16
> grilling decision; this overrides the `advisor/NNN-<slug>` convention in
> `plans/README.md`). Conventional commit messages.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/nodes/ButtonNodeComponent.tsx src/nodes/CalloutNodeComponent.tsx src/nodes/AudioNodeComponent.tsx src/nodes/VideoNodeComponent.tsx src/nodes/FileNodeComponent.tsx src/nodes/ImageNodeComponent.tsx src/nodes/ToggleNodeComponent.tsx src/nodes/CodeBlockNodeComponent.tsx src/nodes/GalleryNodeComponent.tsx src/nodes/BookmarkNodeComponent.tsx src/nodes/HtmlNodeComponent.tsx src/nodes/header/HeaderNodeComponent.tsx src/components/ui/ActionToolbar.tsx src/components/ui/ToolbarMenu.tsx src/components/ui/SnippetCreateToolbar.tsx src/components/InklingCardWrapper.tsx src/plugins/behaviour/registerCardCommands.ts test/unit/nodes test/unit/components test/e2e/cards test/e2e/plugins test/e2e/paste-behaviour.test.ts test/e2e/content-visibility.test.ts test/utils/e2e.ts`
> Baselines at `d998080`: `pnpm test:unit` = 1707 passed + 21 todo;
> `pnpm vitest run test/nodes-base test/html-renderer` = 730 passed + 21 todo.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM — editor-visible UI with exact-DOM e2e pins; the
  divergences are understood and adjudicated below before any code moves
- **Confidence**: HIGH
- **Depends on**: 043 (declaration-extension pattern; see Scope for the narrow
  coordination point — the module itself does not block on it)
- **Category**: architecture deepening / duplication collapse
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

The selected-card action toolbar — the floating menu above a selected card
with its Edit / Save-as-snippet items, plus the snippet-creation input that
replaces it — is copy-pasted into all 12 card NodeComponents: 35
`showSnippetToolbar` occurrences, three per card (state, snippet toolbar,
menu-toolbar condition). Every copy repeats the same two-block scaffolding:

```tsx
<ActionToolbar data-inkling-card-toolbar="<card>" isVisible={showSnippetToolbar}>
  <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
</ActionToolbar>
<ActionToolbar data-inkling-card-toolbar="<card>" isVisible={isSelected && !isEditing && !showSnippetToolbar}>
  <ToolbarMenu>…edit…separator…snippet…</ToolbarMenu>
</ActionToolbar>
```

The scaffolding is shallow in every copy — no card varies it for a reason —
yet each copy carries its own state, its own visibility expression, and its
own item list, and the copies have drifted. The drift is real behavior, not
style: file's Edit item is wired to an inert no-op, file's snippet item shows
even when the host never configured snippet creation, and audio's snippet
item is the only one labeled "Snippet" instead of "Save as snippet". A
scaffolding this uniform should live in one module with one interface; the
per-card variance (which items, which extra visibility gate) is data.

`src/components/ui/SettingsPanel.tsx` is the proof that cards can share UI
machinery at exactly this depth: one module behind a small interface,
exercised by 15 unit tests (`test/unit/components/SettingsPanel.test.tsx`),
consumed per card with card-specific content slotted in. The action toolbar
is the same shape with less variance.

## Current-state evidence

Verified fresh against commit `d998080`:

- **The 12 copies.** `showSnippetToolbar` appears 35 times across
  `src/nodes/{Button,Callout,Audio,Video,File,Image,Toggle,CodeBlock,Gallery,Bookmark,Html}NodeComponent.tsx`
  and `src/nodes/header/HeaderNodeComponent.tsx` (2 in Gallery — its
  menu-toolbar condition doesn't reference the state — 3 in every other
  file). Every card renders the two-block scaffolding above; the snippet
  block is byte-identical in all 12.
- **Edit dispatch — two idioms, provably one behavior.** Five cards dispatch
  edit via the card-selection context: Button (`ButtonNodeComponent.tsx:61-65`),
  Callout (`CalloutNodeComponent.tsx:80-84`), CodeBlock
  (`CodeBlockNodeComponent.tsx:57-61`), Audio (`AudioNodeComponent.tsx:101-105`),
  Video (`VideoNodeComponent.tsx:241-245`). Three dispatch
  `EDIT_CARD_COMMAND` directly with `focusEditor: false`: Html
  (`HtmlNodeComponent.tsx:37-41`), Toggle (`ToggleNodeComponent.tsx:33-39`),
  Header (`header/HeaderNodeComponent.tsx:129-133`). The idioms are
  behaviorally identical: the context's `setEditing(true)` itself dispatches
  `EDIT_CARD_COMMAND` (`InklingCardWrapper.tsx:138-145`), the command's only
  handler (`src/plugins/behaviour/registerCardCommands.ts:96-113`)
  destructures only `cardKey`, and `focusEditor` is declared in the payload
  types (`src/plugins/behaviour/types.ts:10,15`) but read by no handler
  anywhere in `src/`. Unifying on `setEditing(true)` is zero-drift by
  construction, not by assumption.
- **File's Edit item is inert.** Its `onClick` is `enableEditing`
  (`FileNodeComponent.tsx:94-97`), which only calls
  `preventDefault`/`stopPropagation` — it never enters edit mode. The edit
  mode it should reach exists: `FileCard` renders title/description inputs
  when `isEditing` and an interaction-blocking overlay when not
  (`src/components/ui/cards/FileCard.tsx:96-108,136`). Today edit mode is
  only reachable by clicking the selected card (the wrapper's CLICK_COMMAND
  path, `InklingCardWrapper.tsx:82-92`).
- **File's snippet item is ungated.** Every other card gates both the
  snippet item and its separator on `cardConfig.createSnippet`; file renders
  `<ToolbarMenuSeparator hide={undefined} />` and a snippet item with no
  `hide` and `dataTestId={undefined}` (`FileNodeComponent.tsx:178-185`). With
  no `createSnippet` configured the item still opens the snippet input, and
  creation silently no-ops (`SnippetCreateToolbar.tsx:26-29`).
- **Audio's snippet label drifts.** `label="Snippet"`
  (`AudioNodeComponent.tsx:169`); the other ten snippet items read
  "Save as snippet". No test pins audio's label (the e2e `createSnippet`
  helper clicks by `data-testid`, `test/utils/e2e.ts:539-547`).
- **Bookmark's toolbar is snippet-only** — the known suspect. Its menu
  toolbar contains only the snippet item, and its visibility is
  `title ? isSelected && !showSnippetToolbar && !!cardConfig.createSnippet : false`
  (`BookmarkNodeComponent.tsx:270-273`). Bookmark never destructures
  `isEditing` from the card context (`:55`) and has no edit item; the
  `title` gate means "only when populated". This reads as deliberate
  per-card UX: the toolbar exists solely to offer snippet creation, so
  requiring both a populated card and a configured `createSnippet` is
  semantically correct. KEEP, do not flatten (see Step 6).
- **Gallery's toolbar is drag-aware and edit-free.** Visibility is
  `!hideToolbar` where `hideToolbar = !isSelected ||
imageFilesDropper.isDraggedOver || galleryReorder.isDraggedOver ||
images.length <= 0` (`GalleryNodeComponent.tsx:202-203`); items are
  [Add images, separator, snippet] — no Edit item, no `isEditing` factor.
- **Image's toolbar is a different menu.** Visibility is `!!src &&
isSelected && !showLink && !showSnippetToolbar`
  (`ImageNodeComponent.tsx:338-341`) — `!showLink` stands where `!isEditing`
  stands elsewhere, and image never destructures `isEditing` (`:56`). Items
  are [Regular, Wide, Full, separator, Link, separator, snippet], an
  `ImageUploadForm` renders inside the `ActionToolbar` before the
  `ToolbarMenu` (`:342-346`), and a THIRD `ActionToolbar` hosts the link
  input (`:323-332`, out of scope — it is a `LinkInput`, not a
  `ToolbarMenu`).
- **Html's toolbar has one custom item.** Standard [edit, separator,
  snippet] plus a Visibility item rendered when `isVisibilityEnabled`
  (`HtmlNodeComponent.tsx:76-87`); its edit item carries
  `dataTestId="edit-html"`. The `SettingsPanel` it opens (`:100-108`) is
  outside the toolbar and out of scope.
- **Populated gates differ.** Audio prefixes `!!src &&` (`:159`), Video
  prefixes `!!isCardPopulated &&` (`:310`), File infixes `isPopulated &&`
  (`:167`), Image prefixes `!!src &&` (`:340`). Button, Callout, CodeBlock,
  Toggle, Header, Html have no populated gate.
- **Edit-item test ids are per-card data.** `edit-button-card`,
  `edit-callout-card`, `edit-code-block-card`, `edit-video-card`,
  `edit-file-upload-card`, `edit-html`; Audio, Toggle, Header have none.
  Two are pinned: `edit-html` by `test/e2e/content-visibility.test.ts:37`,
  `edit-button-card`/`edit-code-block-card` by unit tests. Do not
  standardize them away.
- **Dead props copied along.** `className={undefined}` on both items in
  Button (`:87,96`), Callout (`:109,118`), CodeBlock (`:82,91`), Gallery
  (`:230,239`); File adds `dataTestId={undefined}` and
  `<ToolbarMenuSeparator hide={undefined} />` (`:171-181`).
- **`data-inkling-card-toolbar="<name>"` is a live contract.** Values:
  `button`, `callout`, `audio`, `video`, `file-upload` (not `file`),
  `image`, `toggle`, `code-block`, `gallery`, `bookmark`, `html`, `header`.
  Consumers: a CSS selector (`src/styles/components/inkling-lexical.css:176-177`),
  e2e locators across ~15 specs, and a source-grep unit test
  (`test/unit/nodes/headerToolbarLabel.test.tsx`) asserting the literal
  string `data-inkling-card-toolbar="header"` appears exactly twice in
  `HeaderNodeComponent.tsx`. `ActionToolbar` renders nothing when not
  visible (`ActionToolbar.tsx:16-22`), so at most one toolbar div per card
  exists at a time — e2e single-match locators depend on that.
- **E2e pins exact toolbar DOM for callout.** `assertHTML` strips classes,
  `data-testid`, SVG bodies, and dnd attrs (`test/utils/e2e.ts:184-241`) but
  pins structure: `<div data-inkling-card-toolbar="callout"><ul><li>Edit…</li><li></li><li>Save
as snippet…</li></ul></div>` — item order, `aria-label`s, tooltip text,
  and the separator `<li>` — at `test/e2e/plugins/EmojiPickerPlugin.test.ts:204-226`
  and `test/e2e/paste-behaviour.test.ts:219-235`. The code-block snapshot in
  the same file (`:282-308`) passes `ignoreCardToolbarContents`, which
  hollows toolbar innerHTML (`test/utils/e2e.ts:215-217,225-228`) —
  structure pin only.
- **E2e pins toolbar behavior in 9+ specs.** The `createSnippet` helper
  (`test/utils/e2e.ts:539-547`: wait for `[data-testid="create-snippet"]`,
  click, fill `snippet-name`, Enter) is exercised against callout, button,
  toggle, html, bookmark (both search variants), audio, video, image
  (`callout-card.test.ts:337`, `button-card.test.ts:166`,
  `toggle-card.test.ts:258`, `html-card.test.ts:144`,
  `bookmark-card-with-search.test.ts:267`,
  `bookmark-card-without-search.test.ts:260`, `audio-card.test.ts:377`,
  `video-card.firefox.test.ts:403`, `image-card.test.ts:890`). The demo
  configures `createSnippet` (`demo/DemoApp.tsx:273,434`), so snippet items
  are visible in e2e. Also pinned: gallery toolbar + `add-gallery-image`
  click (`gallery-card.test.ts:194,343-347`), audio's
  `button[aria-label="Edit"]` click (`audio-card.test.ts:291-292`), image
  width-button absence in the email editor
  (`email-editor.test.ts:223-229`), html's visibility item
  (`html-card.test.ts:217-218`).
- **Unit pins are thin.** Only two toolbar behavior pins exist:
  `test/unit/nodes/ButtonNodeComponent.test.tsx:109-130` (click
  `edit-button-card` → `setEditing(true)`) and
  `test/unit/nodes/CodeBlockNodeComponent.test.tsx:93-100` (same for
  code-block). The other six NodeComponent test files (Audio, Bookmark,
  Gallery, Html, Image, Video) mock the card context but assert nothing
  about the toolbar; Callout, Toggle, File, Header have no NodeComponent
  unit tests. Step 1 fills this gap.
- **Nothing here is public surface.** `src/index.ts` exports none of
  `ActionToolbar`, `ToolbarMenu`, `SnippetCreateToolbar`, or any
  NodeComponent — the new module is internal, so `verify:package`/
  `verify:types` are not gates for this plan.

## Scope

**In scope**:

- One new module, `src/components/ui/CardActionToolbar.tsx` (illustrative
  name), owning: the two-`ActionToolbar` scaffolding, the
  `showSnippetToolbar` state, the menu-toolbar visibility rule, the snippet
  `ActionToolbar` + `SnippetCreateToolbar` wiring, and the built-in edit /
  snippet / separator item semantics. Per-card variance is an items array
  plus two visibility levers (an extra gate and an opt-out of the
  hide-while-editing factor).
- Migrating all 12 card NodeComponents, one commit per batch.
- Three deliberate behavior changes, each pre-authorized and recorded in its
  commit message with before/after evidence: audio's snippet label →
  "Save as snippet"; file's edit item wired to `setEditing(true)`; file's
  snippet item and separator gated on `cardConfig.createSnippet`.
- Deleting the copied dead props (`className={undefined}` etc.) as each card
  migrates.
- Repointing `test/unit/nodes/headerToolbarLabel.test.tsx` from a source
  grep to a rendered-DOM assertion (deliberate pin change — the contract it
  protects, the attribute value, is preserved by the module).

**Out of scope**:

- Image's link `ActionToolbar` (`ImageNodeComponent.tsx:323-332`) — a
  `LinkInput` host, not a `ToolbarMenu`; already shared machinery.
- The html card's `SettingsPanel` and visibility-settings flow.
- `SnippetActionToolbar` (`src/components/ui/SnippetActionToolbar.tsx`) —
  selection-level snippet creation, a different feature.
- `ActionToolbar`, `ToolbarMenu`, `SnippetCreateToolbar` themselves — the
  module composes them unchanged.
- Any export/render-renderer behavior; nothing here touches render targets
  or the render context.
- Standardizing per-card `dataTestId`s or the `file-upload` attribute value.

**Coordination with plan 043**: 043 extends card declarations with per-card
data. If its landed pattern fits React-free per-card UI metadata, the
executor MAY express the static slice of toolbar variance through it (e.g.
"has edit item", "snippet-only"); the items arrays themselves stay in the
NodeComponents, because their handlers close over NodeComponent-local state
(image card widths, gallery add-images, html visibility toggle) and
declarations must stay React-free (`src/nodes/cards/card-declaration.ts:50-61`).
If 043's pattern does not fit, props are the fallback — do not block the
module on it, and do not invent a new declaration seam here.

## Commands you will need

| Purpose                    | Command                                                              | Expected on success                        |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| Characterization baseline  | `pnpm test:unit`                                                     | 1707 passed + 21 todo before any change    |
| Renderer drift check       | `pnpm vitest run test/nodes-base test/html-renderer`                 | 730 passed + 21 todo (untouched territory) |
| Per-card unit pins         | `pnpm vitest run test/unit/nodes/<Card>NodeComponent.test.tsx`       | green                                      |
| Module unit tests          | `pnpm vitest run test/unit/components/ui/CardActionToolbar.test.tsx` | green                                      |
| Toolbar e2e subset         | `pnpm test:e2e:quiet <specs listed in Step 7>`                       | green, no snapshot edits                   |
| Static + full gates        | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit` | all pass                                   |
| Residual-duplication check | `rg -l showSnippetToolbar src/`                                      | only `CardActionToolbar.tsx`               |

## Git workflow

- Commit DIRECTLY on `main`; do not push or open a PR (2026-07-16 grilling
  decision).
- Commit 1: `test(nodes): characterize per-card action toolbar behavior`
- Commit 2: `refactor(nodes): introduce CardActionToolbar and migrate simple cards`
- Commit 3: `refactor(nodes): migrate audio and video to CardActionToolbar`
- Commit 4: `fix(nodes): wire file card edit item and gate its snippet item`
- Commit 5: `refactor(nodes): migrate html and image to CardActionToolbar`
- Commit 6: `refactor(nodes): migrate gallery and bookmark to CardActionToolbar`
- Commit 7: `test(nodes): run full gates and confirm toolbar duplication is gone`

## Steps

### Step 1: Characterize current per-card toolbar behavior with pins

Before touching production code, lock current behavior through the rendered
DOM, using the existing harness pattern (mock
`useLexicalComposerContext`, provide `CardContext` +
`InklingComposerContext`, as in `ButtonNodeComponent.test.tsx:87-130`):

- Run `pnpm test:unit` and the toolbar e2e subset; record the green
  baselines (1707 + 21 todo; e2e green).
- Add pins for all 12 cards (extend the 8 existing NodeComponent test files;
  add minimal NodeComponent tests for Callout, Toggle, File, Header — file
  organization is an executor detail). Pin per card:
  - the menu-toolbar visibility matrix: hidden when not selected; hidden
    while editing for the nine cards with the `!isEditing` factor (all but
    Bookmark, Gallery, Image); hidden while `showSnippetToolbar`; the
    populated gates (`src` for Audio/Image, `isCardPopulated` for Video,
    `isPopulated` for File, `title` for Bookmark, `images.length` +
    dragged-over states for Gallery, `!showLink` for Image).
  - the item list: order, icons, labels, `hide` flags, `dataTestId`s —
    including `file-upload`'s ungated snippet item and audio's "Snippet"
    label, pinned AS-IS with a comment marking them as the Step-3/Step-4
    deliberate changes.
  - edit dispatch: Button/Callout/CodeBlock/Audio/Video → `setEditing(true)`;
    Html/Toggle/Header → `EDIT_CARD_COMMAND` with `{ cardKey, focusEditor:
false }` (assert on `editor.dispatchCommand`); File → no dispatch
    (inert). Include one pin proving the equivalence this plan relies on:
    `InklingCardWrapper`'s context `setEditing(true)` dispatches
    `EDIT_CARD_COMMAND` (`InklingCardWrapper.tsx:138-145`).
  - snippet flow: clicking the snippet item swaps the menu toolbar for the
    `SnippetCreateToolbar` input; the snippet toolbar renders
    `data-inkling-card-toolbar="<name>"` with the exact per-card value
    (`file-upload` for file).
- These pins characterize behavior through each card's public DOM, so they
  stay green across the migration unchanged — except the three
  pre-authorized updates in Steps 3–4.

### Step 2: Introduce `CardActionToolbar`; migrate Button, Callout, CodeBlock, Toggle, Header

Create `src/components/ui/CardActionToolbar.tsx` with the shape from Scope.
Illustrative interface:

```tsx
export type CardToolbarItem =
  | { kind: 'edit'; dataTestId?: string }
  | { kind: 'snippet' }
  | { kind: 'separator'; hide?: boolean }
  | {
      kind: 'custom'
      icon: string
      label: string
      onClick: (event: React.MouseEvent) => void
      isActive?: boolean
      hide?: boolean
      dataTestId?: string
    }

export interface CardActionToolbarProps {
  card: string // → data-inkling-card-toolbar={card}
  nodeKey: NodeKey
  visibleWhen?: boolean // extra per-card gate, default true
  hideWhileEditing?: boolean // default true; Bookmark/Gallery/Image pass false
  items?: CardToolbarItem[] // default [{ edit }, { separator }, { snippet }]
  beforeMenu?: React.ReactNode // image's ImageUploadForm
}
```

The module reads `CardContext` (`isSelected`, `isEditing`, `setEditing`) and
`InklingComposerContext` (`cardConfig.createSnippet`) itself; the edit item
does `preventDefault` + `stopPropagation` + `setEditing(true)`; the snippet
item carries `dataTestId="create-snippet"`, `label="Save as snippet"`,
`hide={!cardConfig.createSnippet}`, and the default separator mirrors that
gate; menu visibility is `isSelected && !(hideWhileEditing && isEditing) &&
!showSnippetToolbar && (visibleWhen ?? true)`; both blocks render
`data-inkling-card-toolbar={card}`.

- Add `test/unit/components/ui/CardActionToolbar.test.tsx`: default items,
  visibility matrix, createSnippet gating, snippet swap, custom items,
  `hideWhileEditing={false}`.
- Migrate Button, Callout, CodeBlock, Toggle, Header to it, deleting each
  card's `showSnippetToolbar` state, `handleToolbarEdit`, dead props, and
  now-unused imports. Toggle/Header move from direct `EDIT_CARD_COMMAND`
  dispatch to `setEditing(true)` — provably zero-drift per the evidence
  above; cite it in the commit message.
- Repoint `headerToolbarLabel.test.tsx` in THIS commit: replace the source
  grep with a rendered-DOM assertion that the migrated header renders
  `data-inkling-card-toolbar="header"` toolbars. This is a deliberate pin
  change (the source-grep form cannot survive moving the JSX into a module);
  the contract it protects is unchanged. Say so in the commit message.
- Proof: all Step-1 pins for these five cards green unchanged; existing
  Button/CodeBlock edit pins green unchanged.

### Step 3: Migrate Audio and Video — one deliberate change

- Migrate both, expressing their populated gates as
  `visibleWhen={!!src}` / `visibleWhen={!!isCardPopulated}`.
- Deliberate change #1: audio's snippet label becomes "Save as snippet".
  Evidence it is drift, not UX: ten of eleven snippet items read
  "Save as snippet", the e2e snapshot pins that string for callout, and no
  test pins audio's deviant label. Update the one Step-1 pin and record the
  before/after in the commit message.
- Proof: all other Step-1 pins for both cards green unchanged.

### Step 4: Migrate File — two deliberate changes

- Deliberate change #2: the edit item is wired to the module's
  `setEditing(true)` instead of the inert `enableEditing` no-op
  (`FileNodeComponent.tsx:94-97`). Evidence: `FileCard` has real edit-mode
  UI (`FileCard.tsx:96-108,136`), and every other card's Edit enters edit
  mode. `enableEditing` is deleted.
- Deliberate change #3: the snippet item and separator gain
  `hide={!cardConfig.createSnippet}`, matching the other ten cards;
  currently the item opens an input whose creation silently no-ops
  (`SnippetCreateToolbar.tsx:26-29`). The snippet item gains
  `dataTestId="create-snippet"` for uniformity (no test pins its absence;
  `assertHTML` strips test ids).
- Update the two Step-1 pins with before/after evidence in the commit
  message. These are fixes riding the migration, not masked drift — each is
  named, argued, and pinned.
- Proof: remaining Step-1 pins for file green unchanged; the fixes covered
  by the updated pins.

### Step 5: Migrate Html and Image — custom items through the items array

- Html: `items` = [edit (`edit-html`), custom visibility item when
  `isVisibilityEnabled`, separator, snippet] — preserving the current
  conditional rendering and `isActive={showVisibilitySettings}`
  (`HtmlNodeComponent.tsx:76-87`). The `SettingsPanel` block stays in
  `HtmlNodeComponent` untouched.
- Image: `hideWhileEditing={false}`, `visibleWhen={!!src && !showLink}`,
  `items` = the width/link/snippet list with its two separators' distinct
  `hide` expressions (`ImageNodeComponent.tsx:349-385`),
  `beforeMenu={<ImageUploadForm …/>}`. The link `ActionToolbar`
  (`:323-332`) stays in `ImageNodeComponent` — out of scope.
- Proof: Step-1 pins for both cards green unchanged; no e2e snapshot moves
  (image toolbar markup is exercised by `image-card.test.ts`,
  `email-editor.test.ts`, `card-behaviour.test.ts`).

### Step 6: Migrate Gallery and Bookmark — the flagged divergences, kept

- Gallery: `hideWhileEditing={false}`,
  `visibleWhen={!imageFilesDropper.isDraggedOver &&
!galleryReorder.isDraggedOver && images.length > 0}`,
  `items` = [custom Add images (`add-gallery-image`), separator, snippet].
  `hideToolbar` (`GalleryNodeComponent.tsx:202-203`) is absorbed.
- Bookmark: `hideWhileEditing={false}`,
  `visibleWhen={!!title && !!cardConfig.createSnippet}`,
  `items` = [snippet]. This is the known deliberate per-card UX — the
  snippet-only toolbar gated on population AND snippet support — flagged in
  the evidence and KEPT, not flattened. The commit message records the
  decision and the reason.
- Proof: Step-1 pins for both cards green unchanged.

### Step 7: Full gates and residual-duplication check

- `rg -l showSnippetToolbar src/` → only `CardActionToolbar.tsx`.
  `rg "className=\{undefined\}|dataTestId=\{undefined\}|hide=\{undefined\}" src/nodes` →
  no matches.
- Run: `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`,
  `pnpm test:unit` (baseline grows by exactly the Step-1/Step-2 tests
  added), `pnpm vitest run test/nodes-base test/html-renderer` (730 + 21
  todo — untouched territory, run as a drift check).
- Run the toolbar e2e subset: `pnpm test:e2e:quiet test/e2e/cards/callout-card.test.ts test/e2e/cards/button-card.test.ts test/e2e/cards/toggle-card.test.ts test/e2e/cards/html-card.test.ts test/e2e/cards/bookmark-card-with-search.test.ts test/e2e/cards/bookmark-card-without-search.test.ts test/e2e/cards/audio-card.test.ts test/e2e/cards/gallery-card.test.ts test/e2e/cards/image-card.test.ts test/e2e/cards/code-block-card.test.ts test/e2e/cards/video-card.firefox.test.ts test/e2e/plugins/EmojiPickerPlugin.test.ts test/e2e/paste-behaviour.test.ts test/e2e/content-visibility.test.ts test/e2e/card-behaviour.test.ts test/e2e/editors/email-editor.test.ts`
  — every `assertHTML` snapshot must pass UNEDITED.
- `verify:package`/`verify:types` are NOT required: no public-surface change
  (`src/index.ts` untouched; evidence above).

## Test plan

| Scenario                    | Command                                                              | Required invariant                                    |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Characterization baseline   | `pnpm test:unit`                                                     | 1707 passed + 21 todo; e2e subset green               |
| Per-card visibility/items   | `pnpm vitest run test/unit/nodes`                                    | Step-1 pins green; only Steps 3–4's three pins change |
| Edit dispatch equivalence   | `pnpm vitest run test/unit/components/InklingCardWrapper.test.tsx`   | `setEditing(true)` → `EDIT_CARD_COMMAND` pin green    |
| Module behavior             | `pnpm vitest run test/unit/components/ui/CardActionToolbar.test.tsx` | green                                                 |
| Header attribute contract   | `pnpm vitest run test/unit/nodes/headerToolbarLabel.test.tsx`        | rendered-DOM assertion green after repoint            |
| Exact toolbar DOM (callout) | `pnpm test:e2e:quiet test/e2e/plugins/EmojiPickerPlugin.test.ts`     | snapshot passes UNEDITED                              |
| Snippet flow ×9 cards       | `pnpm test:e2e:quiet test/e2e/cards`                                 | `createSnippet` helper specs green                    |
| Full gates                  | `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit` | all pass                                              |

## Acceptance criteria

- `showSnippetToolbar` exists only inside `CardActionToolbar.tsx`; all 12
  cards render their snippet/edit scaffolding through it.
- Rendered toolbar DOM and behavior are identical to the Step-1 baseline for
  every card EXCEPT the three pre-authorized changes (audio label, file edit
  wiring, file snippet gating), each carrying before/after pin evidence in
  its commit message.
- Bookmark's snippet-only, doubly-gated toolbar survives as data
  (`items: [snippet]`, `visibleWhen`) — flagged and kept, not flattened.
- Every `data-inkling-card-toolbar` value (including `file-upload`) and
  every pinned `dataTestId` (`edit-html`, `edit-button-card`,
  `edit-code-block-card`, `create-snippet`, `add-gallery-image`,
  `show-visibility`) is preserved; all e2e snapshots pass unedited.
- The dead props (`className={undefined}`, `dataTestId={undefined}`,
  `hide={undefined}`) are gone from `src/nodes`.
- `headerToolbarLabel.test.tsx` asserts the same contract against rendered
  DOM.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:unit`
  green; nodes-base + html-renderer stay 730 passed + 21 todo.

## STOP conditions

- Any toolbar DOM or behavior drift beyond the three pre-authorized changes
  appears in any migration commit — including an e2e `assertHTML` snapshot
  that wants regenerating. Revert that one commit, keep the Step-1 pins,
  reassess the module's item rendering — do NOT update snapshots or
  expectations to make it pass.
- The edit-dispatch equivalence turns out to be wrong (e.g. a second
  `EDIT_CARD_COMMAND` handler or a `focusEditor` reader is discovered).
  Revert the affected migration, dispatch the command directly from the
  module's edit item instead, and record the correction — do not accept a
  behavior delta.
- A per-card divergence beyond bookmark's proves to be deliberate UX that
  the items array cannot express without contortion (gallery's drag-aware
  gate is the next suspect). Keep that card's hand-written toolbar, record
  it in the module header comment, and move on — partial migration is
  acceptable, silent flattening is not.
- Migrating File surfaces that its edit mode is intentionally unreachable
  from the toolbar (e.g. a product decision recorded somewhere credible).
  Keep `enableEditing`'s inert behavior behind the module, drop deliberate
  change #2, and record the evidence — do not ship the fix on suspicion
  alone against explicit contrary evidence.
- Plan 043 has not landed, or its declaration-extension pattern does not
  fit React-free toolbar metadata. Proceed with props in the NodeComponents
  (the fallback in Scope) — sequence, don't redesign around it.

## Rollback plan

Each step is its own commit; revert the offending commit alone
(`git revert <sha>`) and keep Step 1's characterization pins — they
characterize behavior through each card's rendered DOM, so they pass
against both the hand-written toolbars and the module, and they are the
evidence for the next attempt. If the module itself (Step 2) proves
unsound, revert it and every migration commit; the pins remain valid and
the three deliberate fixes from Steps 3–4 can be re-applied independently
to the hand-written code if they must ship without the refactor — each
touches one card file and one pin. No step touches shared renderer,
command-handler, or context code, so no revert can strand another plan's
work.
