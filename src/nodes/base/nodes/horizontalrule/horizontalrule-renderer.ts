import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'

export function renderHorizontalRuleNode(_: unknown, options: ExportDOMOptions = {}) {
  addCreateDocumentOption(options)
  const document = options.createDocument!()

  const element = document.createElement('hr')
  return { element, type: 'outer' as const }
}
