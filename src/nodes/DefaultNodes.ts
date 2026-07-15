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
import { BookmarkNode } from '@/nodes/BookmarkNode'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'
import { HeaderNode } from '@/nodes/HeaderNode'
import { ToggleNode } from '@/nodes/ToggleNode'

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

// Only the surviving hand-written wrappers subclass their base nodes without
// redeclaring Lexical's checked methods, so only they need the own-method
// copies here — the assembled card classes are covered by `assembleCardNode`
// and every other node declares its own statics natively.
for (const node of [AsideNode, BookmarkNode, HeaderNode, ToggleNode]) {
  ensureLexicalNodeOwnMethods(node)
}

const DEFAULT_NODES = RAW_NODES

export default DEFAULT_NODES
