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
The per-top-level-composer, editor-side store owning card-selection truth for non-React code: the selected card key and the edit-mode flag. Fed once by registerCardSelection, read synchronously by command handlers, subscribed to render-only by React via useCardSelection.
_Avoid_: selection context, selection mirror, selected-card state

**Composer handle**:
A per-top-level-composer, editor-side channel in the card-selection-store shape (getState / setState(partial) / subscribe, reference-equality change guard, render-only useSyncExternalStore binding, one provider-created instance with a module-default fallback) for values non-React code must read synchronously. Two instances exist. The drag-drop handle (src/plugins/behaviour/dragDropHandle.ts) owns the editor container element and the DragDropHandler: fed at mount by InklingComposableEditor and DragDropReorderPlugin, read synchronously by useCardDragAndDrop and useGalleryReorder — hooks register when the handler appears instead of relying on plugin-before-children mount order. The word-count handle (src/plugins/behaviour/wordCountHandle.ts) owns the top-level WordCountPlugin's onChange callback: fed at mount by that plugin, subscribed render-only by InklingNestedComposer via useWordCountCallback, which mounts a nested WordCountPlugin reactively when the callback lands instead of reading a shared ref once at render time.
_Avoid_: context mutation channel, shared ref

**Upload intent**:
The one media-upload flow module (src/utils/upload-intent.ts): file(s) plus per-card metadata extraction in, a typed node patch out through the card write seam, and the object-URL preview lifecycle created and revoked in one place. Each media card's upload is a configuration of these primitives — per-card variance (metadata extraction, empty-result policy, pre-upload src reset) stays per-card data, never a copied skeleton.
_Avoid_: upload handler, upload helper

**Preview lease**:
The owned lifetime of a blob object URL used as an in-editor preview: created by `createPreviewLease`, released exactly once by `release()` (idempotent), bridged to React state by `usePreviewLease`. Replacing or clearing a preview releases the previous lease; unmounting releases whatever is still held.
_Avoid_: preview URL ref, object-URL ref
