import type { ExportDOMOptions } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
import { getFirstHtmlElement } from '@/nodes/base/utils/get-first-html-element'
import { html } from '@/nodes/base/utils/tagged-template-fns'

interface ToggleNodeData {
  heading: string
  content: string
}

// heading is plain text and gets escaped; content is nested-editor HTML and
// gets DOMPurify-sanitized (not escaped) — both via the render context.
function sanitize(node: ToggleNodeData, context: RenderContext) {
  return {
    safeHeading: context.escapeText(node.heading),
    safeContent: context.sanitizeCaption(node.content),
  }
}

function cardTemplate({ node, context }: { node: ToggleNodeData; context: RenderContext }) {
  const { safeHeading, safeContent } = sanitize(node, context)

  return `
        <div class="inkling-card inkling-toggle-card" data-inkling-toggle-state="close">
            <div class="inkling-toggle-heading">
                <h4 class="inkling-toggle-heading-text">${safeHeading}</h4>
                <button class="inkling-toggle-card-icon" aria-label="Expand toggle to read content">
                    <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                    </svg>
                </button>
            </div>
            <div class="inkling-toggle-content">${safeContent}</div>
        </div>
        `
}

function emailCardTemplate({ node, context }: { node: ToggleNodeData; context: RenderContext }) {
  const { safeHeading, safeContent } = sanitize(node, context)

  if (context.feature?.emailCustomization || context.feature?.emailCustomizationAlpha) {
    return html`
      <table cellspacing="0" cellpadding="0" border="0" width="100%" class="inkling-toggle-card">
        <tbody>
          <tr>
            <td class="inkling-toggle-heading">
              <h4>${safeHeading}</h4>
            </td>
          </tr>
          <tr>
            <td class="inkling-toggle-content">${safeContent}</td>
          </tr>
        </tbody>
      </table>
    `
  }

  return `
        <div style="background: transparent;
        border: 1px solid rgba(124, 139, 154, 0.25); border-radius: 4px; padding: 20px; margin-bottom: 1.5em;">
            <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">${safeHeading}</h4>
            <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;">${safeContent}</div>
        </div>
        `
}

export function renderToggleNode(node: ToggleNodeData, options: ExportDOMOptions = {}, context: RenderContext) {
  addCreateDocumentOption(options)

  const document = options.createDocument!()

  const htmlString = context.variant({ web: false, email: true })
    ? emailCardTemplate({ node, context })
    : cardTemplate({ node, context })

  const container = document.createElement('div')
  container.innerHTML = htmlString.trim()

  const element = getFirstHtmlElement(container, 'renderToggleNode')
  return { element, type: 'outer' as const }
}
