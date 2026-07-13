import type { ElementTransformer, MultilineElementTransformer } from '@lexical/markdown'
import type { Klass, LexicalEditor, LexicalNode } from 'lexical'

import { $createAudioNode, AudioNode } from '@/nodes/AudioNode'
import { $createBookmarkNode, BookmarkNode } from '@/nodes/BookmarkNode'
import { $createButtonNode, ButtonNode } from '@/nodes/ButtonNode'
import { $createCalloutNode, CalloutNode } from '@/nodes/CalloutNode'
import { $createFileNode, FileNode } from '@/nodes/FileNode'
import { $createGalleryNode, GalleryNode } from '@/nodes/GalleryNode'
import { $createHtmlNode, HtmlNode } from '@/nodes/HtmlNode'
import { $createImageNode, $isImageNode, ImageNode } from '@/nodes/ImageNode'
import { $createToggleNode, ToggleNode } from '@/nodes/ToggleNode'
import { $createVideoNode, VideoNode } from '@/nodes/VideoNode'

export const IMAGE_CARD_TRANSFORMER: ElementTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null
    }
    return `![${node.alt || ''}](${node.src})`
  },
  regExp: /^!\[([^\]]*)\]\(([^)]+)\)$/,
  replace: (parentNode, _children, match, _isImport) => {
    const [, alt, src] = match
    const node = $createImageNode({ src, alt, caption: '' })
    parentNode.replace(node)
  },
  type: 'element',
}

function createCardTransformer<T extends LexicalNode>({
  card,
  nodeClass,
  getData,
  createNode,
}: {
  card: string
  nodeClass: Klass<T>
  getData: (node: T) => Record<string, unknown>
  createNode: (data: Record<string, unknown>) => T
}): MultilineElementTransformer {
  return {
    dependencies: [nodeClass],
    export: (node) => {
      if (!(node instanceof nodeClass)) {
        return null
      }
      const data = getData(node as T)
      return '```inkling:' + card + '\n' + JSON.stringify(data) + '\n```'
    },
    regExpEnd: /^```\s*$/,
    regExpStart: new RegExp('^```inkling:' + card + '\\s*$'),
    replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, _isImport) => {
      const raw = linesInBetween?.join('\n') ?? ''
      const data = raw.trim() ? JSON.parse(raw) : {}
      rootNode.append(createNode(data))
    },
    type: 'multiline-element',
  }
}

export const HTML_CARD_TRANSFORMER = createCardTransformer({
  card: 'html',
  nodeClass: HtmlNode,
  getData: (node) => ({ html: node.html }),
  createNode: (data) => $createHtmlNode({ html: data.html as string }),
})

export const FILE_CARD_TRANSFORMER = createCardTransformer({
  card: 'file',
  nodeClass: FileNode,
  getData: (node) => ({
    src: node.src,
    fileName: node.fileName,
    fileCaption: node.fileCaption,
  }),
  createNode: (data) =>
    $createFileNode({
      src: data.src as string,
      fileName: data.fileName as string,
      fileCaption: data.fileCaption as string,
    }),
})

export const BUTTON_CARD_TRANSFORMER = createCardTransformer({
  card: 'button',
  nodeClass: ButtonNode,
  getData: (node) => ({
    buttonUrl: node.buttonUrl,
    buttonText: node.buttonText,
  }),
  createNode: (data) =>
    $createButtonNode({
      buttonUrl: data.buttonUrl as string,
      buttonText: data.buttonText as string,
    }),
})

export const AUDIO_CARD_TRANSFORMER = createCardTransformer({
  card: 'audio',
  nodeClass: AudioNode,
  getData: (node) => ({
    src: node.src,
    caption: node.title,
  }),
  createNode: (data) =>
    $createAudioNode({
      src: data.src as string,
      title: data.caption as string,
    }),
})

export const VIDEO_CARD_TRANSFORMER = createCardTransformer({
  card: 'video',
  nodeClass: VideoNode,
  getData: (node) => ({
    src: node.src,
    caption: node.caption,
    thumbnailSrc: node.thumbnailSrc,
  }),
  createNode: (data) => {
    const node = $createVideoNode({
      src: data.src as string,
      caption: data.caption as string,
      thumbnailSrc: data.thumbnailSrc as string,
    })
    // Keep caption as plain text for round-trip; don't serialise the nested editor HTML.
    ;(node as unknown as { __captionEditor: LexicalEditor | null }).__captionEditor = null
    return node
  },
})

export const GALLERY_CARD_TRANSFORMER = createCardTransformer({
  card: 'gallery',
  nodeClass: GalleryNode,
  getData: (node) => ({
    images: node.images.map((image) => ({ src: (image as { src: string }).src })),
    caption: node.caption,
  }),
  createNode: (data) => {
    const node = $createGalleryNode({
      images: data.images as Array<{ src: string }>,
      caption: data.caption as string,
    })
    // Keep caption as plain text for round-trip; don't serialise the nested editor HTML.
    ;(node as unknown as { __captionEditor: LexicalEditor | null }).__captionEditor = null
    return node
  },
})

export const BOOKMARK_CARD_TRANSFORMER = createCardTransformer({
  card: 'bookmark',
  nodeClass: BookmarkNode,
  getData: (node) => ({
    url: node.url,
    title: node.title,
    description: node.description,
  }),
  createNode: (data) =>
    $createBookmarkNode({
      url: data.url as string,
      metadata: {
        title: data.title as string,
        description: data.description as string,
      },
    }),
})

export const TOGGLE_CARD_TRANSFORMER = createCardTransformer({
  card: 'toggle',
  nodeClass: ToggleNode,
  getData: (node) => ({
    heading: node.heading,
    content: node.content,
  }),
  createNode: (data) => {
    const node = $createToggleNode({
      heading: data.heading as string,
      content: data.content as string,
    })
    // Keep heading/content as plain text for round-trip; nested markdown is deferred.
    ;(node as unknown as { __titleEditor: LexicalEditor | null }).__titleEditor = null
    ;(node as unknown as { __contentEditor: LexicalEditor | null }).__contentEditor = null
    return node
  },
})

export const CALLOUT_CARD_TRANSFORMER = createCardTransformer({
  card: 'callout',
  nodeClass: CalloutNode,
  getData: (node) => ({
    text: node.calloutText,
    backgroundColor: node.backgroundColor,
  }),
  createNode: (data) => {
    const node = $createCalloutNode({
      calloutText: data.text as string,
      backgroundColor: data.backgroundColor as string,
    })
    // Keep callout text as plain text for round-trip; nested markdown is deferred.
    ;(node as unknown as { __calloutTextEditor: LexicalEditor | null }).__calloutTextEditor = null
    return node
  },
})
