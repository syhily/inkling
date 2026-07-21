import type { ExportDOMOutput } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

// The markdown card's HTML export speaks the paste dialect
// (`@/markdown/paste-dialect`) — see `@/markdown/dialects`.
import { pasteDialect } from '@/markdown/paste-dialect'
import { sanitizeHtml } from '@/utils/sanitize-html'

interface MarkdownNodeData {
  markdown: string
}

export function renderMarkdownNode(node: MarkdownNodeData, context: RenderContext): ExportDOMOutput<'inner'> {
  const document = context.createDocument()

  // pasteDialect.render reads exactly one key off the options bag —
  // `inklingVersion` (its slug-policy input) — so the pass is narrowed to
  // that key, byte-identical to forwarding the whole bag.
  const html = sanitizeHtml(pasteDialect.render(node.markdown || '', { inklingVersion: context.inklingVersion }))

  const element = document.createElement('div')
  element.innerHTML = html

  // `type: 'inner'` will render only the innerHTML of the element
  // @see the editor's HTML renderer
  return { element, type: 'inner' as const }
}
