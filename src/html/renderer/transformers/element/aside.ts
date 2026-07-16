import type { ElementNode } from 'lexical'

import type { ExportChildren } from '@/html/renderer/transformers/index'
import type { RenderContext } from '@/nodes/base/render-context'

import { $isAsideNode } from '@/nodes/base'

export default {
  export(node: ElementNode, exportChildren: ExportChildren, context: RenderContext) {
    if (!$isAsideNode(node)) {
      return null
    }

    const children = exportChildren(node)

    return context.variant({
      web: `<blockquote class="inkling-blockquote-alt">${children}</blockquote>`,
      email: `<blockquote class="inkling-blockquote-alt">${children.startsWith('<p>') ? children : `<p>${children}</p>`}</blockquote>`,
    })
  },
}
