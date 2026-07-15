import type { ExportDOMOptions } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

import { escapeHtml } from '@/nodes/base/utils/escape-html'
import { renderEmptyContainer } from '@/nodes/base/utils/render-empty-container'
import { renderEmailButton } from '@/nodes/base/utils/render-helpers/email-button'
import { html } from '@/nodes/base/utils/tagged-template-fns'

interface ButtonNodeData {
  buttonUrl: string
  buttonText: string
  alignment: string
}

export function renderButtonNode(node: ButtonNodeData, options: ExportDOMOptions = {}, context: RenderContext) {
  const document = context.createDocument()

  if (!node.buttonUrl || node.buttonUrl.trim() === '' || context.safeUrl('navigation', node.buttonUrl) === '') {
    return renderEmptyContainer(document)
  }

  if (context.variant({ web: false, email: true })) {
    return emailTemplate(node, document, context)
  } else {
    return frontendTemplate(node, document, context)
  }
}

function frontendTemplate(node: ButtonNodeData, document: Document, context: RenderContext) {
  const cardClasses = getCardClasses(node)
  const safeButtonUrl = context.safeUrl('navigation', node.buttonUrl)

  const cardDiv = document.createElement('div')
  cardDiv.setAttribute('class', cardClasses)

  const button = document.createElement('a')
  button.setAttribute('href', safeButtonUrl)
  button.setAttribute('class', 'inkling-btn inkling-btn-accent')
  button.textContent = node.buttonText || 'Button Title'

  cardDiv.appendChild(button)
  return { element: cardDiv, type: 'outer' as const }
}

function emailTemplate(node: ButtonNodeData, document: Document, context: RenderContext) {
  const safeButtonUrl = context.safeUrl('navigation', node.buttonUrl)
  const buttonText = node.buttonText || 'Button Title'

  if (context.usesModernEmailButton()) {
    const buttonHtml = renderEmailButton(
      {
        alignment: node.alignment,
        color: 'accent',
        style: context.design?.buttonStyle,
        text: buttonText,
        url: safeButtonUrl,
      },
      context,
    )

    const cardHtml = html`
      <table border="0" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td>${buttonHtml}</td>
          </tr>
        </tbody>
      </table>
    `

    if (context.feature?.emailCustomizationAlpha) {
      const element = document.createElement('div')
      element.innerHTML = cardHtml
      return { element, type: 'inner' as const }
    }

    const element = document.createElement('p')
    element.innerHTML = cardHtml
    return { element, type: 'outer' as const }
  }

  // Legacy branch preserved byte-for-byte when no customization/design option
  // is supplied.
  const escapedButtonText = escapeHtml(buttonText)
  const cardHtml = html`
    <div class="btn btn-accent">
      <table border="0" cellspacing="0" cellpadding="0" align="${node.alignment}">
        <tr>
          <td align="center">
            <a href="${escapeHtml(safeButtonUrl)}">${escapedButtonText}</a>
          </td>
        </tr>
      </table>
    </div>
  `

  const element = document.createElement('p')
  element.innerHTML = cardHtml
  return { element, type: 'outer' as const }
}

function getCardClasses(node: ButtonNodeData) {
  const cardClasses = ['inkling-card inkling-button-card']

  if (node.alignment) {
    cardClasses.push(`inkling-align-${node.alignment}`)
  }

  return cardClasses.join(' ')
}
