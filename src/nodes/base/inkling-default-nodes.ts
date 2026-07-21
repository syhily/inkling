export type { GeneratedDecoratorNodeBase } from '@/nodes/base/generate-decorator-node'
export { $updateCardNode } from '@/nodes/base/update-card-node'
export * from '@/nodes/base/export-dom'
export { ensureLexicalNodeOwnMethods } from '@/nodes/base/ensure-node-own-methods'
export { CARD_WIDTHS, isCardWidth, normalizeCardWidth, type CardWidth } from '@/nodes/base/utils/card-widths'

import { AsideNode } from '@/nodes/base/nodes/aside/AsideNode'
import { AtLinkNode, AtLinkSearchNode } from '@/nodes/base/nodes/at-link/index'
import { ExtendedHeadingNode, extendedHeadingNodeReplacement } from '@/nodes/base/nodes/ExtendedHeadingNode'
import { ExtendedQuoteNode, extendedQuoteNodeReplacement } from '@/nodes/base/nodes/ExtendedQuoteNode'
import { ExtendedTextNode, extendedTextNodeReplacement } from '@/nodes/base/nodes/ExtendedTextNode'
import { MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'
import { TKNode } from '@/nodes/base/nodes/TKNode'
import { ZWNJNode } from '@/nodes/base/nodes/zwnj/ZWNJNode'
import linebreakSerializers from '@/nodes/base/serializers/linebreak'
import paragraphSerializers from '@/nodes/base/serializers/paragraph'
import { CARD_DECLARATIONS } from '@/nodes/cards'
import { deriveCardNodes } from '@/nodes/cards/derive-card-nodes'

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
export * from '@/nodes/base/nodes/ExtendedTextNode'
export * from '@/nodes/base/nodes/ExtendedHeadingNode'
export * from '@/nodes/base/nodes/ExtendedQuoteNode'
export * from '@/nodes/base/nodes/TKNode'
export * from '@/nodes/base/nodes/at-link/index'
export * from '@/nodes/base/nodes/zwnj/ZWNJNode'

import { generateDecoratorNode } from '@/nodes/base/generate-decorator-node'
import { rgbToHex } from '@/nodes/base/utils/rgb-to-hex'
import { html, oneline } from '@/nodes/base/utils/tagged-template-fns'
// export utility functions that are useful in other packages or tests
import {
  ALL_MEMBERS_SEGMENT,
  FREE_MEMBERS_SEGMENT,
  NO_MEMBERS_SEGMENT,
  PAID_MEMBERS_SEGMENT,
  buildDefaultVisibility,
  isOldVisibilityFormat,
  isVisibilityRestricted,
  migrateOldVisibilityFormat,
  renderWithVisibility,
  type Visibility,
} from '@/nodes/base/utils/visibility'
export const utils = {
  generateDecoratorNode,
  visibility: {
    ALL_MEMBERS_SEGMENT,
    FREE_MEMBERS_SEGMENT,
    NO_MEMBERS_SEGMENT,
    PAID_MEMBERS_SEGMENT,
    buildDefaultVisibility,
    isOldVisibilityFormat,
    isVisibilityRestricted,
    migrateOldVisibilityFormat,
    renderWithVisibility,
  },
  rgbToHex,
  taggedTemplateFns: { oneline, html },
}
export type { Visibility }

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

// The pre-declaration card order of DEFAULT_NODES — pinned so the derived
// view stays identical to the pre-refactor array. Cards without a legacy
// rank (declared later) keep declaration order and land after the pinned run.
const LEGACY_DEFAULT_CARD_ORDER = [
  'codeblock',
  'image',
  'video',
  'audio',
  'callout',
  'horizontalrule',
  'html',
  'file',
  'toggle',
  'button',
  'header',
  'bookmark',
  'gallery',
]

const [
  codeBlockCardNode,
  imageCardNode,
  videoCardNode,
  audioCardNode,
  calloutCardNode,
  horizontalRuleCardNode,
  htmlCardNode,
  fileCardNode,
  toggleCardNode,
  buttonCardNode,
  headerCardNode,
  bookmarkCardNode,
  galleryCardNode,
  ...additionalCardNodes
] = deriveCardNodes(CARD_DECLARATIONS, 'default', LEGACY_DEFAULT_CARD_ORDER).map((card) => card.baseNode)

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
  ExtendedTextNode,
  extendedTextNodeReplacement,
  ExtendedHeadingNode,
  extendedHeadingNodeReplacement,
  ExtendedQuoteNode,
  extendedQuoteNodeReplacement,
  codeBlockCardNode,
  imageCardNode,
  // MarkdownNode is a base-only node (not a card) — pinned in place.
  MarkdownNode,
  videoCardNode,
  audioCardNode,
  calloutCardNode,
  AsideNode,
  horizontalRuleCardNode,
  htmlCardNode,
  fileCardNode,
  toggleCardNode,
  buttonCardNode,
  headerCardNode,
  bookmarkCardNode,
  galleryCardNode,
  ...additionalCardNodes,
  TKNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
]
