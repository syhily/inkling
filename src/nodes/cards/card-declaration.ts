import type { Klass, LexicalNode } from 'lexical'

import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

/**
 * The editor surfaces a card can join (CONTEXT.md: "card declaration" names
 * "which editor surfaces it joins (node sets, markdown, email)"):
 * - `default`: the web editor node set (`@/nodes/DefaultNodes`) and the base
 *   `DEFAULT_NODES` in `@/nodes/base`.
 * - `emailEditor`: the email composer node set (`@/nodes/EmailEditorNodes`).
 * - `emailRenderer`: the email render node set (`@/nodes/EmailNodes`).
 * - `markdown`: the markdown round-trip node set (`MARKDOWN_NODES` in
 *   `@/markdown/round-trip`). CodeBlock and HorizontalRule are
 *   markdown-eligible with no card transformer (their markdown forms are
 *   handled by `DEFAULT_TRANSFORMERS`); the transformers themselves attach
 *   one layer up (`@/nodes/cards/card-markdown-transformers`) because they
 *   must construct the wrapper node classes the round-trip editor registers.
 */
export interface CardSurfaces {
  default: boolean
  emailEditor: boolean
  emailRenderer: boolean
  markdown: boolean
}

/**
 * The single per-card source of truth (CONTEXT.md: "card declaration").
 * React-free: `baseNode` is imported from its deep `@/nodes/base/nodes/...`
 * path so `@/nodes/base` can derive its node set from the declarations
 * without pulling in the wrapper/component layer. The wrapper node class is
 * attached one layer up (`@/nodes/cards/card-wrappers`) — the declarations
 * must never import wrappers, or the base barrel would close an import
 * cycle through the wrapper files.
 *
 * Declarations use `satisfies CardDeclaration<'<nodeType>'>` so the literal
 * node type survives on the declaration's type.
 */
export interface CardDeclaration<NodeType extends string = string> {
  nodeType: NodeType
  baseNode: Klass<LexicalNode>
  /**
   * The card's nested editors (CONTEXT.md: "card spec"), for cards that keep
   * rich-text content in nested Lexical editors. The wrapper node class
   * adopts this as its static `nestedEditors`; the generated node machinery
   * (`@/nodes/base/generate-decorator-node`) drives constructor setup,
   * `getDataset` appends, and `exportJSON` re-serialization from it.
   */
  nestedEditors?: readonly NestedEditorSpec[]
  surfaces: CardSurfaces
}
