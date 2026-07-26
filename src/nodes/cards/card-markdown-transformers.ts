import type { ElementTransformer, MultilineElementTransformer } from '@lexical/markdown'
import type { Klass, LexicalNode } from 'lexical'

import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'
import type { GalleryImage } from '@/types/gallery'

import { $createAudioNode, type AudioNode } from '@/nodes/AudioNode'
import { $createBookmarkNode, type BookmarkNode } from '@/nodes/BookmarkNode'
import { $createButtonNode, type ButtonNode } from '@/nodes/ButtonNode'
import { $createCalloutNode, type CalloutNode } from '@/nodes/CalloutNode'
import { type CardNodeType } from '@/nodes/cards'
import { CARD_WRAPPER_NODES } from '@/nodes/cards/card-wrappers'
import { $createFileNode, type FileNode } from '@/nodes/FileNode'
import { $createGalleryNode, type GalleryNode } from '@/nodes/GalleryNode'
import { $createHtmlNode, type HtmlNode } from '@/nodes/HtmlNode'
import { $createImageNode, $isImageNode, ImageNode } from '@/nodes/ImageNode'
import { $createToggleNode, type ToggleNode } from '@/nodes/ToggleNode'
import { $createVideoNode, type VideoNode } from '@/nodes/VideoNode'

/**
 * The per-card markdown transformer vocabulary, attached to the card
 * declarations one layer up (mirroring `@/nodes/cards/card-wrappers`): a
 * payload table keyed by card node type, projected into the card transformers
 * by `CARD_MARKDOWN_DECLARATIONS` below.
 *
 * It cannot live in the declaration modules: the markdown round-trip
 * editor registers the wrapper node classes — `DEFAULT_TRANSFORMERS`' `HR`
 * and `CODE_BLOCK` construct wrapper instances, and Lexical requires every
 * node constructed inside an editor to match the registered class exactly —
 * so each transformer's `createNode`/`replace` must construct the wrapper
 * class. Declarations are React-free and must never import wrappers.
 */

/**
 * The named fence exception: image speaks standard `![alt](src)` markdown, so
 * its transformer is a hand-written element transformer, not a projected
 * `inkling:image` fence transformer.
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

/**
 * One card's ` ```inkling:<card>``` ` fence vocabulary — the only per-card
 * knowledge the payload table carries: which node fields the fence body holds
 * (`getData`) and how to rebuild the node from the parsed body (`createNode`).
 * The fence tag and the constructed class are deliberately NOT part of the
 * vocabulary: the projection derives them from the declaration's own
 * `nodeType` and wrapper class, so they can never drift from the registry.
 * Exported for `defineCard` (`@/nodes/cards/host-cards`): a host card's
 * `markdownFence` speaks the same vocabulary.
 *
 * The method-shorthand signatures keep each table entry's `getData` parameter
 * at the card's own node type (method parameters are bivariant under
 * `strictFunctionTypes`); the projection consumes the widened `LexicalNode`
 * signature.
 */
export interface CardFencePayload {
  getData(node: LexicalNode): Record<string, unknown>
  createNode(data: Record<string, unknown>): LexicalNode
}

/**
 * Builds one card's fence transformer from the declaration-derived fence tag
 * (`card`) and wrapper class (`nodeClass`) plus the card's payload vocabulary.
 * Every node the transformer constructs gets its declared nested editors
 * detached (`$detachNestedEditorsForRoundTrip`), so a fence-imported card
 * keeps the payload's plain-text fields verbatim. Exported for `defineCard`
 * (`@/nodes/cards/host-cards`), which builds host fence transformers through
 * the same path with the assembled host class as `nodeClass`.
 */
export function createCardTransformer({
  card,
  nodeClass,
  getData,
  createNode,
}: {
  card: string
  nodeClass: Klass<LexicalNode>
  getData: (node: LexicalNode) => Record<string, unknown>
  createNode: (data: Record<string, unknown>) => LexicalNode
}): MultilineElementTransformer {
  return {
    dependencies: [nodeClass],
    export: (node) => {
      if (!(node instanceof nodeClass)) {
        return null
      }
      const data = getData(node)
      return '```inkling:' + card + '\n' + JSON.stringify(data) + '\n```'
    },
    regExpEnd: /^```\s*$/,
    regExpStart: new RegExp('^```inkling:' + card + '\\s*$'),
    replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, _isImport) => {
      const raw = linesInBetween?.join('\n') ?? ''
      const data: Record<string, unknown> = raw.trim() ? JSON.parse(raw) : {}
      const node = createNode(data)
      $detachNestedEditorsForRoundTrip(node)
      rootNode.append(node)
    },
    type: 'multiline-element',
  }
}

const NO_NESTED_EDITOR_SPECS: readonly NestedEditorSpec[] = []

// Mirrors `getNestedEditorSpecs` in `@/nodes/base/generate-decorator-node`
// (module-private there, so not importable): reads the adopted
// `static nestedEditors` spec off the node's actual class; spec-less classes
// yield no entries.
function getNestedEditorSpecs(node: LexicalNode): readonly NestedEditorSpec[] {
  return (node.constructor as { nestedEditors?: readonly NestedEditorSpec[] }).nestedEditors ?? NO_NESTED_EDITOR_SPECS
}

/**
 * Detaches a markdown-imported card's nested editors: nulls every `__<name>`
 * field the class's adopted `nestedEditors` spec declares. The fence payload
 * carries the card's text as plain data properties; a live nested editor
 * would re-serialize its HTML over those properties on `exportJSON`
 * (`serializeNestedEditorHtml`). Runs on the freshly constructed node inside
 * the transformer's `replace`, before it is appended.
 */
function $detachNestedEditorsForRoundTrip(node: LexicalNode): void {
  const target = node as unknown as Record<string, unknown>
  getNestedEditorSpecs(node).forEach((spec) => {
    target[`__${spec.name}`] = null
  })
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

const CARD_FENCE_PAYLOADS: Partial<Record<CardNodeType, CardFencePayload>> = {
  audio: {
    getData: (node: AudioNode) => ({
      src: node.src,
      caption: node.title,
    }),
    createNode: (data) =>
      $createAudioNode({
        src: str(data.src, 'audio.src'),
        title: str(data.caption, 'audio.caption'),
      }),
  },
  bookmark: {
    getData: (node: BookmarkNode) => ({
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
  },
  button: {
    getData: (node: ButtonNode) => ({
      buttonUrl: node.buttonUrl,
      buttonText: node.buttonText,
    }),
    createNode: (data) =>
      $createButtonNode({
        buttonUrl: str(data.buttonUrl, 'button.buttonUrl'),
        buttonText: str(data.buttonText, 'button.buttonText'),
      }),
  },
  callout: {
    getData: (node: CalloutNode) => ({
      text: node.calloutText,
      backgroundColor: node.backgroundColor,
    }),
    createNode: (data) =>
      $createCalloutNode({
        calloutText: str(data.text, 'callout.text'),
        backgroundColor: str(data.backgroundColor, 'callout.backgroundColor'),
      }),
  },
  file: {
    getData: (node: FileNode) => ({
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
  },
  gallery: {
    getData: (node: GalleryNode) => ({
      // mid-upload images carry no `src` yet; skip them rather than export `undefined`
      images: node.images.flatMap((image) => (typeof image.src === 'string' ? [{ src: image.src }] : [])),
      caption: node.caption,
    }),
    createNode: (data) =>
      $createGalleryNode({
        images: galleryImages(data.images, 'gallery.images'),
        caption: str(data.caption, 'gallery.caption'),
      }),
  },
  html: {
    getData: (node: HtmlNode) => ({ html: node.html }),
    createNode: (data) => $createHtmlNode({ html: str(data.html, 'html.html') }),
  },
  toggle: {
    getData: (node: ToggleNode) => ({
      heading: node.heading,
      content: node.content,
    }),
    createNode: (data) =>
      $createToggleNode({
        heading: str(data.heading, 'toggle.heading'),
        content: str(data.content, 'toggle.content'),
      }),
  },
  video: {
    getData: (node: VideoNode) => ({
      src: node.src,
      caption: node.caption,
      thumbnailSrc: node.thumbnailSrc,
    }),
    createNode: (data) =>
      $createVideoNode({
        src: str(data.src, 'video.src'),
        caption: str(data.caption, 'video.caption'),
        thumbnailSrc: str(data.thumbnailSrc, 'video.thumbnailSrc'),
      }),
  },
}

/**
 * The markdown-eligible cards with no `inkling:<card>` fence payload:
 * `codeblock` and `horizontalrule` speak plain markdown (the dialect's own
 * CODE_FENCE in `@/markdown/round-trip`; `HR` in `@/markdown/transformers`),
 * and `image` speaks standard `![alt](src)` syntax via the hand-written
 * IMAGE_CARD_TRANSFORMER above.
 */
export const MARKDOWN_EXEMPT: ReadonlySet<CardNodeType> = new Set<CardNodeType>([
  'codeblock',
  'horizontalrule',
  'image',
])

/**
 * Wrapper-layer projection of the card declarations: each declaration paired
 * with its wrapper node class and (for markdown-eligible cards whose markdown
 * form is not covered by `DEFAULT_TRANSFORMERS`) its card transformer.
 * `@/markdown/round-trip` derives `MARKDOWN_NODES` and `CARD_TRANSFORMERS`
 * from this list.
 *
 * The fence tag and node class are derived by construction — the projection
 * passes the declaration's own `nodeType` and wrapper class to
 * `createCardTransformer`, so the table above states only the per-card
 * payload vocabulary. A markdown-eligible card with neither a fence payload
 * nor a named exemption throws here at module init rather than drifting
 * silently.
 */
export const CARD_MARKDOWN_DECLARATIONS = CARD_WRAPPER_NODES.map((card) => {
  const payload = CARD_FENCE_PAYLOADS[card.nodeType]
  if (card.markdown && !payload && !MARKDOWN_EXEMPT.has(card.nodeType)) {
    throw new Error(
      `[card-markdown-transformers] '${card.nodeType}' is markdown-eligible but has no fence payload or named exemption`,
    )
  }
  const markdownTransformer = payload
    ? createCardTransformer({ card: card.nodeType, nodeClass: card.node, ...payload })
    : card.nodeType === 'image'
      ? IMAGE_CARD_TRANSFORMER
      : undefined
  return { ...card, markdownTransformer }
})
