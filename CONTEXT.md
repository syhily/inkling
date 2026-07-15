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
The single per-card source of truth naming everything the editor must know about a card: its card spec and which editor surfaces it joins (node sets, markdown, email). Every registry is a derived view over the card declarations.
_Avoid_: card registration, card manifest

**Render target**:
Where a card's exported markup is going: **web** (the editor's own frontend) or **email** (email clients, with Outlook-grade markup constraints). A card can have structurally different output per target.
_Avoid_: environment, platform

**Card selection store**:
The per-top-level-composer, editor-side store owning card-selection truth for non-React code: the selected card key and the edit-mode flag. Fed once by registerCardSelection, read synchronously by command handlers, subscribed to render-only by React via useCardSelection.
_Avoid_: selection context, selection mirror, selected-card state
