import type { ElementNode } from 'lexical'

/* c8 ignore start */
import { $isQuoteNode } from '@lexical/rich-text'

import type { ExportChildren } from '@/html/renderer/transformers/index'
/* c8 ignore stop */

export default {
  export(node: ElementNode, exportChildren: ExportChildren) {
    if (!$isQuoteNode(node)) {
      return null
    }

    const children = exportChildren(node)

    return `<blockquote>${children}</blockquote>`
  },
}
