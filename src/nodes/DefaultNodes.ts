import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { AsideNode } from '@/nodes/AsideNode'
import { AudioNode } from '@/nodes/AudioNode'
import {
  AtLinkNode,
  AtLinkSearchNode,
  ExtendedHeadingNode,
  ExtendedQuoteNode,
  ExtendedTextNode,
  TKNode,
  ZWNJNode,
  ensureLexicalNodeOwnMethods,
  extendedHeadingNodeReplacement,
  extendedQuoteNodeReplacement,
  extendedTextNodeReplacement,
} from '@/nodes/base'
import { BookmarkNode } from '@/nodes/BookmarkNode'
import { ButtonNode } from '@/nodes/ButtonNode'
import { CalloutNode } from '@/nodes/CalloutNode'
import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { FileNode } from '@/nodes/FileNode'
import { GalleryNode } from '@/nodes/GalleryNode'
import { HeaderNode } from '@/nodes/HeaderNode'
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { HtmlNode } from '@/nodes/HtmlNode'
import { ImageNode } from '@/nodes/ImageNode'
import { ToggleNode } from '@/nodes/ToggleNode'
import { VideoNode } from '@/nodes/VideoNode'

const RAW_NODES = [
  ExtendedTextNode,
  extendedTextNodeReplacement,
  HeadingNode,
  ExtendedHeadingNode,
  extendedHeadingNodeReplacement,
  QuoteNode,
  ExtendedQuoteNode,
  extendedQuoteNodeReplacement,
  ListNode,
  ListItemNode,
  AsideNode,
  LinkNode,
  CodeBlockNode,
  HorizontalRuleNode,
  ImageNode,
  AudioNode,
  VideoNode,
  CalloutNode,
  HtmlNode,
  FileNode,
  ButtonNode,
  ToggleNode,
  HeaderNode,
  BookmarkNode,
  GalleryNode,
  TKNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
]

for (const node of RAW_NODES) {
  ensureLexicalNodeOwnMethods(node)
}

const DEFAULT_NODES = RAW_NODES

export default DEFAULT_NODES
