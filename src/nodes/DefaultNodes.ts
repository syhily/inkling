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
import { CARD_WRAPPER_NODES, ensureHandWrittenWrapperOwnMethods } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

// Cards join the set from their declarations; declaration order reproduces
// the pre-refactor card run below LinkNode.
const CARDS = deriveCardNodes(CARD_WRAPPER_NODES, 'default')

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
  ...CARDS.map((card) => card.node),
  TKNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
]

// Only the surviving hand-written wrappers subclass their base nodes without
// redeclaring Lexical's checked methods; the declarations flag them, so both
// editor node sets derive this list instead of hand-maintaining it.
ensureHandWrittenWrapperOwnMethods(CARDS)
ensureLexicalNodeOwnMethods(AsideNode)

const DEFAULT_NODES = RAW_NODES

export default DEFAULT_NODES
