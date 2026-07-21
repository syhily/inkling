import { AudioNode } from '@/nodes/AudioNode'
import { ensureLexicalNodeOwnMethods } from '@/nodes/base/ensure-node-own-methods'
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
 * close an import cycle through the wrapper files.
 */
export const CARD_WRAPPER_NODES = CARD_DECLARATIONS.map((declaration) => ({
  ...declaration,
  node: WRAPPER_NODES[declaration.nodeType],
}))

/**
 * The derived own-method pass for the editor node sets
 * (`@/nodes/DefaultNodes`, `@/nodes/EmailEditorNodes`): the declarations flag
 * their hand-written wrappers (`handWrittenWrapper` — Bookmark, Header,
 * Toggle), and only those subclass their base nodes without redeclaring
 * Lexical's checked methods. Assembled card classes are covered by
 * `assembleCardNode`; every other node declares its own statics natively.
 * Deriving the list here means the two node sets can no longer drift apart —
 * their difference is the declarations' surface data, not two literal arrays.
 */
export function ensureHandWrittenWrapperOwnMethods(cards: typeof CARD_WRAPPER_NODES): void {
  for (const card of cards) {
    if ('handWrittenWrapper' in card && card.handWrittenWrapper) {
      ensureLexicalNodeOwnMethods(card.node)
    }
  }
}
