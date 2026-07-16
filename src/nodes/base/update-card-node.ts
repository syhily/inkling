import { $getNodeByKey, type LexicalNode, type NodeKey } from 'lexical'

/**
 * The one write seam for card-node fields (CONTEXT.md: "card"). Replaces
 * the `$getNodeByKey` + `GeneratedDecoratorNodeBase`-cast idiom, which
 * erased the typed datasets: the guard does the narrowing, so every field
 * the mutator writes is checked against the card's own node type. Call
 * inside `editor.update()`. Known limitation: generated node classes inherit
 * `[key: string]: unknown`, so unknown field names still compile — the
 * seam's guarantee is value typing on known fields plus an explicit guard.
 */
export function $updateCardNode<T extends LexicalNode>(
  nodeKey: NodeKey,
  guard: (node: unknown) => node is T,
  update: (node: T) => void,
): void {
  const node = $getNodeByKey(nodeKey)
  if (guard(node)) {
    update(node)
  }
}
