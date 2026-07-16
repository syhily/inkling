import type { SerializedEditorState } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString, type Transformer } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { MARKDOWN_CARD_TRANSFORMER } from '@/markdown/card-transformers'
import { DEFAULT_TRANSFORMERS } from '@/markdown/transformers'
import { MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'
import { CARD_MARKDOWN_DECLARATIONS } from '@/nodes/cards/card-markdown-transformers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

/**
 * Public markdown import/export API.
 *
 * Provides round-trip conversion between markdown strings and serialized
 * Lexical editor states using `@lexical/markdown` with the existing Inkling
 * node set and transformers (headings, lists, quotes, links, code blocks,
 * horizontal rules, sub/superscript, etc.).
 *
 * Design notes and limitations are documented in `docs/markdown-api.md`.
 */

// The pre-declaration markdown card order — pinned so the derived views stay
// identical to the pre-refactor arrays (transformer order affects matching).
// Cards without a legacy rank (declared later) keep declaration order and
// land after the pinned run. MarkdownNode is a base-only node, not a card —
// it and MARKDOWN_CARD_TRANSFORMER stay manual.
const MARKDOWN_CARD_ORDER = [
  'codeblock',
  'horizontalrule',
  'image',
  'html',
  'file',
  'button',
  'audio',
  'video',
  'gallery',
  'bookmark',
  'toggle',
  'callout',
]

const MARKDOWN_CARDS = deriveCardNodes(CARD_MARKDOWN_DECLARATIONS, 'markdown', MARKDOWN_CARD_ORDER)

// Exported (not part of the public `@/markdown` barrel) so the node-set diff
// test can pin the derived arrays against the pre-refactor literals.
export const MARKDOWN_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ...MARKDOWN_CARDS.map((card) => card.node),
  MarkdownNode,
]

export const CARD_TRANSFORMERS = [
  ...MARKDOWN_CARDS.flatMap((card) => (card.markdownTransformer ? [card.markdownTransformer] : [])),
  MARKDOWN_CARD_TRANSFORMER,
] as Transformer[]

const TRANSFORMERS = [...CARD_TRANSFORMERS, ...DEFAULT_TRANSFORMERS] as Transformer[]

function createMarkdownEditor() {
  return createHeadlessEditor({
    nodes: MARKDOWN_NODES,
    onError(error) {
      throw error
    },
  })
}

/**
 * Convert a markdown string to a serialized Lexical editor state.
 *
 * Uses `@lexical/markdown`'s `$convertFromMarkdownString` together with the
 * existing Inkling shortcut transformers (headings, lists, quotes, links, code
 * blocks, horizontal rules, sub/superscript, etc.).
 */
export function markdownToLexicalState(markdown: string): SerializedEditorState {
  const editor = createMarkdownEditor()

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS)
    },
    { discrete: true },
  )

  return editor.getEditorState().toJSON()
}

/**
 * Convert a serialized Lexical editor state back to a markdown string.
 *
 * Uses `@lexical/markdown`'s `$convertToMarkdownString` with the same
 * transformer set used by `markdownToLexicalState`.
 */
export function lexicalStateToMarkdown(state: SerializedEditorState): string {
  const editor = createMarkdownEditor()

  editor.setEditorState(editor.parseEditorState(state))

  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(TRANSFORMERS)
  })
}
