import type { CreateEditorArgs, LexicalEditor, LexicalNodeConfig } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'

import { DEFAULT_HTML_NODES } from '@/html/default-html-nodes'
import { DEFAULT_CONFIG } from '@/nodes/base'

// The one headless-editor factory for the HTML surface (CONTEXT.md:
// "headless HTML surface"): the renderer, the plain-text leg, and the
// importer shared three copies of "create a headless editor over
// DEFAULT_HTML_NODES (+ extras)". The node-merge policy is now NAMED
// instead of comment-carried — the two semantics differ on purpose:
//
// - 'additive' (renderer, plain-text): the caller's nodes are registered
//   AFTER the complete Inkling HTML defaults, so a same-type custom entry
//   wins (Lexical keeps the last registration per type).
// - 'wholesale' (importer): the caller's editorConfig replaces the defaults
//   — nothing is merged. Do NOT "unify" these.

export type HeadlessEditorSpec =
  | { merge: 'additive'; nodes?: LexicalNodeConfig[]; onError?: (error: Error) => void }
  | { merge: 'wholesale'; editorConfig?: CreateEditorArgs }

export function createHeadlessHtmlEditor(spec: HeadlessEditorSpec): LexicalEditor {
  if (spec.merge === 'additive') {
    return createHeadlessEditor({
      nodes: [...DEFAULT_HTML_NODES, ...(spec.nodes ?? [])],
      onError: spec.onError,
    })
  }

  const defaultEditorConfig = {
    nodes: [...DEFAULT_HTML_NODES],
    html: DEFAULT_CONFIG.html,
  }
  return createHeadlessEditor(Object.assign({}, defaultEditorConfig, spec.editorConfig))
}
