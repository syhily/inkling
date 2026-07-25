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

// Cards join the set from their declarations; declaration order reproduces
// the pre-refactor card run below LinkNode.
const CARDS = CARD_WRAPPER_NODES

// The non-card base run the editor's node set starts from.
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
