import type { SerializedEditorState, LexicalEditor, LexicalNodeConfig } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'

import type { ExportDOMDom, ExportDOMOptions } from '@/nodes/base'

import { DEFAULT_HTML_NODES } from '@/html/default-html-nodes'
import $convertToHtmlString from '@/html/renderer/convert-to-html-string'
import { registerRemoveAtLinkNodesTransform } from '@/transforms'

interface RenderOptions {
  target?: 'html' | 'email'
  dom?: ExportDOMDom
}

function defaultOnError(error: Error) {
  void error
  // do nothing
}

export default class LexicalHTMLRenderer {
  dom?: ExportDOMDom
  nodes: LexicalNodeConfig[]
  onError: (error: Error) => void

  constructor({
    dom,
    nodes,
    onError,
  }: { dom?: ExportDOMDom; nodes?: LexicalNodeConfig[]; onError?: (error: Error) => void } = {}) {
    this.dom = dom
    this.nodes = nodes || []
    this.onError = onError || defaultOnError
  }

  async render(lexicalState: SerializedEditorState | string, userOptions: RenderOptions = {}) {
    const defaultOptions: ExportDOMOptions = {
      target: 'html',
      dom: await this._getDefaultDom(userOptions.dom),
    }
    const options: ExportDOMOptions = Object.assign({}, defaultOptions, userOptions)

    // Custom nodes are additive: they are registered AFTER the complete
    // Inkling HTML defaults, so a custom entry with the same node type as a
    // default overrides it (Lexical keeps the last registration per type).
    const editor: LexicalEditor = createHeadlessEditor({
      nodes: [...DEFAULT_HTML_NODES, ...this.nodes],
      onError: this.onError,
    })

    const editorState = editor.parseEditorState(lexicalState)

    // set up editor with our state
    editor.setEditorState(editorState)

    // register transforms that clean up state for rendering
    registerRemoveAtLinkNodesTransform(editor)

    // render
    let html = ''
    editor.update(() => {
      html = $convertToHtmlString(editor, options)
    })

    return html
  }

  private async _getDefaultDom(dom?: ExportDOMDom): Promise<ExportDOMDom> {
    if (dom) {
      return dom
    }

    if (this.dom) {
      return this.dom
    }

    // JSDOM default is a Node-side convenience. Consumers in browser
    // environments can pass any {window: {document}}-shaped object.
    const { JSDOM } = await import('jsdom')

    this.dom = new JSDOM()

    return this.dom
  }
}
