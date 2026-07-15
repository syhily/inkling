import type { LexicalNode } from 'lexical'
import type { ReactNode } from 'react'

import InklingCardWrapper from '@/components/InklingCardWrapper'
import { getCardDecorateTarget } from '@/nodes/cards/card-decorate'

/**
 * The one shared decorate() adapter (plan 039): every card's `decorate()`
 * delegates here. It reads the card's decorate-target — the React-free
 * wrapper props from the declaration's `decorateTarget`, plus the component
 * render and indicator icon from the wrapper-layer projection
 * (`@/nodes/cards/card-decorate`) — and renders via `InklingCardWrapper`,
 * which accepts exactly `width`, `wrapperStyle`, `IndicatorIcon`, and
 * `className`. Undefined props are dropped by React, so cards that declare
 * no wrapper props render exactly what their hand-written decorate() did.
 */
export function decorateCard(node: LexicalNode): ReactNode {
  const target = getCardDecorateTarget(node.getType())
  if (!target) {
    throw new Error(`[decorateCard] No decorate-target declared for card node type "${node.getType()}"`)
  }

  const { width, wrapperStyle, className } = target.decorateTarget ?? {}
  const resolvedWidth = typeof width === 'function' ? width(node) : width

  return (
    <InklingCardWrapper
      IndicatorIcon={target.IndicatorIcon}
      className={className}
      nodeKey={node.getKey()}
      width={resolvedWidth}
      wrapperStyle={wrapperStyle}
    >
      {target.render(node)}
    </InklingCardWrapper>
  )
}
