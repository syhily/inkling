import type { ToggleNode } from '@/nodes/ToggleNode'

import { ToggleNodeComponent } from '@/nodes/ToggleNodeComponent'

/**
 * Toggle's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: ToggleNode) {
  // Same headless-round-trip invariant as callout's nested editor: null only
  // inside the headless markdown round-trip editor, which never reconciles
  // decorators — guard so the field type stays honest.
  if (!node.__titleEditor || !node.__contentEditor) {
    return null
  }

  return (
    <ToggleNodeComponent
      contentEditor={node.__contentEditor}
      contentEditorInitialState={node.__contentEditorInitialState}
      headingEditor={node.__titleEditor}
      headingEditorInitialState={node.__titleEditorInitialState}
      nodeKey={node.getKey()}
    />
  )
}
