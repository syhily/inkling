import type { ElementNode } from 'lexical'

/* c8 ignore start */
import { $isHeadingNode } from '@lexical/rich-text'

import type { ExportChildren } from '@/html/renderer/transformers/index'
import type { RenderContext } from '@/nodes/base/render-context'

import generateId from '@/html/renderer/utils/generate-id'
/* c8 ignore stop */

export default {
  export(node: ElementNode, exportChildren: ExportChildren, context: RenderContext) {
    if (!$isHeadingNode(node)) {
      return null
    }

    const tag = node.getTag()
    const id = generateId(node.getTextContent(), context)

    return `<${tag} id="${id}">${exportChildren(node)}</${tag}>`
  },
}
