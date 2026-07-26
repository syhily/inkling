import type { SerializedEditorState } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  isTableRowDivider,
  type MultilineElementTransformer,
  type Transformer,
} from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $createParagraphNode } from 'lexical'

import type { MarkdownDialect } from '@/markdown/dialects'
import type { HostCard } from '@/nodes/cards/host-cards'

import { DEFAULT_TRANSFORMERS } from '@/markdown/transformers'
import { MINIMAL_TRANSFORMERS } from '@/markdown/transformers-core'
import { $createMarkdownNode, $isMarkdownNode, MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'
import { CARD_MARKDOWN_DECLARATIONS } from '@/nodes/cards/card-markdown-transformers'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'
import { $createCodeBlockNode, $isCodeBlockNode, CodeBlockNode } from '@/nodes/CodeBlockNode'
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
  type TableCellHeaderState,
} from '@/nodes/table/TableNodes'

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
  TableNode,
  TableRowNode,
  TableCellNode,
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

// GFM pipe-table transformer, hand-written: @lexical/markdown 0.46 ships no
// upstream TABLE transformer — only the row/divider regexes that
// normalizeMarkdown uses. Import claims a header row only when a divider
// line follows it (otherwise the line stays a literal paragraph); cell
// markdown converts through the dialect's minimal inline-only set, so a
// cell can never grow block content. Export escapes pipes and always emits
// row 0 as the GFM header — GFM has no headerless tables.
const TABLE_ROW_REG_EXP = /^\|(.+)\|\s*$/

function splitTableRow(line: string): string[] {
  const match = line.match(TABLE_ROW_REG_EXP)
  if (!match) {
    return []
  }
  // split on unescaped pipes only, then unescape `\|`
  return match[1].split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

const GFM_TABLE: MultilineElementTransformer = {
  dependencies: [TableNode],
  regExpStart: TABLE_ROW_REG_EXP,
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
    const divider = lines[startLineIndex + 1]
    if (divider === undefined || !isTableRowDivider(divider)) {
      return null
    }

    const headerCells = splitTableRow(lines[startLineIndex])
    const bodyRows: string[][] = []
    let endLineIndex = startLineIndex + 1
    while (endLineIndex + 1 < lines.length && TABLE_ROW_REG_EXP.test(lines[endLineIndex + 1])) {
      bodyRows.push(splitTableRow(lines[endLineIndex + 1]))
      endLineIndex += 1
    }

    const table = $createTableNode()
    const appendRow = (cells: string[], headerState: TableCellHeaderState) => {
      const row = $createTableRowNode()
      for (const cellText of cells) {
        const cell = $createTableCellNode(headerState)
        const paragraph = $createParagraphNode()
        $convertFromMarkdownString(cellText, MINIMAL_TRANSFORMERS, paragraph)
        cell.append(...paragraph.getChildren())
        row.append(cell)
      }
      table.append(row)
    }
    appendRow(headerCells, TableCellHeaderStates.ROW)
    bodyRows.forEach((cells) => appendRow(cells, TableCellHeaderStates.NO_STATUS))

    rootNode.append(table)
    return [true, endLineIndex]
  },
  // unreachable: handleImportAfterStartMatch always claims or declines
  replace: () => false,
  export: (node, exportChildren) => {
    if (!$isTableNode(node)) {
      return null
    }
    const rows = node.getChildren().filter($isTableRowNode)
    if (rows.length === 0) {
      return null
    }

    const lines = rows.map((row) => {
      const cells = row
        .getChildren()
        .map((cell) =>
          $isTableCellNode(cell) ? exportChildren(cell).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim() : '',
        )
      return '| ' + cells.join(' | ') + ' |'
    })
    const columnCount = Math.max(...rows.map((row) => row.getChildrenSize()))
    const divider = '| ' + Array.from({ length: columnCount }, () => '---').join(' | ') + ' |'
    return [lines[0], divider, ...lines.slice(1)].join('\n')
  },
  type: 'multiline-element',
}

const TRANSFORMERS: Transformer[] = [...CARD_TRANSFORMERS, GFM_TABLE, CODE_FENCE, ...DEFAULT_TRANSFORMERS]

/**
 * The options the round-trip pair accepts: `cards` composes host cards
 * (CONTEXT.md: "host card") into the conversion — their assembled node
 * classes join the editor's node set and their fence transformers join the
 * card transformer run, ordered before CODE_FENCE so `inkling:<card>` fences
 * match their card transformer first (the same precedence the built-in cards
 * get).
 */
export interface MarkdownRoundTripOptions {
  cards?: readonly HostCard[]
}

function createMarkdownEditor(cards: readonly HostCard[]) {
  return createHeadlessEditor({
    nodes: [...MARKDOWN_NODES, ...cards.map((card) => card.node)],
    onError(error) {
      throw error
    },
  })
}

// Host card fences join the card run — ahead of CODE_FENCE. With no host
// cards the shared constant is reused, so the default conversion is
// byte-identical to the pre-options behavior.
function resolveTransformers(cards: readonly HostCard[]): Transformer[] {
  if (cards.length === 0) {
    return TRANSFORMERS
  }
  const hostTransformers = cards.flatMap((card) => (card.markdownTransformer ? [card.markdownTransformer] : []))
  return [...CARD_TRANSFORMERS, ...hostTransformers, GFM_TABLE, CODE_FENCE, ...DEFAULT_TRANSFORMERS]
}

/**
 * Convert a markdown string to a serialized Lexical editor state.
 *
 * Uses `@lexical/markdown`'s `$convertFromMarkdownString` together with the
 * existing Inkling shortcut transformers (headings, lists, quotes, links, code
 * blocks, horizontal rules, sub/superscript, etc.).
 */
export function markdownToLexicalState(
  markdown: string,
  options: MarkdownRoundTripOptions = {},
): SerializedEditorState {
  const cards = options.cards ?? []
  const editor = createMarkdownEditor(cards)

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, resolveTransformers(cards))
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
export function lexicalStateToMarkdown(state: SerializedEditorState, options: MarkdownRoundTripOptions = {}): string {
  const cards = options.cards ?? []
  const editor = createMarkdownEditor(cards)

  editor.setEditorState(editor.parseEditorState(state))

  return editor.getEditorState().read(() => {
    return $convertToMarkdownString(resolveTransformers(cards))
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
