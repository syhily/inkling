import type { ElementNode } from 'lexical'

/* c8 ignore start */
import { $isQuoteNode } from '@lexical/rich-text'

import type { ExportChildren } from '@/html/renderer/transformers/index'
import type { RenderContext } from '@/nodes/base/render-context'
/* c8 ignore stop */

export default {
  export(node: ElementNode, exportChildren: ExportChildren, context: RenderContext) {
    if (!$isQuoteNode(node)) {
      return null
    }

    const children = exportChildren(node)

    return context.variant({
      web: `<blockquote>${children}</blockquote>`,
      email: `<blockquote>${children.startsWith('<p>') ? children : `<p>${children}</p>`}</blockquote>`,
    })
  },
}
