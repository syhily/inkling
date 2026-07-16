import type { Klass, LexicalCommand, LexicalNode } from 'lexical'

import type { CardDeclaration, CardInsertSpec } from '@/nodes/cards/card-declaration'

import { getCardInsertCommand } from '@/nodes/cards/card-menus'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'

export interface CardInsertRegistration {
  nodeType: string
  node: Klass<LexicalNode>
  command: LexicalCommand<unknown>
  insert: CardInsertSpec
}

/**
 * Wrapper-layer projection of the card declarations (plan 043): each
 * insert-bearing declaration paired with the wrapper node class the
 * registration guards and constructs (from the `card-wrappers` projection)
 * and the insert command it joins (from its menu's first entry —
 * `getCardInsertCommand`). Kept out of the declaration modules so they stay
 * React-free; the registrar (`@/plugins/CardInsertPlugin`) is the derived
 * view over this list. CodeBlock and HorizontalRule declare no `insert` and
 * drop out here.
 */
export const CARD_INSERT_COMMANDS: CardInsertRegistration[] = CARD_WRAPPER_NODES.flatMap((declaration) => {
  // widen to the spec interface so the optional insert entry narrows uniformly
  const { insert } = declaration as CardDeclaration
  const command = getCardInsertCommand(declaration.nodeType)
  if (insert === undefined || command === undefined) {
    return []
  }
  return [
    {
      nodeType: declaration.nodeType,
      node: declaration.node,
      command,
      insert,
    },
  ]
})
