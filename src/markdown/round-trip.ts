import type { SerializedEditorState } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type MultilineElementTransformer,
  type Transformer,
} from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import type { MarkdownDialect } from '@/markdown/dialects'

import { DEFAULT_TRANSFORMERS } from '@/markdown/transformers'
import { $createMarkdownNode, $isMarkdownNode, MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'
import { CARD_MARKDOWN_DECLARATIONS } from '@/nodes/cards/card-markdown-transformers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'
import { $createCodeBlockNode, $isCodeBlockNode, CodeBlockNode } from '@/nodes/CodeBlockNode'

/**
 * The card-aware round-trip dialect — one of Inkling's two markdown dialects
 * (the shared seam and grammar interface live in `@/markdown/dialects`; the
 * paste dialect is `@/markdown/paste-dialect`) and the public markdown
 * import/export API documented in `docs/markdown-api.md`.
 *
 * What the dialect speaks is declared as data on `roundTripDialect.grammar`:
 * ```inkling:<card>``` fences, standard `![alt](src)` image syntax, and
 * `~`/`^` sub/sup — but not footnotes. (`==mark==` converts in both
 * dialects: `@lexical/markdown`'s TEXT_FORMAT_TRANSFORMERS include
 * HIGHLIGHT.) Conversion runs through `@lexical/markdown`'s
 * `$convertFromMarkdownString` / `$convertToMarkdownString` on a temporary
 * headless editor with the constrained node set below.
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

const MARKDOWN_CARDS = deriveCardNodes(CARD_MARKDOWN_DECLARATIONS, MARKDOWN_CARD_ORDER)

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

// MarkdownNode is a base-only node, not a card, so its `inkling:markdown`
// fence transformer stays hand-written here beside the dialect rather than
// in the card transformer table.
const MARKDOWN_CARD_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [MarkdownNode],
  export: (node) => {
    if (!$isMarkdownNode(node)) {
      return null
    }
    return '```inkling:markdown\n' + node.markdown + '\n```'
  },
  regExpEnd: /^```\s*$/,
  regExpStart: /^```inkling:markdown\s*$/,
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, _isImport) => {
    // `linesInBetween` includes the (always empty) remainder of the opening
    // fence line and the (always empty) prefix of the closing fence line —
    // strip both, like the built-in CODE transformer does.
    const markdown = linesInBetween?.slice(1, -1).join('\n') ?? ''
    rootNode.append($createMarkdownNode({ markdown }))
  },
  type: 'multiline-element',
}

export const CARD_TRANSFORMERS: Transformer[] = [
  ...MARKDOWN_CARDS.flatMap((card) => (card.markdownTransformer ? [card.markdownTransformer] : [])),
  MARKDOWN_CARD_TRANSFORMER,
]

// Fenced code blocks are this dialect's grammar, so the dialect carries its
// own multiline transformer. The shared `CODE_BLOCK` element transformer
// (`@/markdown/transformers`) is a typing-shortcut trigger: its regex only
// fires on the trailing-space keystroke and deliberately never claims fences
// on import — which used to leave imported fences as literal paragraphs that
// export then re-escaped to \`\`\`. The export here reads `node.code` rather
// than `getTextContent()`, which pads word-count text (caption included)
// with trailing newlines. Ordered after the card transformers so
// ```inkling:<card>``` fences match their card transformer first.
const CODE_FENCE: MultilineElementTransformer = {
  dependencies: [CodeBlockNode],
  export: (node) => {
    if (!$isCodeBlockNode(node)) {
      return null
    }
    const code = node.code
    return '```' + (node.language || '') + (code ? '\n' + code : '') + '\n' + '```'
  },
  regExpEnd: /^```\s*$/,
  regExpStart: /^```(\w+)?\s*$/,
  replace: (rootNode, _children, startMatch, _endMatch, linesInBetween, _isImport) => {
    // Same bracketing as MARKDOWN_CARD_TRANSFORMER: strip the (always empty)
    // remainder of the opening fence line and prefix of the closing line.
    const code = linesInBetween?.slice(1, -1).join('\n') ?? ''
    rootNode.append($createCodeBlockNode({ code, language: startMatch[1] }))
  },
  type: 'multiline-element',
}

const TRANSFORMERS: Transformer[] = [...CARD_TRANSFORMERS, CODE_FENCE, ...DEFAULT_TRANSFORMERS]

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

export const roundTripDialect: MarkdownDialect & {
  markdownToLexicalState: typeof markdownToLexicalState
  lexicalStateToMarkdown: typeof lexicalStateToMarkdown
} = {
  name: 'card-aware round-trip',
  grammar: {
    footnotes: false,
    mark: true,
    subSup: true,
    cardFences: true,
  },
  markdownToLexicalState,
  lexicalStateToMarkdown,
}
