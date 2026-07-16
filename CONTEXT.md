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

**Card selection store**:
The per-top-level-composer, editor-side store owning card-selection truth for non-React code: the selected card key and the edit-mode flag. Fed once by registerCardSelection, read synchronously by command handlers, subscribed to render-only by React via useCardSelection.
_Avoid_: selection context, selection mirror, selected-card state
