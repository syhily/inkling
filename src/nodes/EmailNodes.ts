import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import {
  ExtendedHeadingNode,
  ExtendedTextNode,
  ensureLexicalNodeOwnMethods,
  extendedHeadingNodeReplacement,
  extendedTextNodeReplacement,
} from '@/nodes/base'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

// Cards eligible for the email renderer, from their declarations.
const CARD_NODES = deriveCardNodes(CARD_WRAPPER_NODES, 'emailRenderer').map((card) => card.node)

const EMAIL_NODES = [
  ExtendedTextNode,
  extendedTextNodeReplacement,
  HeadingNode,
  ExtendedHeadingNode,
  extendedHeadingNodeReplacement,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ...CARD_NODES,
]

for (const node of EMAIL_NODES) {
  ensureLexicalNodeOwnMethods(node)
}

export default EMAIL_NODES
