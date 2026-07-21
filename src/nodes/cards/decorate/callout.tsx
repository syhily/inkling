import type { CalloutNode } from '@/nodes/CalloutNode'

import { CalloutNodeComponent } from '@/nodes/CalloutNodeComponent'

/**
 * Callout's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: CalloutNode) {
  // Null only inside the headless markdown round-trip editor (the card
  // transformers null the nested editors after plain-text import), which
  // never reconciles decorators — guard so the field type stays honest.
  if (!node.__calloutTextEditor) {
    return null
  }

  return (
    <CalloutNodeComponent
      backgroundColor={node.backgroundColor}
      calloutEmoji={node.calloutEmoji}
      calloutTextEditor={node.__calloutTextEditor}
      calloutTextEditorInitialState={node.__calloutTextEditorInitialState}
      nodeKey={node.getKey()}
    />
  )
}
