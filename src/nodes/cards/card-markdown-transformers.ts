import type { ElementTransformer, MultilineElementTransformer, Transformer } from '@lexical/markdown'
import type { Klass, LexicalNode } from 'lexical'

import type { GalleryImage } from '@/types/gallery'

import { $createAudioNode, AudioNode } from '@/nodes/AudioNode'
import { $createBookmarkNode, BookmarkNode } from '@/nodes/BookmarkNode'
import { $createButtonNode, ButtonNode } from '@/nodes/ButtonNode'
import { $createCalloutNode, CalloutNode } from '@/nodes/CalloutNode'
import { type CardNodeType } from '@/nodes/cards'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { $createFileNode, FileNode } from '@/nodes/FileNode'
import { $createGalleryNode, GalleryNode } from '@/nodes/GalleryNode'
import { $createHtmlNode, HtmlNode } from '@/nodes/HtmlNode'
import { $createImageNode, $isImageNode, ImageNode } from '@/nodes/ImageNode'
import { $createToggleNode, ToggleNode } from '@/nodes/ToggleNode'
import { $createVideoNode, VideoNode } from '@/nodes/VideoNode'

/**
 * The per-card markdown transformers, attached to their card declarations
 * one layer up (mirroring `@/nodes/cards/card-wrappers`).
 *
 * They cannot live in the declaration modules: the markdown round-trip
 * editor registers the wrapper node classes — `DEFAULT_TRANSFORMERS`' `HR`
 * and `CODE_BLOCK` construct wrapper instances, and Lexical requires every
 * node constructed inside an editor to match the registered class exactly —
 * so each transformer's `createNode`/`replace` must construct the wrapper
 * class. Declarations are React-free and must never import wrappers.
 */
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
      const data: Record<string, unknown> = raw.trim() ? JSON.parse(raw) : {}
      rootNode.append(createNode(data))
    },
    type: 'multiline-element',
  }
}

// `createNode` receives JSON.parse output from the card fence body: validate
// the fields it reads instead of asserting them, so malformed markdown throws
// a clear TypeError at the transformer boundary naming the card and field
// instead of failing confusingly downstream (the same honest-boundary idiom
// as asBookmarkMetadata in base/nodes/bookmark/BookmarkNode.ts).
function describeValue(value: unknown): string {
  return value === null ? 'null' : Array.isArray(value) ? 'an array' : typeof value
}

function str(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`card markdown transformer: expected '${field}' to be a string, got ${describeValue(value)}`)
  }
  return value
}

function galleryImages(value: unknown, field: string): GalleryImage[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`card markdown transformer: expected '${field}' to be an array, got ${describeValue(value)}`)
  }
  return value.map((image, index) => {
    if (typeof image !== 'object' || image === null || Array.isArray(image)) {
      throw new TypeError(
        `card markdown transformer: expected '${field}[${index}]' to be an object, got ${describeValue(image)}`,
      )
    }
    return image as GalleryImage
  })
}

export const HTML_CARD_TRANSFORMER = createCardTransformer({
  card: 'html',
  nodeClass: HtmlNode,
  getData: (node) => ({ html: node.html }),
  createNode: (data) => $createHtmlNode({ html: str(data.html, 'html.html') }),
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
      src: str(data.src, 'file.src'),
      fileName: str(data.fileName, 'file.fileName'),
      fileCaption: str(data.fileCaption, 'file.fileCaption'),
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
      buttonUrl: str(data.buttonUrl, 'button.buttonUrl'),
      buttonText: str(data.buttonText, 'button.buttonText'),
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
      src: str(data.src, 'audio.src'),
      title: str(data.caption, 'audio.caption'),
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
      src: str(data.src, 'video.src'),
      caption: str(data.caption, 'video.caption'),
      thumbnailSrc: str(data.thumbnailSrc, 'video.thumbnailSrc'),
    })
    // Keep caption as plain text for round-trip; don't serialise the nested editor HTML.
    node.__captionEditor = null
    return node
  },
})

export const GALLERY_CARD_TRANSFORMER = createCardTransformer({
  card: 'gallery',
  nodeClass: GalleryNode,
  getData: (node) => ({
    // mid-upload images carry no `src` yet; skip them rather than export `undefined`
    images: node.images.flatMap((image) => (typeof image.src === 'string' ? [{ src: image.src }] : [])),
    caption: node.caption,
  }),
  createNode: (data) => {
    const node = $createGalleryNode({
      images: galleryImages(data.images, 'gallery.images'),
      caption: str(data.caption, 'gallery.caption'),
    })
    // Keep caption as plain text for round-trip; don't serialise the nested editor HTML.
    node.__captionEditor = null
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
      url: str(data.url, 'bookmark.url'),
      metadata: {
        title: str(data.title, 'bookmark.title'),
        description: str(data.description, 'bookmark.description'),
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
      heading: str(data.heading, 'toggle.heading'),
      content: str(data.content, 'toggle.content'),
    })
    // Keep heading/content as plain text for round-trip; nested markdown is deferred.
    node.__titleEditor = null
    node.__contentEditor = null
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
      calloutText: str(data.text, 'callout.text'),
      backgroundColor: str(data.backgroundColor, 'callout.backgroundColor'),
    })
    // Keep callout text as plain text for round-trip; nested markdown is deferred.
    node.__calloutTextEditor = null
    return node
  },
})

const CARD_TRANSFORMERS_BY_TYPE: Partial<Record<CardNodeType, Transformer>> = {
  audio: AUDIO_CARD_TRANSFORMER,
  bookmark: BOOKMARK_CARD_TRANSFORMER,
  button: BUTTON_CARD_TRANSFORMER,
  callout: CALLOUT_CARD_TRANSFORMER,
  file: FILE_CARD_TRANSFORMER,
  gallery: GALLERY_CARD_TRANSFORMER,
  html: HTML_CARD_TRANSFORMER,
  image: IMAGE_CARD_TRANSFORMER,
  toggle: TOGGLE_CARD_TRANSFORMER,
  video: VIDEO_CARD_TRANSFORMER,
}

/**
 * Wrapper-layer projection of the card declarations: each declaration paired
 * with its wrapper node class and (for markdown-eligible cards whose markdown
 * form is not covered by `DEFAULT_TRANSFORMERS`) its card transformer.
 * `@/markdown/round-trip` derives `MARKDOWN_NODES` and `CARD_TRANSFORMERS`
 * from this list.
 */
export const CARD_MARKDOWN_DECLARATIONS = CARD_WRAPPER_NODES.map((card) => ({
  ...card,
  markdownTransformer: CARD_TRANSFORMERS_BY_TYPE[card.nodeType],
}))
