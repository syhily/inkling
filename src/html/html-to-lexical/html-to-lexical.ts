import type { CreateEditorArgs, SerializedEditorState, SerializedParagraphNode } from 'lexical'

import { $insertGeneratedNodes } from '@lexical/clipboard'
import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { JSDOM } from 'jsdom'
/* c8 ignore start -- V8 creates phantom branches for ESM imports */
import { $createParagraphNode, $getRoot } from 'lexical'

import { DEFAULT_HTML_NODES } from '@/html/default-html-nodes'
import { DEFAULT_CONFIG } from '@/nodes/base'
import { registerDefaultTransforms } from '@/transforms'
/* c8 ignore stop */

const EMPTY_PARAGRAPH: SerializedParagraphNode = {
  children: [],
  direction: null,
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  type: 'paragraph',
  version: 1,
}

const BLANK_DOCUMENT: SerializedEditorState = {
  root: {
    children: [EMPTY_PARAGRAPH],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

export interface htmlToLexicalOptions {
  editorConfig: CreateEditorArgs
}

/* c8 ignore next -- V8 creates a phantom branch for the export */
export function htmlToLexical(html: string, options?: htmlToLexicalOptions): SerializedEditorState {
  if (!html) {
    return BLANK_DOCUMENT
  }

  // The importer replaces these defaults wholesale when the caller passes
  // editorConfig.nodes; the renderer intentionally uses additive semantics
  // instead — do not "unify" the two behaviors.
  const defaultEditorConfig = {
    nodes: [...DEFAULT_HTML_NODES],
    html: DEFAULT_CONFIG.html,
  }
  const editorConfig = Object.assign({}, defaultEditorConfig, options?.editorConfig)

  const dom = new JSDOM(`<body>${html.trim()}</body>`)
  const editor = createHeadlessEditor(editorConfig)

  registerDefaultTransforms(editor)

  editor.update(
    () => {
      // add a paragraph to avoid insertNodes throwing errors
      const paragraph = $createParagraphNode()
      $getRoot().append(paragraph)

      const nodes = $generateNodesFromDOM(editor, dom.window.document)

      // use @lexical/clipboard as it has additional logic for normalizing nodes
      const selection = $getRoot().select()
      $insertGeneratedNodes(editor, nodes, selection)

      // clean up the original empty paragraph
      paragraph.remove()
    },
    { discrete: true },
  )

  const editorState = editor.getEditorState()

  return editorState.toJSON()
}
