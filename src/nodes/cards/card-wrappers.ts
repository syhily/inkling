import { AudioNode } from '@/nodes/AudioNode'
import { BookmarkNode } from '@/nodes/BookmarkNode'
import { ButtonNode } from '@/nodes/ButtonNode'
import { CalloutNode } from '@/nodes/CalloutNode'
import { CARD_DECLARATIONS, type CardNodeType } from '@/nodes/cards'
import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { FileNode } from '@/nodes/FileNode'
import { GalleryNode } from '@/nodes/GalleryNode'
import { HeaderNode } from '@/nodes/HeaderNode'
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { HtmlNode } from '@/nodes/HtmlNode'
import { ImageNode } from '@/nodes/ImageNode'
import { ToggleNode } from '@/nodes/ToggleNode'
import { VideoNode } from '@/nodes/VideoNode'

const WRAPPER_NODES = {
  audio: AudioNode,
  bookmark: BookmarkNode,
  button: ButtonNode,
  callout: CalloutNode,
  codeblock: CodeBlockNode,
  file: FileNode,
  gallery: GalleryNode,
  header: HeaderNode,
  horizontalrule: HorizontalRuleNode,
  html: HtmlNode,
  image: ImageNode,
  toggle: ToggleNode,
  video: VideoNode,
} satisfies Record<CardNodeType, unknown>

/**
 * Wrapper-layer projection of the card declarations: each declaration paired
 * with the wrapper node class that editor surfaces register. Kept out of the
 * declaration modules so they stay React-free — `@/nodes/base` derives its
 * own node set from the declarations, and importing wrappers there would
 * close an import cycle through the base barrel.
 */
export const CARD_WRAPPER_NODES = CARD_DECLARATIONS.map((declaration) => ({
  ...declaration,
  node: WRAPPER_NODES[declaration.nodeType],
}))
