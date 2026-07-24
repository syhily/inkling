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
    // Heading ids are generated on both export paths: the live
    // HtmlOutputPlugin runs this same transformer stack (via
    // $convertToHtmlString), and the per-render dedup tracking lives in the
    // render context, which every render pass builds fresh.
    const id = generateId(node.getTextContent(), context)

    return `<${tag} id="${id}">${exportChildren(node)}</${tag}>`
  },
}
