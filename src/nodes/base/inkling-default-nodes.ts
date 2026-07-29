export type { GeneratedDecoratorNodeBase } from '@/nodes/base/generate-decorator-node'
export { $updateCardNode } from '@/nodes/base/update-card-node'
export * from '@/nodes/base/export-dom'
export { ensureLexicalNodeOwnMethods } from '@/nodes/base/ensure-node-own-methods'
export { CARD_WIDTHS, isCardWidth, normalizeCardWidth, type CardWidth } from '@/nodes/base/utils/card-widths'

import type { Klass, LexicalNode } from 'lexical'

import { AsideNode } from '@/nodes/base/nodes/aside/AsideNode'
import { AtLinkNode, AtLinkSearchNode } from '@/nodes/base/nodes/at-link/index'
import {
  EXTENDED_HEADING_NODE_PAIR,
  EXTENDED_QUOTE_NODE_PAIR,
  EXTENDED_TEXT_NODE_PAIR,
} from '@/nodes/base/nodes/extended-node-pairs'
import { MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'
import { TKNode } from '@/nodes/base/nodes/TKNode'
import { ZWNJNode } from '@/nodes/base/nodes/zwnj/ZWNJNode'
import linebreakSerializers from '@/nodes/base/serializers/linebreak'
import paragraphSerializers from '@/nodes/base/serializers/paragraph'
import { CARD_DECLARATIONS } from '@/nodes/cards'
import { FootnoteRefNode } from '@/nodes/footnote/FootnoteRefNode'
import { MathInlineNode } from '@/nodes/math/MathInlineNode'

// re-export everything for easier importing
export * from '@/nodes/base/InklingDecoratorNode'
export * from '@/nodes/base/nodes/image/ImageNode'
export * from '@/nodes/base/nodes/codeblock/CodeBlockNode'
export * from '@/nodes/base/nodes/markdown/MarkdownNode'
export * from '@/nodes/base/nodes/video/VideoNode'
export * from '@/nodes/base/nodes/audio/AudioNode'
export * from '@/nodes/base/nodes/callout/CalloutNode'
export * from '@/nodes/base/nodes/aside/AsideNode'
export * from '@/nodes/base/nodes/horizontalrule/HorizontalRuleNode'
export * from '@/nodes/base/nodes/html/HtmlNode'
export * from '@/nodes/base/nodes/toggle/ToggleNode'
export * from '@/nodes/base/nodes/button/ButtonNode'
export * from '@/nodes/base/nodes/bookmark/BookmarkNode'
export * from '@/nodes/base/nodes/file/FileNode'
export * from '@/nodes/base/nodes/header/HeaderNode'
export * from '@/nodes/base/nodes/gallery/GalleryNode'
export * from '@/nodes/base/nodes/math/MathNode'
export * from '@/nodes/base/nodes/ExtendedTextNode'
export * from '@/nodes/base/nodes/ExtendedHeadingNode'
export * from '@/nodes/base/nodes/ExtendedQuoteNode'
export * from '@/nodes/base/nodes/TKNode'
export * from '@/nodes/base/nodes/at-link/index'
export * from '@/nodes/base/nodes/zwnj/ZWNJNode'
export * from '@/nodes/base/nodes/footnotedefinition/FootnoteDefinitionNode'

export const serializers = {
  linebreak: linebreakSerializers,
  paragraph: paragraphSerializers,
}

export const DEFAULT_CONFIG = {
  html: {
    import: {
      ...serializers.linebreak.import,
      ...serializers.paragraph.import,
    },
  },
}

// The named node runs every surface composes — the facts used to be spelled
// per surface (FootnoteRefNode once had to be added to two lists). The
// extended-node pairs live in a cycle-free leaf (extended-node-pairs.ts) so
// MINIMAL_NODES can compose them; the barrel re-exports them here.
export { EXTENDED_HEADING_NODE_PAIR, EXTENDED_QUOTE_NODE_PAIR, EXTENDED_TEXT_NODE_PAIR }

/** The entity-node tail closing the editor's node sets. */
export const ENTITY_TAIL_NODES = [TKNode, AtLinkNode, AtLinkSearchNode, ZWNJNode, MathInlineNode, FootnoteRefNode]

// The pre-declaration order of the base DEFAULT_NODES as one ordered list:
// card names resolve from the declarations, the two non-card slots from
// their base classes (MarkdownNode and AsideNode are base-only nodes —
// pinned in place). Cards without a legacy slot (declared later) keep
// declaration order and land after the pinned run.
const BASE_NODE_BY_SLOT: Record<string, Klass<LexicalNode>> = { markdown: MarkdownNode, aside: AsideNode }

const LEGACY_DEFAULT_ORDER = [
  'codeblock',
  'image',
  'markdown',
  'video',
  'audio',
  'callout',
  'aside',
  'horizontalrule',
  'html',
  'file',
  'toggle',
  'button',
  'header',
  'bookmark',
  'gallery',
]

const cardByType = new Map<string, (typeof CARD_DECLARATIONS)[number]>(
  CARD_DECLARATIONS.map((card) => [card.nodeType, card]),
)
const slottedTypes = new Set<string>()
const legacyOrderedNodes = LEGACY_DEFAULT_ORDER.map((slot) => {
  const baseNode = BASE_NODE_BY_SLOT[slot]
  if (baseNode) {
    return baseNode
  }
  const card = cardByType.get(slot)
  if (!card) {
    throw new Error(`[inkling-default-nodes] legacy slot '${slot}' names no declared card`)
  }
  slottedTypes.add(slot)
  return card.baseNode
})
const additionalCardNodes = CARD_DECLARATIONS.filter((card) => !slottedTypes.has(card.nodeType)).map(
  (card) => card.baseNode,
)

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
  ...EXTENDED_TEXT_NODE_PAIR,
  ...EXTENDED_HEADING_NODE_PAIR,
  ...EXTENDED_QUOTE_NODE_PAIR,
  ...legacyOrderedNodes,
  ...additionalCardNodes,
  ...ENTITY_TAIL_NODES,
]
