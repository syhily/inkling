import type { Klass, LexicalCommand, LexicalNode } from 'lexical'

import type { CardInsertSpec } from '@/nodes/cards/card-declaration'

import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { getHostCards } from '@/nodes/cards/host-card-registry'

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
 * and the insert command named on its insert spec — menu entry order carries
 * no command semantics. Kept out of the declaration modules so they stay
 * React-free; the registrar (`@/plugins/CardInsertPlugin`) is the derived
 * view over this list. CodeBlock and HorizontalRule declare no `insert` and
 * drop out here.
 */
export const CARD_INSERT_COMMANDS: CardInsertRegistration[] = CARD_WRAPPER_NODES.flatMap((declaration) => {
  // `in` narrows the union to the declarations carrying the optional insert entry
  const insert: CardInsertSpec | undefined = 'insert' in declaration ? declaration.insert : undefined
  if (insert === undefined) {
    return []
  }
  return [
    {
      nodeType: declaration.nodeType,
      node: declaration.node,
      command: insert.command,
      insert,
    },
  ]
})

/**
 * The full insert-registration view the registrar (`@/plugins/CardInsertPlugin`)
 * reads: the built-in projection above plus the host cards' insert projection
 * (CONTEXT.md: "host card"). A function rather than a constant so host cards
 * defined after module init still join — the per-card `hasNodes` guard at the
 * registration site keeps a surface that did not compose the card's node from
 * registering its command.
 */
export function getCardInsertRegistrations(): CardInsertRegistration[] {
  return [
    ...CARD_INSERT_COMMANDS,
    ...getHostCards().flatMap((host) => {
      const insert = host.insert
      if (insert === undefined) {
        return []
      }
      return [
        {
          nodeType: host.nodeType,
          node: host.node,
          command: insert.command,
          insert,
        },
      ]
    }),
  ]
}
