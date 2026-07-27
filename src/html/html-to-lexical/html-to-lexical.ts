import type { CreateEditorArgs, SerializedEditorState } from 'lexical'

import { $insertGeneratedNodes } from '@lexical/clipboard'
import { $generateNodesFromDOM } from '@lexical/html'
/* c8 ignore start -- V8 creates phantom branches for ESM imports */
import { $createParagraphNode, $getRoot } from 'lexical'

import type { ExportDOMDom } from '@/nodes/base'

import { createHeadlessHtmlEditor } from '@/html/headless-editor'
import { registerDefaultTransforms, type DefaultTransformsOptions } from '@/transforms'
import { MINIMAL_DOCUMENT } from '@/utils/initial-document'
/* c8 ignore stop */

export interface htmlToLexicalOptions {
  /** Required DOM port — parse goes through `dom.window.document`, so the module itself never touches a global or jsdom. */
  dom: ExportDOMDom
  editorConfig?: CreateEditorArgs
  /** Import-time alignment handling, passed through to the default transforms; 'strip' (default) resets `format`, 'keep' preserves imported text-align. */
  alignment?: DefaultTransformsOptions['alignment']
}

/* c8 ignore next -- V8 creates a phantom branch for the export */
export function htmlToLexical(html: string, options: htmlToLexicalOptions): SerializedEditorState {
  if (!html) {
    return MINIMAL_DOCUMENT
  }

  // The importer replaces the defaults wholesale when the caller passes
  // editorConfig.nodes; the renderer intentionally uses additive semantics
  // instead — the named merge modes in @/html/headless-editor make the
  // asymmetry structural, so do not "unify" the two.
  const editor = createHeadlessHtmlEditor({ merge: 'wholesale', editorConfig: options.editorConfig })

  // Standard parser entry — jsdom and browsers both support it, so the
  // injected dom's provenance stays out of this module.
  const doc = options.dom.window.document.implementation.createHTMLDocument('')
  doc.body.innerHTML = html.trim()

  // one-shot headless editor, so the default transforms only normalize this
  // import — see the transform-policy note in src/utils/initial-document.ts
  registerDefaultTransforms(editor, { alignment: options.alignment })

  editor.update(
    () => {
      // add a paragraph to avoid insertNodes throwing errors
      const paragraph = $createParagraphNode()
      $getRoot().append(paragraph)

      const nodes = $generateNodesFromDOM(editor, doc)

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
