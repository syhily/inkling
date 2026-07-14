import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
import { escapeHtml } from '@/nodes/base/utils/escape-html'
import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { renderEmptyContainer } from '@/nodes/base/utils/render-empty-container'
import { renderEmailButton } from '@/nodes/base/utils/render-helpers/email-button'
import { html } from '@/nodes/base/utils/tagged-template-fns'

interface ButtonNodeData {
  buttonUrl: string
  buttonText: string
  alignment: string
}

export function renderButtonNode(node: ButtonNodeData, options: ExportDOMOptions = {}) {
  addCreateDocumentOption(options)
  const document = options.createDocument!()

  if (!node.buttonUrl || node.buttonUrl.trim() === '' || !isSafeUrl(node.buttonUrl)) {
    return renderEmptyContainer(document)
  }

  if (options.target === 'email') {
    return emailTemplate(node, options, document)
  } else {
    return frontendTemplate(node, document)
  }
}

function frontendTemplate(node: ButtonNodeData, document: Document) {
  const cardClasses = getCardClasses(node)
  const safeButtonUrl = isSafeUrl(node.buttonUrl) ? node.buttonUrl : ''

  const cardDiv = document.createElement('div')
  cardDiv.setAttribute('class', cardClasses)

  const button = document.createElement('a')
  button.setAttribute('href', safeButtonUrl)
  button.setAttribute('class', 'inkling-btn inkling-btn-accent')
  button.textContent = node.buttonText || 'Button Title'

  cardDiv.appendChild(button)
  return { element: cardDiv, type: 'outer' as const }
}

function emailTemplate(node: ButtonNodeData, options: ExportDOMOptions, document: Document) {
  const safeButtonUrl = isSafeUrl(node.buttonUrl) ? node.buttonUrl : ''
  const buttonText = node.buttonText || 'Button Title'

  if (usesModernEmailButton(options)) {
    const buttonHtml = renderEmailButton({
      alignment: node.alignment,
      color: 'accent',
      style: options.design?.buttonStyle,
      text: buttonText,
      url: safeButtonUrl,
    })

    const cardHtml = html`
      <table border="0" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td>${buttonHtml}</td>
          </tr>
        </tbody>
      </table>
    `

    if (options.feature?.emailCustomizationAlpha) {
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

function usesModernEmailButton(options: ExportDOMOptions): boolean {
  return Boolean(
    options.feature?.emailCustomization || options.feature?.emailCustomizationAlpha || options.design?.buttonStyle,
  )
}

function getCardClasses(node: ButtonNodeData) {
  const cardClasses = ['inkling-card inkling-button-card']

  if (node.alignment) {
    cardClasses.push(`inkling-align-${node.alignment}`)
  }

  return cardClasses.join(' ')
}
