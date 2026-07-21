import type { HtmlNode } from '@/nodes/HtmlNode'

import IndicatorIcon from '@/assets/icons/inkling-indicator-html.svg?react'
import { HtmlNodeComponent } from '@/nodes/HtmlNodeComponent'

// Html is the only card with an indicator icon; the declaration's
// `decorateTarget.hasIndicatorIcon` flag gates its attachment.
export { IndicatorIcon }

/**
 * Html's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: HtmlNode) {
  return <HtmlNodeComponent html={node.html} nodeKey={node.getKey()} />
}
