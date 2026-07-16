import type { ElementNode } from 'lexical'

/* c8 ignore start */
import { $isParagraphNode } from 'lexical'

import type { ExportChildren } from '@/html/renderer/transformers/index'
/* c8 ignore stop */

export default {
  export(node: ElementNode, exportChildren: ExportChildren) {
    if (!$isParagraphNode(node)) {
      return null
    }

    return `<p>${exportChildren(node)}</p>`
  },
}
