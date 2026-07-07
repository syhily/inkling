import type { SerializedEditorState } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from '@lexical/markdown'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { ImageNode } from '@/nodes/ImageNode'
import { IMAGE_CARD_TRANSFORMER } from '@/markdown/card-transformers'
import { DEFAULT_TRANSFORMERS } from '@/plugins/MarkdownShortcutPlugin'

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

const MARKDOWN_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeBlockNode,
  HorizontalRuleNode,
  ImageNode,
]

const TRANSFORMERS = [...DEFAULT_TRANSFORMERS, IMAGE_CARD_TRANSFORMER] as Transformer[]

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
 * existing Inkling shortcut transformers (headings, lists, quotes, links,
 * code blocks, horizontal rules, sub/superscript, etc.).
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
