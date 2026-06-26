export { GeneratedDecoratorNodeBase } from '@/nodes/base/generate-decorator-node'
export * from '@/nodes/base/export-dom'
export { ensureLexicalNodeOwnMethods } from '@/nodes/base/ensure-node-own-methods'

import { AsideNode } from '@/nodes/base/nodes/aside/AsideNode'
import { AtLinkNode, AtLinkSearchNode } from '@/nodes/base/nodes/at-link/index'
import { AudioNode } from '@/nodes/base/nodes/audio/AudioNode'
import { BookmarkNode } from '@/nodes/base/nodes/bookmark/BookmarkNode'
import { ButtonNode } from '@/nodes/base/nodes/button/ButtonNode'
import { CalloutNode } from '@/nodes/base/nodes/callout/CalloutNode'
import { CodeBlockNode } from '@/nodes/base/nodes/codeblock/CodeBlockNode'
import { ExtendedHeadingNode, extendedHeadingNodeReplacement } from '@/nodes/base/nodes/ExtendedHeadingNode'
import { ExtendedQuoteNode, extendedQuoteNodeReplacement } from '@/nodes/base/nodes/ExtendedQuoteNode'
import { ExtendedTextNode, extendedTextNodeReplacement } from '@/nodes/base/nodes/ExtendedTextNode'
import { FileNode } from '@/nodes/base/nodes/file/FileNode'
import { GalleryNode } from '@/nodes/base/nodes/gallery/GalleryNode'
import { HeaderNode } from '@/nodes/base/nodes/header/HeaderNode'
import { HorizontalRuleNode } from '@/nodes/base/nodes/horizontalrule/HorizontalRuleNode'
import { HtmlNode } from '@/nodes/base/nodes/html/HtmlNode'
import { ImageNode } from '@/nodes/base/nodes/image/ImageNode'
import { MarkdownNode } from '@/nodes/base/nodes/markdown/MarkdownNode'
import { TKNode } from '@/nodes/base/nodes/TKNode'
import { ToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
import { VideoNode } from '@/nodes/base/nodes/video/VideoNode'
import { ZWNJNode } from '@/nodes/base/nodes/zwnj/ZWNJNode'
import linebreakSerializers from '@/nodes/base/serializers/linebreak'
import paragraphSerializers from '@/nodes/base/serializers/paragraph'

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

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
  ExtendedTextNode,
  extendedTextNodeReplacement,
  ExtendedHeadingNode,
  extendedHeadingNodeReplacement,
  ExtendedQuoteNode,
  extendedQuoteNodeReplacement,
  CodeBlockNode,
  ImageNode,
  MarkdownNode,
  VideoNode,
  AudioNode,
  CalloutNode,
  AsideNode,
  HorizontalRuleNode,
  HtmlNode,
  FileNode,
  ToggleNode,
  ButtonNode,
  HeaderNode,
  BookmarkNode,
  GalleryNode,
  TKNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
]
