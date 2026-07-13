import type { Klass, LexicalEditor, LexicalNode } from 'lexical'

import type { InklingEditorInternals } from '@/types/lexical-internals'

// Typed accessors for Lexical's private fields. Verified against Lexical 0.46
// (node_modules/lexical/dist/LexicalEditor.d.ts): there is no public accessor
// to enumerate registered nodes (hasNode/hasNodes/getRegisteredNode all require
// already knowing the class) and no public "update in progress" flag. Keep every
// private access here so a Lexical upgrade touches exactly one place.
export function getRegisteredNodeMap(editor: LexicalEditor): Map<string, { klass: Klass<LexicalNode> }> {
  // TODO: open upstream PR to add a public method of getting nodes
  return (editor as InklingEditorInternals & { _nodes: Map<string, { klass: Klass<LexicalNode> }> })._nodes
}

export function isEditorUpdating(editor: LexicalEditor): boolean {
  return (editor as InklingEditorInternals)._updating
}
