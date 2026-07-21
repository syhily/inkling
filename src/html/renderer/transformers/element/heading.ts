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
    // Only the headless renderer adds heading ids: the per-render dedup
    // tracking lives in the render context, which the live HtmlOutputPlugin
    // path ($generateHtmlFromNodes) does not have, so headings exported from
    // a mounted editor carry no id. This divergence is intentional and pinned
    // by test/unit/plugins/HtmlOutputPlugin.export-parity.test.ts.
    const id = generateId(node.getTextContent(), context)

    return `<${tag} id="${id}">${exportChildren(node)}</${tag}>`
  },
}
