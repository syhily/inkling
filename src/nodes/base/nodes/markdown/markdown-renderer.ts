import type { ExportDOMOutput } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

// The markdown card's HTML export shares the paste dialect's markdown-it
// engine (`@/markdown/markdown-html-renderer`) — see `@/markdown/dialects`.
import { render } from '@/markdown/markdown-html-renderer'
import { sanitizeHtml } from '@/utils/sanitize-html'

interface MarkdownNodeData {
  markdown: string
}

export function renderMarkdownNode(node: MarkdownNodeData, context: RenderContext): ExportDOMOutput<'inner'> {
  const document = context.createDocument()

  // markdown-html-renderer reads exactly one key off the options bag —
  // `inklingVersion` (its slug-policy input) — so the pass is narrowed to
  // that key, byte-identical to forwarding the whole bag.
  const html = sanitizeHtml(render(node.markdown || '', { inklingVersion: context.inklingVersion }))

  const element = document.createElement('div')
  element.innerHTML = html

  // `type: 'inner'` will render only the innerHTML of the element
  // @see the editor's HTML renderer
  return { element, type: 'inner' as const }
}
