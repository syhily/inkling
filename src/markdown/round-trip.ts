import type { SerializedEditorState } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString, type Transformer } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import {
  AUDIO_CARD_TRANSFORMER,
  BOOKMARK_CARD_TRANSFORMER,
  BUTTON_CARD_TRANSFORMER,
  CALLOUT_CARD_TRANSFORMER,
  FILE_CARD_TRANSFORMER,
  GALLERY_CARD_TRANSFORMER,
  HTML_CARD_TRANSFORMER,
  IMAGE_CARD_TRANSFORMER,
  TOGGLE_CARD_TRANSFORMER,
  VIDEO_CARD_TRANSFORMER,
} from '@/markdown/card-transformers'
import { AudioNode } from '@/nodes/AudioNode'
import { BookmarkNode } from '@/nodes/BookmarkNode'
import { ButtonNode } from '@/nodes/ButtonNode'
import { CalloutNode } from '@/nodes/CalloutNode'
import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { FileNode } from '@/nodes/FileNode'
import { GalleryNode } from '@/nodes/GalleryNode'
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { HtmlNode } from '@/nodes/HtmlNode'
import { ImageNode } from '@/nodes/ImageNode'
import { ToggleNode } from '@/nodes/ToggleNode'
import { VideoNode } from '@/nodes/VideoNode'
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
  HtmlNode,
  FileNode,
  ButtonNode,
  AudioNode,
  VideoNode,
  GalleryNode,
  BookmarkNode,
  ToggleNode,
  CalloutNode,
]

const CARD_TRANSFORMERS = [
  IMAGE_CARD_TRANSFORMER,
  HTML_CARD_TRANSFORMER,
  FILE_CARD_TRANSFORMER,
  BUTTON_CARD_TRANSFORMER,
  AUDIO_CARD_TRANSFORMER,
  VIDEO_CARD_TRANSFORMER,
  GALLERY_CARD_TRANSFORMER,
  BOOKMARK_CARD_TRANSFORMER,
  TOGGLE_CARD_TRANSFORMER,
  CALLOUT_CARD_TRANSFORMER,
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
