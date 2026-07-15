import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { AsideNode } from '@/nodes/AsideNode'
import {
  ExtendedHeadingNode,
  ExtendedQuoteNode,
  ExtendedTextNode,
  ensureLexicalNodeOwnMethods,
  extendedHeadingNodeReplacement,
  extendedQuoteNodeReplacement,
  extendedTextNodeReplacement,
} from '@/nodes/base'
import { BookmarkNode } from '@/nodes/BookmarkNode'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

// Cards eligible for the email editor, from their declarations; declaration
// order reproduces the pre-refactor card run below.
const CARD_NODES = deriveCardNodes(CARD_WRAPPER_NODES, 'emailEditor').map((card) => card.node)

/**
 * Node set for the email editor. Slimmed down version of the default nodes exempting those that aren't meant for email.
 */
const EMAIL_EDITOR_NODES = [
  // Base text nodes
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

  // Cards for email
  ...CARD_NODES,
]

// Only the surviving hand-written wrappers subclass their base nodes without
// redeclaring Lexical's checked methods, so only they need the own-method
// copies here — the assembled card classes are covered by `assembleCardNode`
// and every other node declares its own statics natively.
for (const node of [AsideNode, BookmarkNode]) {
  ensureLexicalNodeOwnMethods(node)
}

export default EMAIL_EDITOR_NODES
