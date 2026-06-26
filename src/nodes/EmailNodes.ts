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
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'

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
  HorizontalRuleNode,
]

for (const node of EMAIL_NODES) {
  ensureLexicalNodeOwnMethods(node)
}

export default EMAIL_NODES
