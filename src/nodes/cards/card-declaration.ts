import type { Klass, LexicalNode } from 'lexical'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'
import type { CardWidth } from '@/nodes/base/utils/card-widths'

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
 * The card's decorate-target wrapper props (CONTEXT.md: "card spec") — the
 * React-free half of what a card's `decorate()` passes to
 * `InklingCardWrapper`. The component render and the `IndicatorIcon`
 * component attach one layer up (`@/nodes/cards/card-decorate`) because they
 * are React-bearing; the shared adapter (`@/nodes/decorate-card`) merges both
 * halves. Cards with no wrapper props (Audio, Bookmark, Callout, File,
 * HorizontalRule) omit this entry.
 *
 * `width` is either a constant or a node→width mapper for cards whose width
 * is runtime node state (Image/Video read `cardWidth`; Header maps its
 * `layout`). Per-card width defaults live here — the split of this knowledge
 * across thirteen decorate bodies is what caused the `b60bd7c` regression.
 * `hasIndicatorIcon` is the React-free record that the card renders an
 * indicator icon; the projection only attaches the icon component when this
 * flag is set (Html is the only card that does).
 */
export interface DecorateTargetSpec {
  width?: CardWidth | ((node: LexicalNode) => CardWidth | undefined)
  wrapperStyle?: string
  hasIndicatorIcon?: boolean
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
  /**
   * The card's transient props (CONTEXT.md: "card spec") — client-side-only
   * fields (upload flow state, edit-mode flags) read from the construction
   * dataset, initialized by the generated node machinery, and never
   * serialized. The wrapper node class adopts this as its static
   * `transientProps`; see `TransientPropSpec` in
   * `@/nodes/base/generate-decorator-node`.
   */
  transientProps?: readonly TransientPropSpec[]
  /**
   * The card's decorate-target wrapper props; see `DecorateTargetSpec`.
   */
  decorateTarget?: DecorateTargetSpec
  surfaces: CardSurfaces
}
