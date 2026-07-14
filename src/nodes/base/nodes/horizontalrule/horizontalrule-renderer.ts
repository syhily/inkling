import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
import { html } from '@/nodes/base/utils/tagged-template-fns'

function horizontalRuleEmailTemplate() {
  // Outlook doesn't support HR tags so we need to use a table with colored borders
  // Outer table sets spacing using padding for Outlook compatibility, inner table houses the colored border.

  // HR is kept for html-to-plaintext conversion but not shown. Must be inside the table so we can use
  // sibling selectors to adjust spacing between headings and hr cards.
  return html`
    <table
      class="inkling-card inkling-hr-card"
      role="presentation"
      width="100%"
      border="0"
      cellpadding="0"
      cellspacing="0"
    >
      <tbody>
        <tr>
          <td>
            <!--[if !mso]><!-- -->
            <hr style="display: none;" />
            <!--<![endif]-->
            <table class="inkling-hr" role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  `
}

export function renderHorizontalRuleNode(_: unknown, options: ExportDOMOptions = {}) {
  addCreateDocumentOption(options)
  const document = options.createDocument!()

  if (options.target === 'email') {
    const element = document.createElement('div')
    element.innerHTML = horizontalRuleEmailTemplate()
    return { element, type: 'inner' as const }
  }

  const element = document.createElement('hr')
  return { element, type: 'outer' as const }
}
