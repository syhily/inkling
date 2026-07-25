import type { ElementNode } from 'lexical'

import type { ExportChildren } from '@/html/renderer/transformers/index'

import { $isAsideNode } from '@/nodes/base'

export default {
  export(node: ElementNode, exportChildren: ExportChildren) {
    if (!$isAsideNode(node)) {
      return null
    }

    const children = exportChildren(node)

    return `<blockquote class="inkling-blockquote-alt">${children}</blockquote>`
  },
}
