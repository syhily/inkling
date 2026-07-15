import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { AsideNode } from '@/nodes/AsideNode'
import {
  AtLinkNode,
  AtLinkSearchNode,
  ExtendedHeadingNode,
  ExtendedQuoteNode,
  ExtendedTextNode,
  TKNode,
  ZWNJNode,
  ensureLexicalNodeOwnMethods,
  extendedHeadingNodeReplacement,
  extendedQuoteNodeReplacement,
  extendedTextNodeReplacement,
} from '@/nodes/base'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

// Cards join the set from their declarations; declaration order reproduces
// the pre-refactor card run below LinkNode.
const CARD_NODES = deriveCardNodes(CARD_WRAPPER_NODES, 'default').map((card) => card.node)

const RAW_NODES = [
  ExtendedTextNode,
  extendedTextNodeReplacement,
  HeadingNode,
  ExtendedHeadingNode,
  extendedHeadingNodeReplacement,
  QuoteNode,
  ExtendedQuoteNode,
  extendedQuoteNodeReplacement,
  ListNode,
  ListItemNode,
  AsideNode,
  LinkNode,
  ...CARD_NODES,
  TKNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
]

for (const node of RAW_NODES) {
  ensureLexicalNodeOwnMethods(node)
}

const DEFAULT_NODES = RAW_NODES

export default DEFAULT_NODES
