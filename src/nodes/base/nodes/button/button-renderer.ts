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

  const cardDiv = document.createElement('div')
  cardDiv.setAttribute('class', cardClasses)

  const button = document.createElement('a')
  button.setAttribute('href', node.buttonUrl)
  button.setAttribute('class', 'inkling-btn inkling-btn-accent')
  button.textContent = node.buttonText || 'Button Title'

  cardDiv.appendChild(button)
  return { element: cardDiv, type: 'outer' as const }
}

function emailTemplate(node: ButtonNodeData, options: ExportDOMOptions, document: Document) {
  const { buttonUrl, buttonText } = node
  const escapedButtonText = escapeHtml(buttonText || 'Button Title')

  let cardHtml
  if (options.feature?.emailCustomization) {
    cardHtml = html` <table border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0" align="${node.alignment}">
            <tr>
              <td align="center">
                <a href="${buttonUrl}">${escapedButtonText}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`

    const element = document.createElement('p')
    element.innerHTML = cardHtml
    return { element, type: 'outer' as const }
  } else if (options.feature?.emailCustomizationAlpha) {
    const buttonHtml = renderEmailButton({
      alignment: node.alignment,
      color: 'accent',
      url: buttonUrl,
      text: escapedButtonText,
    })

    cardHtml = html`
      <table border="0" cellpadding="0" cellspacing="0">
        <tbody>
          <tr>
            <td>${buttonHtml}</td>
          </tr>
        </tbody>
      </table>
    `

    const element = document.createElement('div')
    element.innerHTML = cardHtml
    return { element, type: 'inner' as const }
  } else {
    cardHtml = html`
      <div class="btn btn-accent">
        <table border="0" cellspacing="0" cellpadding="0" align="${node.alignment}">
          <tr>
            <td align="center">
              <a href="${buttonUrl}">${escapedButtonText}</a>
            </td>
          </tr>
        </table>
      </div>
    `

    const element = document.createElement('p')
    element.innerHTML = cardHtml
    return { element, type: 'outer' as const }
  }
}

function getCardClasses(node: ButtonNodeData) {
  const cardClasses = ['inkling-card inkling-button-card']

  if (node.alignment) {
    cardClasses.push(`inkling-align-${node.alignment}`)
  }

  return cardClasses.join(' ')
}
