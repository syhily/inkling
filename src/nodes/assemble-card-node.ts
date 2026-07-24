import type { LexicalNode } from 'lexical'
import type { ReactNode } from 'react'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'
import type { CardDeclaration } from '@/nodes/cards/card-declaration'
import type { MenuItem } from '@/utils/buildCardMenu'

import { ensureLexicalNodeOwnMethods } from '@/nodes/base/ensure-node-own-methods'
import { getCardMenu } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

/**
 * The class type `assembleCardNode` returns: the declaration's base node
 * class with the spec statics adopted (`nestedEditors`/`transientProps`/
 * `cardMenu`) and `decorate()` added. TypeScript can't see statics inherited
 * through a class-expression base, so the Lexical static side is spelled out
 * via the mapped type — at runtime every member here is genuinely present on
 * the assembled class. The static side deliberately carries no extra
 * construct signature (a `KlassConstructor` intersection): `InstanceType`
 * over one folds `LexicalNode`'s construct return into the instance type
 * first, degrading the base node's method types (e.g. `exportJSON()`
 * collapsing to `SerializedLexicalNode`).
 */
export type CardNodeClass<TNode extends LexicalNode> = {
  [k in keyof typeof LexicalNode]: (typeof LexicalNode)[k]
} & {
  // oxlint-disable-next-line typescript/no-explicit-any
  new (...args: any[]): TNode & { decorate(): ReactNode }
  prototype: TNode & { decorate(): ReactNode }
  readonly nestedEditors: readonly NestedEditorSpec[] | undefined
  readonly transientProps: readonly TransientPropSpec[] | undefined
  readonly cardMenu: MenuItem[] | undefined
}

/**
 * The one wrapper-layer assembly helper (plan 039, Batch 5): builds the
 * registered node class for a card from its declaration. The assembled class
 * subclasses the declaration's React-free base node and adopts the spec
 * statics — `nestedEditors` and `transientProps` (read off `this.constructor`
 * by the generated node machinery) and `cardMenu`. Its only method is
 * `decorate()`, delegating to the shared adapter (`@/nodes/decorate-card`).
 *
 * Behaviour the spec language can't express is NOT assembled here: upload
 * accessors, gallery image helpers, and the isEmpty()/getCardWidth()
 * overrides live on the base node classes.
 *
 * The base class's `getType`/`clone`/`importJSON`/`exportJSON` are inherited,
 * not own properties, so the assembled class runs through
 * `ensureLexicalNodeOwnMethods` at assembly time — with every card assembled,
 * no registry-level own-method pass remains.
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
    static cardMenu: MenuItem[] | undefined = getCardMenu(declaration.nodeType)

    decorate(): ReactNode {
      return decorateCard(this)
    }
  }

  ensureLexicalNodeOwnMethods(AssembledCardNode)

  return AssembledCardNode as unknown as CardNodeClass<TNode>
}

// `var` hoists: a shim reached through the wrapper-layer import cycle (shim →
// card-wrappers → assemble-card-node → decorate tree → plugins/components →
// shim) calls `assembleCardNodeOnce` while this module is still evaluating, so
// the cache binding must exist before any module body runs — a `const` would
// still be in its TDZ.
// oxlint-disable-next-line no-var
var assembledCardNodeCache: WeakMap<object, CardNodeClass<LexicalNode>> | undefined

/**
 * The single-site card assembler (plan 039, Batch 5): every caller — the
 * wrapper-layer projection (`@/nodes/cards/card-wrappers`) and the shim
 * modules (`@/nodes/AudioNode` and friends) — assembles a card's registered
 * class through this memoized helper, so exactly one class object exists per
 * declaration and importDOM/clone identity is coherent across every consumer.
 * Keyed on the declaration object itself: the declarations are the per-card
 * source of truth and never import the wrapper layer, so the same object
 * reaches every caller.
 *
 * Memoization must live behind a hoisted function (never a module-level
 * `const` map read): the wrapper layer's import closure contains the React
 * decorate tree, whose components/plugins value-import the shim modules —
 * when a shim is evaluated mid-cycle it calls this function before the
 * wrapper-layer module bodies have run.
 */
export function assembleCardNodeOnce<TNode extends LexicalNode>(
  // oxlint-disable-next-line typescript/no-explicit-any
  declaration: CardDeclaration & { baseNode: new (...args: any[]) => TNode },
): CardNodeClass<TNode> {
  assembledCardNodeCache ??= new WeakMap()
  const cached = assembledCardNodeCache.get(declaration)
  if (cached) {
    return cached as CardNodeClass<TNode>
  }
  const assembled = assembleCardNode(declaration)
  assembledCardNodeCache.set(declaration, assembled)
  return assembled
}
