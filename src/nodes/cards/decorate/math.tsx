import type { MathNode } from '@/nodes/MathNode'

import { MathNodeComponent } from '@/nodes/MathNodeComponent'

/**
 * Math's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: MathNode) {
  return <MathNodeComponent mathml={node.mathml} nodeKey={node.getKey()} svg={node.svg} tex={node.tex} />
}
