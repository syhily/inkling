import type { KlassConstructor, LexicalNode } from 'lexical'
import type { ReactNode } from 'react'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'
import type { CardDeclaration } from '@/nodes/cards/card-declaration'
import type { MenuItem } from '@/utils/buildCardMenu'

import { ensureLexicalNodeOwnMethods } from '@/nodes/base/ensure-node-own-methods'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

/**
 * The class type `assembleCardNode` returns: the declaration's base node
 * class with the spec statics adopted (`nestedEditors`/`transientProps`/
 * `cardMenu`) and `decorate()` added. TypeScript can't see statics inherited
 * through a class-expression base, so the Lexical static side is spelled out
 * via `KlassConstructor` — at runtime every member here is genuinely present
 * on the assembled class.
 */
export type CardNodeClass<TNode extends LexicalNode> = KlassConstructor<typeof LexicalNode> & {
  // oxlint-disable-next-line typescript/no-explicit-any
  new (...args: any[]): TNode & { decorate(): ReactNode }
  prototype: TNode & { decorate(): ReactNode }
  readonly nestedEditors: readonly NestedEditorSpec[] | undefined
  readonly transientProps: readonly TransientPropSpec[] | undefined
  readonly cardMenu: MenuItem[]
}

/**
 * The one wrapper-layer assembly helper (plan 039, Batch 5): builds the
 * registered node class for a spec-able card from its declaration. The
 * assembled class subclasses the declaration's React-free base node and
 * adopts the spec statics — `nestedEditors` and `transientProps` (read off
 * `this.constructor` by the generated node machinery) and `cardMenu`. Its
 * only method is `decorate()`, delegating to the shared adapter
 * (`@/nodes/decorate-card`).
 *
 * Behaviour the spec language can't express is NOT assembled here: upload
 * accessors and gallery image helpers live on the base node classes, and the
 * surviving hand-written wrappers (Bookmark, Header, Toggle) keep theirs.
 *
 * The base class's `getType`/`clone`/`importJSON`/`exportJSON` are inherited,
 * not own properties, so the assembled class runs through
 * `ensureLexicalNodeOwnMethods` at assembly time — the registry-level loops
 * only need to cover the surviving hand-written wrappers.
 */
export function assembleCardNode<TNode extends LexicalNode>(
  // oxlint-disable-next-line typescript/no-explicit-any
  declaration: CardDeclaration & { baseNode: new (...args: any[]) => TNode },
): CardNodeClass<TNode> {
  // oxlint-disable-next-line typescript/no-explicit-any
  const baseNode = declaration.baseNode as new (...args: any[]) => LexicalNode

  class AssembledCardNode extends baseNode {
    static nestedEditors = declaration.nestedEditors
    static transientProps = declaration.transientProps
    // undefined for CodeBlock, the one card with no menu entry
    static cardMenu = (CARD_MENUS as Record<string, MenuItem[]>)[declaration.nodeType]

    decorate(): ReactNode {
      return decorateCard(this)
    }
  }

  ensureLexicalNodeOwnMethods(AssembledCardNode)

  return AssembledCardNode as unknown as CardNodeClass<TNode>
}
