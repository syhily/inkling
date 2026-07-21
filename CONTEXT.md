# Inkling Editor

A Lexical-based rich-text editor built around cards — block-level embeds (image, video, button, bookmark, …) that live inside the document but behave as atomic units.

## Language

**Card**:
A block-level embed in the document (image, video, gallery, button, bookmark, callout, toggle, header, file, audio, html, code block, horizontal rule). Atomic from the writer's perspective: selected as a unit, deleted as a unit.
_Avoid_: decorator, embed, block

**Card adjacency**:
The state of the caret or selection sitting immediately before or after a card. Comes in two notions: **visual adjacency** (the caret's rendered position, derived from geometry — what arrow keys care about) and **logical adjacency** (the selection anchor's offset — what backspace/delete care about).
_Avoid_: next-to-card, beside-card

**Card spec**:
The declarative definition of a card — its properties, card menu, nested editors, and transient state — from which the card's node behaviour is produced. Simple cards are nothing but their spec.
_Avoid_: card config, card definition

**Card declaration**:
The single per-card source of truth naming everything the editor must know about a card: its card spec, which editor surfaces it joins (node sets, markdown, email), and its insert-command registration (command, edit-mode flag, media claiming). Every registry is a derived view over the card declarations — the node sets, the menus, the decorate targets, and the insert registrar (`CardInsertPlugin`).
_Avoid_: card registration, card manifest

**Import spec**:
The card declaration's DOM-import knowledge — how the card's markup reads back into node state on HTML import/paste: declarative conversion entries (tag, priority, guard, per-property reads) defined beside the card's `properties` in its base node module, from which the generated node machinery derives `importDOM`. The generator throws at class-creation time when a read names an unknown property. Cards whose parsing is structural (collection payloads, sibling walking, DOM mutation, derived payloads) keep hand-written parsers.
_Avoid_: import parser, DOM conversion config

**Render target**:
Where a card's exported markup is going: **web** (the editor's own frontend) or **email** (email clients, with Outlook-grade markup constraints). A card can have structurally different output per target.
_Avoid_: environment, platform

**Render context**:
The read-only, per-render-pass view of export-time policy and data that is the sole export-time view a card renderer receives besides the node: URL safety, sanitization, render-target branching, feature/design flags, color checks, document resolution, heading-id tracking, image/markdown data options. The public entry points (`exportDOM(editor, options)`, `$convertToHtmlString`, `LexicalHTMLRenderer.render`) still accept the export options and build the context from them. Card sources must not import the policy modules directly — an import guard enforces the seam.
_Avoid_: options bag, policy object

**Card write seam**:
The typed write path for card-node fields: `$updateCardNode(nodeKey, guard, update)` (src/nodes/base/update-card-node.ts), called inside `editor.update()`. The card's own `$is*` guard narrows the node, so every field the mutator writes is checked against the card's node type. One sanctioned exception: `useVisibilityToggle` keeps the old cast idiom because its test suite doubles the node structurally (plan 044 execution notes).
_Avoid_: `$getNodeByKey` + `as GeneratedDecoratorNodeBase`

**Card selection store**:
The per-top-level-composer, editor-side store owning card-selection truth for non-React code: the selected card key, the edit-mode flag, and the visibility-settings panel flag (global, not per card — the visibility command handlers set it and the HTML card, the sole indicator-icon card, reads it gated by its own selected state). Built on the composer handle factory; fed by registerCardSelection and the card/visibility command handlers, read synchronously by command handlers, subscribed to render-only by React via useCardSelection. There is no per-feature selection context — the former `InklingSelectedCardContext` folded into this store.
_Avoid_: selection context, selection mirror, selected-card state

**Composer handle**:
A per-top-level-composer, editor-side channel in the card-selection-store shape (getState / setState(partial) / subscribe, reference-equality change guard, render-only useSyncExternalStore binding, one provider-created instance with a module-default fallback) for values non-React code must read synchronously. One factory owns the pattern — `createComposerHandle` / `createComposerHandleBinding` (src/plugins/behaviour/composer-handle.ts) — and every channel is a configuration of it, never a copied store: the card selection store (above), the drag-drop handle, and the word-count handle. The drag-drop handle (src/plugins/behaviour/dragDropHandle.ts) owns the editor container element, the DragDropHandler, and the isDragging flag: fed at mount by InklingComposableEditor and DragDropReorderPlugin (which also flips isDragging on drag start/end), read synchronously by useCardDragAndDrop and useGalleryReorder — hooks register through the useDragDropContainer adapter when the handler appears instead of relying on plugin-before-children mount order — and subscribed render-only by card chrome (InklingCardWrapper, ActionToolbar) for isDragging. The word-count handle (src/plugins/behaviour/wordCountHandle.ts) owns the top-level WordCountPlugin's onChange callback: fed at mount by that plugin, subscribed render-only by InklingNestedComposer via useWordCountCallback, which mounts a nested WordCountPlugin reactively when the callback lands instead of reading a shared ref once at render time.
_Avoid_: context mutation channel, shared ref

**Reorder rules**:
The one pure module owning drag-reorder and drop-allowance decisions (src/utils/draggable/reorder-rules.ts): `resolveReorder` / `resolveDrop` / `isReorderAllowed` decide from geometry and indices alone, behind the `ReorderGeometry` seam (`createReorderGeometry(container, droppableSelector)`), so the rules carry unit tests and the DOM stays at the edges. `DragDropReorderPlugin` and `useGalleryReorder` are adapters over it — the previous third drop-allowance implementation is gone, and `insertIndex` derivation (with `adjustInsertIndexForRemoval`) lives in exactly one place.
_Avoid_: drop logic, drag rules

**Nested-editor protocol**:
The named vocabulary for events crossing editor boundaries (src/plugins/behaviour/nested-editor-protocol.ts): `markEventFromNested` / `markEventFromCaptionEditor` tag a KeyboardEvent at the boundary, `getEventProvenance` reads the tag downstream (`NestedEditorProvenance`), and `isTypeaheadMenuOpen` is the single typeahead-open check. Consumers ask the protocol instead of reading monkey-patched flags or re-querying the typeahead menu DOM.
_Avoid_: event flag, nested-event hack

**Upload intent**:
The one media-upload flow module (src/utils/upload-intent.ts): file(s) plus per-card metadata extraction in, a typed node patch out through the card write seam, and the object-URL preview lifecycle created and revoked in one place. Each media card's upload is a configuration of these primitives — per-card variance (metadata extraction, empty-result policy, pre-upload src reset) stays per-card data, never a copied skeleton.
_Avoid_: upload handler, upload helper

**Preview lease**:
The owned lifetime of a blob object URL used as an in-editor preview: created by `createPreviewLease`, released exactly once by `release()` (idempotent), bridged to React state by `usePreviewLease`. Replacing or clearing a preview releases the previous lease; unmounting releases whatever is still held.
_Avoid_: preview URL ref, object-URL ref

**Host config**:
The closed, per-area-sliced config a host hands `<InklingComposer cardConfig={...}>` — the exported `CardConfig` composed from `GifSettings`, `SnippetSettings`, `LinkingSettings`, `VisibilitySettings`, `UploadSettings` (src/context/InklingHostIntegrationContext.tsx): gif provider keys, snippet storage callbacks, link search/embed/autocomplete hooks, visibility gating, image upload constraints, and the content-type name for card-menu gating. Every key the editor reads is declared; unknown keys are compile errors. The exported name stays `CardConfig` — the host-facing name the demo, docs, and internal readers already use — even though the glossary forbids "card config" as a term for card spec: this bag configures the host environment the cards run in, never an individual card's definition.
_Avoid_: options bag, card settings

**Clipboard protocol**:
The one headless module owning the paste pipeline's shared vocabulary (src/plugins/behaviour/clipboard-protocol.ts): the MIME constants, `PASTE_MARKDOWN_COMMAND`, `INSERT_MEDIA_COMMAND`, one per-editor modifier state (`getModifierState(editor)`), and input-side link acceptance. The pipeline: `registerPasteHandler.ts` (entry, `PASTE_COMMAND`) → `plainTextPaste.ts` (shared plain-text classifier) → the link leg (`PASTE_LINK_COMMAND`, already headless in `behaviour/commands.ts`, handled by `registerLinkMatching.ts`), the markdown leg (`PASTE_MARKDOWN_COMMAND` → the headless `markdownToSanitizedHtml` in `behaviour/markdownPaste.ts` → `MarkdownPastePlugin`, which keeps only the DataTransfer glue), and the file leg (`INSERT_MEDIA_COMMAND` dispatched by `DragDropPastePlugin`, claimed per card by `CardInsertPlugin`). The protocol owns the modifier state's writes as well as its storage: the first `getModifierState(editor)` call for an editor attaches one document keydown/keyup pair writing the single `event.shiftKey` formulation (reading held-state off every key event covers the dual-shift-release corner, so it no longer exists), and the markdown leg's command listener reads the state instead of closing over React state, so Shift press/release no longer re-registers it. There is no listener teardown — Lexical editors have no destroy hook, and the codebase's per-editor WeakMap resources rely on the key's GC; the listeners close over only the state object, never the editor.
_Avoid_: paste utils, clipboard helpers

**Markdown dialect**:
One of the editor's two named markdown import pipelines, each a real module whose `grammar` declares what it speaks as data (the shared `MarkdownDialect`/`MarkdownDialectGrammar` seam lives in src/markdown/dialects.ts). The **paste dialect** (`pasteDialect`, src/markdown/paste-dialect.ts — `PASTE_MARKDOWN_COMMAND` → `MarkdownPastePlugin`) renders clipboard text through the headless `markdownToSanitizedHtml` (src/plugins/behaviour/markdownPaste.ts): markdown-it (footnote/mark/sub/sup plugins — an engine the markdown card's HTML export also uses) + `sanitizeHtml`, then Lexical HTML import; it speaks footnotes, `==mark==`, `~sub~`, `^sup^`, and has no card-fence grammar, so a pasted ` ```inkling:*``` ` fence becomes a code block card whose language is the fence tag. The **card-aware round-trip dialect** (`roundTripDialect`, src/markdown/round-trip.ts — `markdownToLexicalState` / `lexicalStateToMarkdown`) imports and exports through `@lexical/markdown` with the Inkling card transformers; it speaks ` ```inkling:<card>``` ` fences and standard `![alt](src)` image syntax but not footnotes. Both dialects map `==mark==` to highlight and `~`/`^` to sub/superscript. Whether the paste path should adopt the card-aware dialect is an open product question (docs/markdown-api.md).
_Avoid_: markdown pipeline, markdown mode

**Card shortcut**:
A typing shortcut that turns the current paragraph into a card — the code fence (` ```lang `) and the horizontal rule (---). One seam module (src/markdown/card-shortcuts.ts) owns each shortcut's trigger regexes and replace-and-select implementation; the call sites keep only their trigger: the enter and tab keys (keyboard-navigation), the markdown shortcut/import transformers (`CODE_BLOCK`/`HR` in src/markdown/transformers.ts), and the HR per-update scan (HorizontalRulePlugin). Trigger semantics differ on purpose per trigger and are named in the seam rather than flattened — e.g. the fence transformer fires only on the trailing-space keystroke while enter/tab fire regardless of trailing space.
_Avoid_: markdown shortcut, slash command

**Selection-anchored popup**:
A fixed-position popup laid out against an anchor rect — the at-link results popup and the link-action toolbar. One module owns the layout (src/utils/selection-anchored-popup.ts): the below-the-anchor default with an above-the-anchor flip when the popup plus its max-height budget would overflow the scroll container, the budget itself (`popupMaxHeightBudget` = results-list `POPUP_LIST_MAX_HEIGHT_VH` + `POPUP_TOOLBAR_HEIGHT_PX`, single-sourced with the CSS-side max height), and the two anchor adapters (`createNodeElementAnchor`, `createSelectionAnchor`). The flip rules take rects as plain data so they are unit-testable without layout; `useSelectionAnchoredPopup` (src/hooks) is the React adapter owning measuring, style writes, and the reposition subscription set (`usePopupRepositionSubscriptions`: window resize, container scroll, popup content mutations — also used by FloatingToolbar).
_Avoid_: floating popup, dropdown positioning

**Floating panel**:
The draggable settings panel a card opens beside itself. One module owns its layout decisions (src/utils/floating-panel.ts): the clamp math (`clampWithinSpacing` / `clampOnDrag` / `clampOnResize` — minimum spacing honouring the panel's previous spacing, then the hard drag boundary), the card-origin resolution (a transformed card, e.g. wide, becomes the coordinate origin), the initial placement (below the card on mobile, right of the card centered on its visible height on desktop), viewport-growth drift back towards that placement, and the headless **drag session** (`createDragSession`: start threshold → move → end, with the scroll/selection/pointer suppression declared behind effect ports). `useFloatingPanel` (src/hooks) is the single React adapter owning the DOM ports (body-level pointer listeners, the user-select stylesheet, click suppression, the panel and scroll-container ResizeObservers); SettingsPanel is its sole consumer. It replaces the former useMovable/useSettingsPanelReposition stack — two stacked single-consumer seams whose tests went around the seam.
_Avoid_: movable, draggable panel

**Link-editing flow**:
The headless module (src/plugins/behaviour/link-editing.ts) owning the link apply/read surgery and the floating-toolbar session. `$applyLinkToSelection(editor, url)` is the single apply-link-then-collapse-selection implementation (previously copy-pasted across the format toolbar, the link-action toolbar, and — a variant — the floating link toolbar); `$getLinkHrefAtSelection()` reads the href of the link at the selection; `$selectLinkText(linkNode)` selects a link's full text for editing. The **toolbar session** (`createToolbarSession`, built on the composer-handle factory) is the state machine behind the floating toolbars: `hidden | text | link | snippet`, where selection sync only acts while hidden/text — a link or snippet toolbar stays open across selection changes and closes only through its own actions. FloatingToolbarPlugin feeds the machine selection/DOM events and renders its state; the toolbar components are render adapters.
_Avoid_: link toolbar state, toggle-link surgery
