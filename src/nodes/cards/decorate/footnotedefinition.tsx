import type { FootnoteDefinitionNode } from '@/nodes/FootnoteDefinitionNode'

import { FootnoteDefinitionNodeComponent } from '@/nodes/FootnoteDefinitionNodeComponent'

/**
 * The footnote definition's decorate render — the React-bearing half of its
 * decorate-target, paired with the declaration by
 * `@/nodes/cards/card-decorate`.
 */
export function render(node: FootnoteDefinitionNode) {
  // Same headless-round-trip invariant as toggle's nested editors: null only
  // inside an editor that never reconciles decorators — guard so the field
  // type stays honest.
  if (!node.__contentEditor) {
    return null
  }

  return (
    <FootnoteDefinitionNodeComponent
      contentEditor={node.__contentEditor}
      contentEditorInitialState={node.__contentEditorInitialState}
      nodeKey={node.getKey()}
      targetKey={node.targetKey}
    />
  )
}
