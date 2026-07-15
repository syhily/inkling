import type { ExportDOMOptions, ExportDOMOutput } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

import { render } from '@/markdown/markdown-html-renderer'
import { sanitizeHtml } from '@/utils/sanitize-html'

interface MarkdownNodeData {
  markdown: string
}

interface MarkdownRenderOptions extends ExportDOMOptions {}

export function renderMarkdownNode(
  node: MarkdownNodeData,
  options: MarkdownRenderOptions = {},
  context: RenderContext,
): ExportDOMOutput<'inner'> {
  // A truthy non-function `createDocument` reaches the context verbatim from
  // the options bag; the TypeError for that caller bug is pinned
  // (test/nodes-base/nodes/markdown.test.ts).
  if (options.createDocument && typeof options.createDocument !== 'function') {
    throw new TypeError('renderMarkdownNode requires options.createDocument to be a function')
  }

  const document = context.createDocument()

  const html = sanitizeHtml(render(node.markdown || '', options as Record<string, unknown>))

  const element = document.createElement('div')
  element.innerHTML = html

  // `type: 'inner'` will render only the innerHTML of the element
  // @see the editor's HTML renderer
  return { element, type: 'inner' as const }
}
