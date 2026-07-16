import type { ExportDOMOutput } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'
import type { Visibility } from '@/nodes/base/utils/visibility'

import { renderEmptyContainer } from '@/nodes/base/utils/render-empty-container'
import { wrapReplacementStrings } from '@/nodes/base/utils/replacement-strings'
import { renderWithVisibility } from '@/nodes/base/utils/visibility'

interface HtmlNodeData {
  html: string
  // HtmlNode is generated with hasVisibility: true, so the constructor
  // guarantees a Visibility shape here (never absent)
  visibility: Visibility
}

export type HtmlExportDOMOutput = ExportDOMOutput<'inner' | 'value' | 'outer'>

export function renderHtmlNode(node: HtmlNodeData, context: RenderContext): HtmlExportDOMOutput {
  const document = context.createDocument()

  const html = node.html

  if (!html) {
    return renderEmptyContainer(document)
  }

  // Wrap replacement strings like {uniqueid} with %% for email processing
  // Only wrap if emailUniqueid feature flag is enabled
  let processedHtml = html
  if (context.feature?.emailUniqueid) {
    processedHtml = wrapReplacementStrings(html)
  }

  const wrappedHtml = `\n<!--inkling-card-begin: html-->\n${processedHtml}\n<!--inkling-card-end: html-->\n`

  const textarea = document.createElement('textarea')
  textarea.value = wrappedHtml

  if (node.visibility) {
    const renderOutput: ExportDOMOutput<'value'> = { element: textarea, type: 'value' }
    // renderWithVisibility takes Partial<Pick<RenderContext, 'target'>> — the
    // frozen context is passed straight through; its generic return union is
    // exactly HtmlExportDOMOutput ('inner' | 'value' | 'outer')
    return renderWithVisibility(renderOutput, node.visibility, context)
  }

  // `type: 'value'` will render the value of the textarea element
  return { element: textarea, type: 'value' as const }
}
