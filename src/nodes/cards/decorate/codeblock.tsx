import type { CodeBlockNode } from '@/nodes/CodeBlockNode'

import { CodeBlockNodeComponent } from '@/nodes/CodeBlockNodeComponent'

/**
 * CodeBlock's decorate render — the React-bearing half of its
 * decorate-target, paired with the declaration by
 * `@/nodes/cards/card-decorate`.
 */
export function render(node: CodeBlockNode) {
  return (
    <CodeBlockNodeComponent
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      code={node.code}
      language={node.language}
      nodeKey={node.getKey()}
    />
  )
}
