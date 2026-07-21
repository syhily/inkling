// The nested-editor protocol — the shared vocabulary nested editors (card
// sub-editors and caption editors) use to talk to their parent editor, owned
// by this one headless module so it stops being an untyped convention
// scattered across five files.
//
// Two nouns:
//
// - Event provenance. Nested editors re-dispatch keyboard commands to the
//   parent editor (e.g. caption Enter → the parent's KEY_ENTER_COMMAND), and
//   the SAME KeyboardEvent object crosses the boundary, so provenance rides
//   on the event itself. Writers call `markEventFromNested` /
//   `markEventFromCaptionEditor` before dispatching; readers call
//   `getEventProvenance`. The mutation mechanism is this module's hidden
//   implementation — only this file knows the property names, so writers and
//   readers can no longer drift apart.
//   Writers: `InklingNestedEditorPlugin.tsx`, `InklingCaptionEditor.tsx`.
//   Readers: `keyboard-navigation/arrows.ts`, `keyboard-navigation/enter.ts`.
//
// - Typeahead presence. Lexical 0.46.0 added `commandPriority` to typeahead
//   menus, but the project's menus still register at the default
//   COMMAND_PRIORITY_LOW, so an open menu cannot pre-empt the nested editors'
//   own Enter/Arrow handlers by priority. Until menus register higher, those
//   handlers must bail out when a menu is open, and `isTypeaheadMenuOpen` is
//   the single place that names the menu's DOM id (stamped by Lexical's
//   LexicalTypeaheadMenuPlugin itself, so it is not ours to change).

export type NestedEditorProvenance = 'nested-editor' | 'caption-editor'

// The two marker properties that carry provenance on a re-dispatched event.
// Kept private to this module: external code must go through the mark/get
// functions above so no reader ever casts again.
interface ProvenanceMarkedKeyboardEvent extends KeyboardEvent {
  _fromNested?: boolean
  _fromCaptionEditor?: boolean
}

// Mark an event as re-dispatched from a card's nested editor (e.g. the Header
// subheader, or a caption's Enter key — see `InklingCaptionEditor.tsx`).
// Returns the same event for dispatch convenience.
export function markEventFromNested(event: KeyboardEvent): KeyboardEvent {
  const marked = event as ProvenanceMarkedKeyboardEvent
  marked._fromNested = true
  return marked
}

// Mark an event as re-dispatched from a card's caption editor (the caption
// arrow keys, which select the owning card in the parent editor).
export function markEventFromCaptionEditor(event: KeyboardEvent): KeyboardEvent {
  const marked = event as ProvenanceMarkedKeyboardEvent
  marked._fromCaptionEditor = true
  return marked
}

// Read back the provenance of a (possibly re-dispatched) event. `null` means
// the event originated in this editor and was never marked.
export function getEventProvenance(event: KeyboardEvent | null | undefined): NestedEditorProvenance | null {
  if (!event) {
    return null
  }
  const marked = event as ProvenanceMarkedKeyboardEvent
  if (marked._fromNested) {
    return 'nested-editor'
  }
  if (marked._fromCaptionEditor) {
    return 'caption-editor'
  }
  return null
}

// Lexical's LexicalTypeaheadMenuPlugin stamps this id on its menu container
// (`containerDiv.setAttribute('id', 'typeahead-menu')`), so the selector is
// part of Lexical's runtime contract rather than our markup.
const TYPEAHEAD_MENU_ID = 'typeahead-menu'

export function isTypeaheadMenuOpen(): boolean {
  return typeof document !== 'undefined' && document.getElementById(TYPEAHEAD_MENU_ID) !== null
}
