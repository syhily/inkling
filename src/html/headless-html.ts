import type { CreateEditorArgs, LexicalNodeConfig, SerializedEditorState } from 'lexical'

import { $getRoot } from 'lexical'

import type { ExportDOMDom, ExportDOMOptions } from '@/nodes/base'

import { resolveHeadlessDom } from '@/html/headless-dom'
import { createHeadlessHtmlEditor } from '@/html/headless-editor'
import { htmlToLexical } from '@/html/html-to-lexical/index'
import $convertToHtmlString from '@/html/renderer/convert-to-html-string'
import { registerRemoveAtLinkNodesTransform, type DefaultTransformsOptions } from '@/transforms'

export { DEFAULT_HTML_NODES } from '@/html/default-html-nodes'

export interface LexicalStateToHtmlOptions extends ExportDOMOptions {
  /** Additive on top of DEFAULT_HTML_NODES; a same-type entry registered later wins (renderer semantics). */
  nodes?: LexicalNodeConfig[]
  /** Swallows errors by default (the renderer's pinned behavior); server callers should pass one and fail fast. */
  onError?: (error: Error) => void
}

function defaultOnError(error: Error) {
  void error
  // do nothing
}

/**
 * Convert a serialized Lexical editor state to an HTML string — the headless
 * export half of the public HTML surface, one stateless function over the
 * internal renderer, mirroring the markdown pair's naming. The DOM resolves
 * through the headless DOM port: `options.dom`, then a global
 * `window.document`, then the optional `jsdom` peer.
 */
export async function lexicalStateToHtml(
  state: SerializedEditorState | string,
  options?: LexicalStateToHtmlOptions,
): Promise<string> {
  const { nodes, onError, ...renderOptions } = options ?? {}
  const dom = await resolveHeadlessDom(renderOptions.dom)

  const editor = createHeadlessHtmlEditor({ merge: 'additive', nodes, onError: onError ?? defaultOnError })
  editor.setEditorState(editor.parseEditorState(state))

  // register transforms that clean up state for rendering
  registerRemoveAtLinkNodesTransform(editor)

  let html = ''
  editor.update(() => {
    html = $convertToHtmlString(editor, { ...renderOptions, dom })
  })

  return html
}

export interface HtmlToLexicalStateOptions {
  /** Advanced: replaces the default node set and html import config wholesale — nothing is merged. */
  editorConfig?: CreateEditorArgs
  /** DOM injection port; providing it skips global sniffing and the lazy jsdom load. */
  dom?: ExportDOMDom
  /** Import-time alignment handling, forwarded to the default transforms: 'strip' (default) resets `format`, 'keep' preserves imported text-align. */
  alignment?: DefaultTransformsOptions['alignment']
}

/**
 * Convert an HTML string to a serialized Lexical editor state — the import
 * half of the pair. Both directions are async so the lazy jsdom load stays
 * the single DOM story; an empty string imports as `MINIMAL_DOCUMENT`.
 */
export async function htmlToLexicalState(
  html: string,
  options?: HtmlToLexicalStateOptions,
): Promise<SerializedEditorState> {
  const dom = await resolveHeadlessDom(options?.dom)

  return htmlToLexical(html, { dom, editorConfig: options?.editorConfig, alignment: options?.alignment })
}

export interface LexicalStateToPlainTextOptions {
  /** Same semantics as the renderer: additive on top of DEFAULT_HTML_NODES. */
  nodes?: LexicalNodeConfig[]
  onError?: (error: Error) => void
}

/**
 * Extract the plain text of a serialized state — the search-corpus leg of the
 * surface. Parsing and `getTextContent` need no DOM, so this one stays
 * synchronous; in-progress at-link search nodes are removed like on the
 * headless render path, and a trailing empty paragraph yields no blank line.
 */
export function lexicalStateToPlainText(
  state: SerializedEditorState | string,
  options?: LexicalStateToPlainTextOptions,
): string {
  const editor = createHeadlessHtmlEditor({ merge: 'additive', nodes: options?.nodes, onError: options?.onError })

  editor.setEditorState(editor.parseEditorState(state))

  // the same pre-render cleanup the headless HTML path runs
  registerRemoveAtLinkNodesTransform(editor)

  let text = ''
  editor.update(() => {
    text = $getRoot().getTextContent()
  })

  return text.trimEnd()
}
