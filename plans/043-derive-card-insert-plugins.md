# Plan 043: Derive the card insert plugins from the declaration

> **Executor instructions**: This plan deletes the eleven hand-written card
> insert plugins and replaces them with ONE registrar that derives every
> registration from the card declarations — the same derived-view idiom plan
> 039 established for the node-set registries. The design is decided; do not
> redesign the seam. Characterize the per-card registration matrix FIRST —
> every commit must keep command-dispatch behavior identical except the two
> sanctioned changes named below: the `HeaderPlugin` re-registration churn
> disappears (its effect had no dependency array and re-registered on every
> render), and the public barrel loses the eleven plugin names and gains the
> registrar. Interface names marked "illustrative" may be refined by the
> executor; the shape (declaration vocabulary, wrapper-layer projection, one
> registrar, per-card `hasNodes` guard) may not.
>
> **Drift check (run first)**:
> `git diff --stat d998080..HEAD -- src/plugins src/nodes/cards src/components/EmailEditor.tsx src/components/InklingNestedComposer.tsx src/index.ts test/unit/plugins CONTEXT.md`
>
> **Baseline at `d998080`**: `pnpm test:unit` = 206 files / 1707 passed / 21
> todo; `pnpm vitest run test/nodes-base test/html-renderer` = 46 files / 730
> passed / 21 todo. The nodes-base/html-renderer suite is renderer-side and
> must be byte-identical at the end. The unit count changes only by the Step-1
> characterization pins (recorded in that commit message); the Step-3 test
> rewrite carries every pinned expectation over unchanged.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM — editor-side command registration; the mounting matrix and dispatch semantics must not drift
- **Confidence**: HIGH
- **Depends on**: — (builds on landed work: plan 039's declaration/derived-view machinery, plan 025's typed insert-command payloads)
- **Category**: architecture deepening / declaration consolidation
- **Planned at**: commit `d998080`, 2026-07-16

## Why this matters

Eleven files under `src/plugins/` — `AudioPlugin.tsx`, `BookmarkPlugin.tsx`,
`ButtonPlugin.tsx`, `CalloutPlugin.tsx`, `FilePlugin.tsx`, `GalleryPlugin.tsx`,
`HeaderPlugin.tsx`, `HtmlPlugin.tsx`, `ImagePlugin.tsx`, `TogglePlugin.tsx`,
`VideoPlugin.tsx` — are one module copied eleven times: `hasNodes` guard →
register `INSERT_X_COMMAND` → dataset type-guard → `$createXNode` → dispatch
`INSERT_CARD_COMMAND`. Each copy is shallow: it carries no logic of its own,
only four per-card facts (which command, which node class, whether the card
opens in edit mode, whether the card claims media drops). Shallow copies are
where drift grows, and it already has:

- `HeaderPlugin.tsx:17-36` — the `useEffect` has **no dependency array**, so
  the command re-registers on every render. Every sibling registers once per
  editor. The stacked duplicate handlers are behaviorally invisible (the first
  handler returning `true` claims the command), so this is pure churn — but it
  is churn only a reader of all eleven files can see.
- `BookmarkPlugin.tsx:30-48` — registers at `COMMAND_PRIORITY_HIGH` (every
  sibling is `LOW`) and adds a range-selection check plus a `focusNode !==
  null` guard. The check is redundant with `INSERT_CARD_COMMAND`'s own
  handler (`registerCardCommands.ts:41-67` returns `false` without a range or
  node selection), and `selection.focus.getNode()` never returns null (it
  throws instead) — yet the copy is observably different: with no range
  selection, `INSERT_BOOKMARK_COMMAND` returns `false` and
  `INSERT_CARD_COMMAND` never fires, while every other card returns `true`
  and fires it anyway.
- `ImagePlugin.tsx:17-28,60` — reads `fileUploader` from context, builds an
  `imageUploader` and a `handleImageUpload` callback that is referenced only
  in the effect's dependency array and never invoked. The real upload flow
  lives in `ImageNodeComponent.tsx` (`imageUploadHandler` call sites at
  :142,157,212,295). Dead code surviving in exactly one copy.
- Only the media trio (Image, Audio, Video) registers a second command,
  `INSERT_MEDIA_COMMAND`, re-dispatching its own insert command with
  `{ initialFile: dataset.file }`. `FileNode` declares `static uploadType =
  'file'` (`src/nodes/base/nodes/file/FileNode.ts:51`) yet **no** plugin
  claims `type === 'file'` — a dropped generic file dispatches
  `INSERT_MEDIA_COMMAND` into silence. That fact is invisible unless you diff
  all eleven copies side by side.

The knowledge these copies hold is declaration knowledge: which insert
command a card joins, whether it opens in edit mode, whether it claims media
inserts. Plan 039 made the card declaration the single per-card source of
truth — "every registry is a derived view over the card declarations"
(`CONTEXT.md`, "card declaration") — and the insert registration is the
remaining per-card registry still held outside it. Deriving it deepens the
declaration module: adding a card's insert handling becomes a declaration
edit, the mounting matrix becomes data, and the drift surface (eleven bodies)
collapses to one implementation with the per-card variance readable as a
table in the declarations. That is the leverage: one interface, eleven
callers reduced to eleven data entries.

## Current-state evidence

Verified fresh against commit `d998080`:

- The shared body, per copy (example: `AudioPlugin.tsx:15-51`):
  `useLexicalComposerContext` → `useEffect` → `if
  (!editor.hasNodes([AudioNode])) return` → `mergeRegister` →
  `editor.registerCommand(INSERT_AUDIO_COMMAND, handler,
  COMMAND_PRIORITY_LOW)`; the handler runs the dataset guard (every copy
  defines an identical `typeof value === 'object' && value !== null`
  type-guard, commented "command payloads cross an untyped runtime
  boundary"), constructs `$createAudioNode(dataset)`, dispatches
  `INSERT_CARD_COMMAND`, returns `true`.
- The full per-card matrix (commands defined at `card-menus.ts:43-56`):

  | Card | Command | Priority | `openInEditMode: true` | Claims `INSERT_MEDIA_COMMAND` | Copy-local quirks |
  | ---- | ------- | -------- | ---------------------- | ----------------------------- | ----------------- |
  | audio | `INSERT_AUDIO_COMMAND` (:43) | LOW | — | type `'audio'` (`AudioPlugin.tsx:36-46`) | — |
  | bookmark | `INSERT_BOOKMARK_COMMAND` (:44) | **HIGH** (:48) | — | — | range-selection + `focusNode` checks (:30-44) |
  | button | `INSERT_BUTTON_COMMAND` (:45) | LOW | yes (:29) | — | — |
  | callout | `INSERT_CALLOUT_COMMAND` (:46) | LOW | yes (:29) | — | — |
  | file | `INSERT_FILE_COMMAND` (:48) | LOW | — | — | — |
  | gallery | `INSERT_GALLERY_COMMAND` (:49) | LOW | — | — | — |
  | header | `INSERT_HEADER_COMMAND` (:50) | LOW | yes (:29) | — | `useEffect` with no dep array (:36) |
  | html | `INSERT_HTML_COMMAND` (:52) | LOW | yes (:29) | — | — |
  | image | `INSERT_IMAGE_COMMAND` (:53) | LOW | — | type `'image'` (:48-58) | dead upload code (:17-28,60) |
  | toggle | `INSERT_TOGGLE_COMMAND` (:54) | LOW | yes (:29) | — | — |
  | video | `INSERT_VIDEO_COMMAND` (:55) | LOW | — | type `'video'` (:36-46) | — |

- Non-edit-mode cards dispatch `INSERT_CARD_COMMAND` with the payload
  `{ cardNode }` (no `openInEditMode` key present); the five edit-mode cards
  dispatch `{ cardNode, openInEditMode: true }`. Key presence is observable
  in a listener (`'openInEditMode' in payload`) and must be preserved.
- The `INSERT_MEDIA_COMMAND` payload's `type` is the card's **node type**,
  not its `uploadType`: `getListOfAcceptableMimeTypes` keys
  `acceptableMimeTypes` by nodeType (`DragDropPastePlugin.tsx:74-78`) and
  `isMimeType` returns that key (:28-32). nodeType and `uploadType` coincide
  for image/audio/video today, but the re-dispatch checks
  (`dataset.type === 'image' | 'audio' | 'video'`) are node-type comparisons;
  File's `uploadType = 'file'` produces dispatches no handler claims. (The
  planning brief said "keyed by upload type" — the code says node type; the
  declaration vocabulary below keys media claiming by the card's `nodeType`,
  which reproduces behavior exactly either way.)
- Every `$createXNode` is a plain `new XNode(dataset)` — the assembled
  classes (`src/nodes/AudioNode.ts:26-29`, same shape for the other seven
  assembled cards) and the three surviving hand-written wrappers
  (`BookmarkNode.tsx:43-45`, `HeaderNode.tsx:54-56`,
  `ToggleNode.tsx:48-50`) alike. No per-card construction logic exists for
  the registrar to lose.
- Mounting matrix — three mount styles, and nested composers mount nothing:
  - `src/components/InklingEditor.tsx:22` mounts `AllDefaultPlugins`, whose
    card run (`AllDefaultPlugins.tsx:35-38,41-47`) mounts all eleven
    (with `EmEnDashPlugin` :39 and `HorizontalRulePlugin` :40 interleaved —
    those stay).
  - `src/components/EmailEditor.tsx:106-108,113-114` mounts five:
    Bookmark, Button, Callout, Html, Image — exactly the cards whose
    declaration has `surfaces.emailEditor === true` (verified across all
    thirteen declaration files), minus HorizontalRule, which has its own
    differently-shaped plugin (also mounted, :112).
  - Nested composers mount **no** card insert plugins:
    `InklingNestedComposer.tsx:42-56` mounts collaboration/word-count/TK/
    replacement-strings plugins plus children; `InklingNestedEditor.tsx` and
    `InklingCaptionEditor.tsx` pass only text-level plugins as children, and
    their node sets (`MINIMAL_NODES`, `BASIC_NODES`) contain no cards. (The
    planning brief said "InklingNestedComposer mounts a subset" — it mounts
    none; the subset mounting is EmailEditor's.)
  - Effective registration = mounted ∩ `hasNodes`. Because the email-editor
    node set contains exactly the `emailEditor`-surface cards
    (`EmailEditorNodes.ts:21` derives it via `deriveCardNodes(...,
    'emailEditor')`), one registrar that derives all insert-bearing cards
    and guards each registration with `hasNodes` reproduces both mount
    sites exactly: in the email editor the six non-email cards no-op
    precisely where today their plugins are simply absent.
- `INSERT_CARD_COMMAND`'s own handler (`registerCardCommands.ts:41-67`)
  re-does selection resolution and returns `false` without a range/node
  selection — this is why bookmark's pre-check is redundant for insertion
  but observable in dispatch return values (see the matrix pins below).
- Out of scope neighbors, verified: `HorizontalRulePlugin.tsx` has a
  different body (selection-based insertion at :21-50 plus the `---`
  markdown shortcut listener at :53-100) and stays. `InklingSelectorPlugin`
  owns `OPEN_GIF_SELECTOR_COMMAND`/`INSERT_FROM_GIF_COMMAND`
  (`InklingSelectorPlugin.tsx:16-58`) and stays. `INSERT_CODE_BLOCK_COMMAND`
  has **no handler anywhere** (only definitions/re-exports at
  `card-menus.ts:47`, `CodeBlockNode.ts:10`, `src/index.ts:76`; the code
  fence transformer constructs the node directly) — untouched.
  `INSERT_SNIPPET_COMMAND` (`InklingSnippetPlugin`) is not a card command.
- All eleven plugins are public barrel exports: `src/index.ts:24-61`
  (imports) and `:93-122` (export block). The demo
  (`demo/*.tsx`, verified by grep) and the typecheck fixtures
  (`test/typecheck/public-editor-api.tsx`,
  `test/typecheck-consumer/consumer.tsx`) reference none of them.
- Existing tests: `test/unit/plugins/CardPlugins.test.ts` covers eight of
  the eleven as one batch (audio, bookmark, button, callout, file, gallery,
  toggle, video — including the payload-guard rejection case at :112-119 and
  bookmark's with-selection case at :81-110);
  `test/unit/plugins/ImagePlugin.test.tsx` covers image's insert dispatch
  (:64-90), media re-dispatch (:92-110), non-matching media type (:112-131),
  and invalid dataset (:133-149). Header and Html have **no** insert tests.
- E2E pins the mounting matrix end-to-end through the menus:
  `test/e2e/slash-menu.test.ts`, `test/e2e/plus-button.test.ts`,
  `test/e2e/cards/*.test.ts`, and the media path in
  `test/e2e/plugins/DragDropPastePlugin.test.ts`.

## Scope

**In scope**:

- A React-free insert vocabulary on the card declaration (illustrative:
  `CardInsertSpec` in `src/nodes/cards/card-declaration.ts` with
  `openInEditMode?`, `claimsMediaInsert?`, `requiresRangeSelection?`,
  `insertCommandPriority?`); the eleven insert-bearing declarations gain
  their `insert` entries. CodeBlock and HorizontalRule omit the entry —
  they have no derived insert registration.
- A wrapper-layer projection (illustrative:
  `src/nodes/cards/card-insert-commands.ts`) pairing each insert-bearing
  declaration with its wrapper node class (from the `card-wrappers`
  projection) and its command (from `card-menus`), mirroring how
  `card-wrappers.ts` / `card-decorate.tsx` attach wrapper-layer knowledge
  one layer up from the React-free declarations.
- ONE registrar plugin (illustrative: `src/plugins/CardInsertPlugin.tsx`)
  deriving all registrations from the projection, with the per-card
  `hasNodes` guard against the wrapper class.
- Characterization pins of the registration matrix; rewrite of the two
  existing plugin test files against the registrar with identical
  expectations.
- Switching the two mount sites (`AllDefaultPlugins.tsx`,
  `EmailEditor.tsx`) and the public barrel (`src/index.ts`).
- A one-line `CONTEXT.md` update recording insert-command registration as a
  derived view of the card declaration.

**Out of scope**:

- `HorizontalRulePlugin`, `InklingSelectorPlugin`, `InklingSnippetPlugin`,
  `DragDropPastePlugin` (the `INSERT_MEDIA_COMMAND` dispatcher — its
  definition stays at `DragDropPastePlugin.tsx:21`; do not move it).
- `INSERT_CODE_BLOCK_COMMAND` handling (no handler exists; none added).
- Any change to the `INSERT_*_COMMAND` definitions or their plan-025 payload
  types in `card-menus.ts:43-56`, and to `INSERT_CARD_COMMAND` /
  `registerCardCommands`.
- The upload flow (`imageUploadHandler`, `ImageNodeComponent`) — the dead
  code in `ImagePlugin` is deleted with the file, not salvaged.
- Renderer-side code (`src/nodes/base/`), markdown transformers, node sets.

## Commands you will need

| Purpose | Command | Expected on success |
| ------- | ------- | ------------------- |
| Drift check (run first) | `git diff --stat d998080..HEAD -- src/plugins src/nodes/cards src/components/EmailEditor.tsx src/index.ts test/unit/plugins CONTEXT.md` | empty or explainable before starting |
| Characterization baseline | `pnpm test:unit` | 1707 passed + 21 todo at HEAD |
| Plugin unit tests | `pnpm vitest run test/unit/plugins` | green at every step |
| Registrar tests | `pnpm vitest run test/unit/plugins/<registrar test file>` | green from Step 2 on |
| Static + full gates | `pnpm typecheck && pnpm lint && pnpm test:unit` | all pass |
| Format | `pnpm format && pnpm format:check` | exits 0 |
| Public-surface gates (Step 3) | `pnpm verify:package && pnpm verify:types` | packed consumer + type consumer pass with the renamed barrel |
| Scoped e2e (Step 4) | `pnpm test:e2e:quiet test/e2e/slash-menu.test.ts test/e2e/plus-button.test.ts test/e2e/cards test/e2e/plugins/DragDropPastePlugin.test.ts` | green — menu insertion and media drops are demo-visible |

## Git workflow

- Branch: none — commit directly on `main` (grilling decision for this
  batch, overriding the `advisor/NNN-<slug>` convention in
  `plans/README.md`). No push, no PR.
- Commit 1: `test(plugins): pin the card insert registration matrix`
- Commit 2: `refactor(cards): derive insert registration from the card declarations`
- Commit 3: `refactor(plugins): delete the eleven per-card insert plugins`
- Conventional messages; the Step-1 message records the new pin count, the
  Step-3 message records the deliberate barrel change and the header-churn
  assertion flip with before/after evidence.

## Steps

### Step 1: Characterize the registration matrix

Lock current behavior before touching production code. Add a new pin file
(illustrative: `test/unit/plugins/CardInsertMatrix.test.ts`) using the
existing idiom (`vi.mock('@lexical/react/LexicalComposerContext')` +
`renderHook`, as in `CardPlugins.test.ts:24-50`); leave the two existing
test files untouched in this commit.

- **Per-card insert pin**, for each of the eleven cards: mount its plugin in
  a headless editor registering the wrapper node; dispatch its
  `INSERT_*_COMMAND` with a valid dataset; assert (a) dispatch returns
  `true`, (b) `INSERT_CARD_COMMAND` fired with `cardNode` an instance of the
  wrapper class, (c) `openInEditMode` key presence per the matrix —
  `toHaveProperty('openInEditMode', true)` for button/callout/header/html/
  toggle, `not.toHaveProperty('openInEditMode')` for the other six. Header
  and Html get their first insert coverage here.
- **Payload-guard pin** (three representative cards suffice — e.g. header,
  html, video): `null` and `'not-an-object'` payloads return `false` and
  never fire `INSERT_CARD_COMMAND`. (Button's case already exists at
  `CardPlugins.test.ts:112-119`; do not duplicate it.)
- **`hasNodes` guard pin**: a plugin mounted in an editor lacking its node
  registers nothing — e.g. mount `HeaderPlugin` in an editor built with
  `EMAIL_EDITOR_NODES` and assert `INSERT_HEADER_COMMAND` dispatch returns
  `false`. This doubles as the email-side mounting-matrix pin.
- **Bookmark dispatch-semantics pins**: (a) with no range selection,
  `INSERT_BOOKMARK_COMMAND` returns `false` and `INSERT_CARD_COMMAND` never
  fires (new — the observable edge of the redundant check); (b) the
  with-selection case already exists (`CardPlugins.test.ts:81-110`).
- **Media pins**: audio and video re-dispatch their own insert command with
  `{ initialFile: <the File> }` for matching `INSERT_MEDIA_COMMAND` payloads
  (image's case exists at `ImagePlugin.test.tsx:92-110`); and a
  `type: 'file'` payload is claimed by no handler — with all media plugins
  mounted, the `INSERT_MEDIA_COMMAND` dispatch returns `false` (pins the
  File gap as current behavior, not as a bug to fix).
- **Header churn pin**: spy on `editor.registerCommand`, `rerender()` the
  hook N times, assert the registration count grows with renders. This pins
  the bug as documentation; Step 3 flips exactly this assertion to a
  constant count — the plan's one deliberate expectation change.
- Run `pnpm test:unit`; record the new test count delta in the commit
  message.

### Step 2: Declaration vocabulary, projection, and the registrar

Additive only — the eleven plugins stay mounted; nothing they do changes.

- `src/nodes/cards/card-declaration.ts`: add the React-free insert
  vocabulary (illustrative):

  ```ts
  export interface CardInsertSpec {
    /** dispatch INSERT_CARD_COMMAND with openInEditMode: true after construction */
    openInEditMode?: boolean
    /** claim INSERT_MEDIA_COMMAND payloads whose type equals this card's nodeType */
    claimsMediaInsert?: boolean
    /** bookmark only — historical; redundant with INSERT_CARD_COMMAND's own
        selection handling but observable in dispatch return values */
    requiresRangeSelection?: boolean
    /** bookmark only — historical HIGH priority; every other card is LOW */
    insertCommandPriority?: 'high'
  }
  ```

  and `insert?: CardInsertSpec` on `CardDeclaration`, documented as the
  card's membership in the insert-command surface — the presence of `insert`
  is the opt-in; an empty spec (`file`, `gallery`) is the common case.
- The eleven declarations gain their entries per the matrix: audio/image/
  video `{ claimsMediaInsert: true }`; button/callout/header/html/toggle
  `{ openInEditMode: true }`; bookmark `{ requiresRangeSelection: true,
  insertCommandPriority: 'high' }`; file/gallery `{}`.
- The wrapper-layer projection (illustrative:
  `src/nodes/cards/card-insert-commands.ts`): map the insert-bearing
  declarations to `{ nodeType, node, command, insert }` — `node` from the
  `card-wrappers` projection (the same wrapper classes the plugins guard
  and construct today), `command` from `card-menus`. Preferred resolution:
  `CARD_MENUS[nodeType][0].insertCommand`, the first-menu-entry convention
  `getCardDragIcon` already documents (`card-menus.ts:249-258`); if the
  typing (`MenuItem.insertCommand` is `unknown`, `buildCardMenu.ts:12`)
  fights back, an explicit `CARD_INSERT_COMMANDS` map in `card-menus.ts` is
  the accepted fallback — executor detail, keep it one map.
- The registrar (illustrative: `src/plugins/CardInsertPlugin.tsx`). One
  effect on `[editor]`; per-card `hasNodes` guard against the wrapper class;
  the derived handler shape is fixed:

  ```ts
  (dataset) => {
    if (insert.requiresRangeSelection) {
      // bookmark parity: the selection check precedes the dataset guard,
      // and construction happens inside the focusNode check
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return false
      if (!isCardDataset(dataset)) return false
      if (selection.focus.getNode() !== null) {
        editor.dispatchCommand(INSERT_CARD_COMMAND, payload())
      }
      return true
    }
    if (!isCardDataset(dataset)) return false
    editor.dispatchCommand(INSERT_CARD_COMMAND, payload())
    return true
  }
  ```

  where `payload()` preserves key presence exactly:
  `{ cardNode: new node(dataset), ...(insert.openInEditMode ? { openInEditMode: true } : {}) }`,
  and `isCardDataset` is the single shared guard
  (`typeof value === 'object' && value !== null`) carrying the copied
  comment about the untyped runtime edge. Priorities: `LOW`, except
  bookmark's spec-driven `HIGH`. Media claimants additionally register
  `INSERT_MEDIA_COMMAND` at `COMMAND_PRIORITY_HIGH`, comparing
  `payload.type === nodeType` and re-dispatching the card's own command with
  `{ initialFile: payload.file }` — `INSERT_MEDIA_COMMAND` imported from
  `@/plugins/DragDropPastePlugin` (same layer; no new module homes).
  Registration order follows declaration order (order is behaviorally
  inert here: distinct commands, and the three media handlers are
  type-disjoint).
- New registrar test file replicating every Step-1 pin against the
  registrar — same scenarios, same expectations, different mount. Both the
  pins (against the old plugins) and the registrar tests (against the new
  one) are green simultaneously at the end of this step; that simultaneity
  is the zero-drift proof.
- `CONTEXT.md`: extend the "card declaration" entry — insert-command
  registration (command, edit-mode flag, media claiming) is now part of
  what the declaration names, with the registrar as its derived view.
- Gates: `pnpm typecheck && pnpm lint && pnpm test:unit`. `INSERT_*_COMMAND`
  definitions keep their plan-025 payload types; the registrar is internal
  and may work at the guarded-dataset interface — do not weaken the public
  command types to make the derivation type-check.

### Step 3: Delete the eleven plugins and switch the mount sites

One commit:

- Delete `src/plugins/{Audio,Bookmark,Button,Callout,File,Gallery,Header,Html,Image,Toggle,Video}Plugin.tsx`.
- `AllDefaultPlugins.tsx:35-47`: replace the eleven card-plugin elements
  with the single registrar, keeping the `{/* Card Plugins */}` position;
  `EmEnDashPlugin` and `HorizontalRulePlugin` stay where they are.
- `EmailEditor.tsx:106-108,113-114`: replace the five elements with the
  registrar. The per-card `hasNodes` guards reproduce the subset exactly —
  do not add a surface prop to "help"; the node set already encodes it.
- `src/index.ts`: remove the eleven plugin imports/exports; export the
  registrar in their place. This is the plan's deliberate public-surface
  change — record it in the commit message.
- Rewrite `test/unit/plugins/CardPlugins.test.ts` and
  `test/unit/plugins/ImagePlugin.test.tsx` to mount the registrar with
  byte-identical expectations (only the mount target changes), fold the
  Step-1 pin file alongside, and flip the header-churn assertion to a
  constant registration count with the before/after counts in the commit
  message. Net unit-test delta from the post-Step-1 count: zero, plus the
  one flipped assertion.
- Run the public-surface gates: `pnpm verify:package && pnpm verify:types`.
- Run `pnpm format` (imports changed broadly) then `pnpm format:check`.

### Step 4: Full gates and scoped e2e

- `pnpm typecheck && pnpm lint && pnpm test:unit` — unit count equals the
  post-Step-1 count; todo set unchanged.
- `pnpm vitest run test/nodes-base test/html-renderer` — 730 passed + 21
  todo, untouched by this plan.
- `pnpm test:e2e:quiet test/e2e/slash-menu.test.ts test/e2e/plus-button.test.ts test/e2e/cards test/e2e/plugins/DragDropPastePlugin.test.ts` —
  menu insertion, per-card insertion, and the drag/paste media path are
  demo-visible and pin the mounting matrix end-to-end.
- Update the status row in `plans/README.md`.

## Test plan

| Scenario | Command | Required invariant |
| -------- | ------- | ------------------ |
| Baseline | `pnpm test:unit` | 1707 + 21 todo at HEAD |
| Step-1 pins | `pnpm vitest run test/unit/plugins` | new pins green against today's plugins |
| Registrar parity (Step 2) | `pnpm vitest run test/unit/plugins` | pins (old mount) AND registrar tests (new mount) green simultaneously |
| Deletion (Step 3) | `pnpm vitest run test/unit/plugins` | identical expectations against the registrar; only the header-churn assertion flipped |
| Email matrix | the `hasNodes` pin | `INSERT_HEADER_COMMAND` (and the five other non-email cards) unhandled under `EMAIL_EDITOR_NODES` before and after |
| Media gap | the `type: 'file'` pin | unclaimed before and after |
| Public surface | `pnpm verify:package && pnpm verify:types` | pass with the renamed barrel |
| Mounting e2e | `pnpm test:e2e:quiet test/e2e/slash-menu.test.ts test/e2e/plus-button.test.ts test/e2e/cards test/e2e/plugins/DragDropPastePlugin.test.ts` | green |
| Full gates | `pnpm typecheck && pnpm lint && pnpm test:unit` + `pnpm vitest run test/nodes-base test/html-renderer` | unit = post-Step-1 count; nodes-base/html-renderer = 730 + 21 todo |

## Acceptance criteria

- Every `INSERT_*_COMMAND` registration, payload guard, `openInEditMode`
  flag, media re-dispatch, priority, and bookmark quirk behaves exactly as
  pinned in Step 1 — with two named exceptions: header registers once per
  mount instead of once per render, and the barrel exports the registrar
  instead of the eleven plugin names.
- The insert registration for all eleven cards lives in the card
  declarations as data; one registrar module derives registrations from the
  wrapper-layer projection; the eleven per-card plugin files are gone.
- The mounting matrix is reproduced structurally: the same commands are
  handled in the web editor, the email editor, and nested composers (none),
  enforced by the per-card `hasNodes` guards and pinned by the email-side
  test.
- `CardPlugins.test.ts` / `ImagePlugin.test.tsx` expectations carried over
  unchanged; net unit-count delta from post-Step-1 is zero.
- `CONTEXT.md` records insert registration as a derived view of the card
  declaration.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm verify:package`,
  `pnpm verify:types`, and the scoped e2e set green.

## STOP conditions

- Any pinned behavior drifts in Step 2 or Step 3 beyond the two sanctioned
  changes — a dispatch return value, an `openInEditMode` key, a media
  re-dispatch, the email-side matrix. Revert that one commit, keep the
  pins, reassess the derived handler — never "update expectations" to make
  it pass.
- The command cannot be resolved from the declaration without changing
  behavior (e.g. the first-menu-entry convention yields the wrong command
  for a card — Image's second menu entry is the GIF selector). Fall back to
  the explicit `CARD_INSERT_COMMANDS` map; do not improvise per-card
  branches in the registrar.
- A mounting-matrix edge appears that `hasNodes` cannot reproduce — e.g. a
  consumer-visible editor where a plugin was mounted but its node absent,
  and the registrar's guard class (base vs wrapper) no longer matches.
  Verify the guard uses the exact wrapper classes from `card-wrappers`; if
  an editor registers a *different* class under the same node type, STOP
  and report rather than broadening the guard.
- `pnpm verify:package` / `pnpm verify:types` fail on the barrel change in a
  way that suggests real downstream breakage the repo's own fixtures can't
  see. Keep the registrar, restore the deleted exports' names only as
  re-export aliases of the registrar if mechanically possible, and report —
  do not silently keep the eleven files alive as shims.
- A hidden consumer of the eleven public plugin exports is discovered
  during execution (demo, stories, fixtures — planning-time grep found
  none). STOP and report before deleting; the grilling approval covered the
  known surface.

## Rollback plan

Steps land as three independent commits on `main`. Revert Step 3 alone
(`git revert <sha>`) to restore the eleven plugin files, the old mount
sites, and the barrel while keeping Step 2's declaration vocabulary and
registrar — additive and inert while unmounted. Revert Step 2 only after
Step 3 is reverted (Step 3 depends on it). Step 1's pin file stays valid
against the un-reverted code in every rollback state: it mounts today's
plugins, which the rollback restores. If the registrar approach itself
proves unsound mid-execution, revert to `d998080`'s tree state for
`src/plugins/` — the pins remain as the evidence for the next attempt, and
the header no-dep-array fix can still ship alone as a one-line
`}, [editor])` fix in `HeaderPlugin.tsx:36` (cherry-pickable, touches only
that file and its churn test).
