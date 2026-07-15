import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import {
  ExtendedHeadingNode,
  ExtendedTextNode,
  extendedHeadingNodeReplacement,
  extendedTextNodeReplacement,
} from '@/nodes/base'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

// Cards eligible for the email renderer, from their declarations.
const CARD_NODES = deriveCardNodes(CARD_WRAPPER_NODES, 'emailRenderer').map((card) => card.node)

// No `ensureLexicalNodeOwnMethods` loop: this set has no hand-written
// subclassing wrappers — its one card (horizontalrule) is assembled from its
// declaration (covered by `assembleCardNode`) and the rest declare their own
// statics natively.
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

export default EMAIL_NODES
