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
const CARDS = deriveCardNodes(CARD_WRAPPER_NODES, 'default')

// The non-card base run every editor surface starts from. Each surface's node
// set extends this single constant (the email renderer filters it) instead of
// duplicating the run.
export const EDITOR_BASE_NODES = [
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
]

// Every card class is assembled via `assembleCardNode`, which runs this same
// own-method pass at assembly time; only AsideNode needs it here.
ensureLexicalNodeOwnMethods(AsideNode)

const DEFAULT_NODES = [
  ...EDITOR_BASE_NODES,
  ...CARDS.map((card) => card.node),
  TKNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
]

export default DEFAULT_NODES
