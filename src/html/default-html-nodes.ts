import type { CreateEditorArgs } from 'lexical'

import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { DEFAULT_NODES } from '@/nodes/base'

/**
 * The complete node set shared by the default HTML importer
 * (`htmlToLexical`) and renderer (`LexicalHTMLRenderer`), so default output
 * from one is always valid default input to the other.
 *
 * Order matters: the five basic Lexical nodes are registered first so the
 * extended-node replacement descriptors in DEFAULT_NODES land after the
 * classes they replace.
 */
export const DEFAULT_HTML_NODES = [
  // basic HTML nodes
  HeadingNode,
  LinkNode,
  ListItemNode,
  ListNode,
  QuoteNode,

  // Inkling nodes
  ...DEFAULT_NODES,
] satisfies NonNullable<CreateEditorArgs['nodes']>
