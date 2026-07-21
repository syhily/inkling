import type { ButtonNode } from '@/nodes/ButtonNode'

import { ButtonNodeComponent } from '@/nodes/ButtonNodeComponent'

/**
 * Button's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: ButtonNode) {
  return (
    <ButtonNodeComponent
      alignment={node.alignment}
      buttonText={node.buttonText}
      buttonUrl={node.buttonUrl}
      nodeKey={node.getKey()}
    />
  )
}
