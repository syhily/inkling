import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { generateDecoratorNode, type DecoratorNodeProperty } from '@/nodes/base/generate-decorator-node'
import { parseBookmarkNode } from '@/nodes/base/nodes/bookmark/bookmark-parser'
import { renderBookmarkNode } from '@/nodes/base/nodes/bookmark/bookmark-renderer'

interface BookmarkMetadata {
  icon?: string
  title?: string
  description?: string
  author?: string
  publisher?: string
  thumbnail?: string
}

export interface BookmarkData {
  url?: string
  metadata?: BookmarkMetadata
  caption?: string
}

export interface BookmarkNode {
  title: string
  description: string
  url: string
  caption: string
  author: string
  publisher: string
  icon: string
  thumbnail: string
}

const BOOKMARK_METADATA_KEYS: ReadonlySet<string> = new Set([
  'icon',
  'title',
  'description',
  'author',
  'publisher',
  'thumbnail',
])

function isBookmarkMetadataKey(key: string): key is keyof BookmarkMetadata {
  return BOOKMARK_METADATA_KEYS.has(key)
}

// importJSON receives untrusted JSON: keep only the string fields the
// BookmarkMetadata shape declares instead of asserting the whole payload
function asBookmarkMetadata(value: unknown): BookmarkMetadata | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const metadata: BookmarkMetadata = {}
  for (const [key, field] of Object.entries(value)) {
    if (isBookmarkMetadataKey(key) && typeof field === 'string') {
      metadata[key] = field
    }
  }
  return metadata
}

const bookmarkProperties = [
  { name: 'title', default: '', wordCount: true },
  { name: 'description', default: '', wordCount: true },
  { name: 'url', default: '', urlType: 'url', wordCount: true },
  { name: 'caption', default: '', wordCount: true },
  { name: 'author', default: '' },
  { name: 'publisher', default: '' },
  { name: 'icon', urlPath: 'metadata.icon', default: '', urlType: 'url' },
  { name: 'thumbnail', urlPath: 'metadata.thumbnail', default: '', urlType: 'url' },
] as const satisfies readonly DecoratorNodeProperty[]

export class BookmarkNode extends generateDecoratorNode({
  nodeType: 'bookmark',
  properties: bookmarkProperties,
  defaultRenderFn: renderBookmarkNode,
}) {
  // the generated class exposes the backing fields through its index
  // signature as unknown; the constructor below initializes all of them to
  // strings, so declare them (the ImageNode.__previewSrc idiom) and the
  // getDataset reads need no casts
  declare __title: string
  declare __description: string
  declare __url: string
  declare __caption: string
  declare __author: string
  declare __publisher: string
  declare __icon: string
  declare __thumbnail: string

  static importDOM() {
    return parseBookmarkNode(this)
  }

  /* override */
  constructor({ url, metadata, caption, captionEditor }: BookmarkData & CaptionEditorDataset = {}, key?: string) {
    // Forward the caption and a passed-in caption editor so the generated
    // constructor can run the nested-editor setup/populate for wrapper
    // subclasses that adopt a `nestedEditors` spec (a no-op on this class).
    // __caption is set by super from the same value (?? '' matches || '' for
    // the string-typed dataset); the metadata remap below covers the keys
    // super never received.
    super({ caption, captionEditor } as Partial<BookmarkData>, key)
    this.__url = url || ''
    this.__icon = metadata?.icon || ''
    this.__title = metadata?.title || ''
    this.__description = metadata?.description || ''
    this.__author = metadata?.author || ''
    this.__publisher = metadata?.publisher || ''
    this.__thumbnail = metadata?.thumbnail || ''
  }

  /* @override */
  getDataset(): Record<string, unknown> {
    const self = this.getLatest()
    // appendNestedEditorDataset adds the caption editor keys for wrapper
    // subclasses that adopt a `nestedEditors` spec; a no-op on this class
    return this.appendNestedEditorDataset({
      url: self.__url,
      metadata: {
        icon: self.__icon,
        title: self.__title,
        description: self.__description,
        author: self.__author,
        publisher: self.__publisher,
        thumbnail: self.__thumbnail,
      },
      caption: self.__caption,
    })
  }

  /* @override */
  static importJSON(serializedNode: Record<string, unknown>) {
    const { url, metadata, caption } = serializedNode
    const node = new this({
      url: typeof url === 'string' ? url : '',
      metadata: asBookmarkMetadata(metadata),
      caption: typeof caption === 'string' ? caption : '',
    })
    return node
  }

  /* @override */
  exportJSON() {
    // serializeNestedEditorHtml re-serializes the caption editor for wrapper
    // subclasses that adopt a `nestedEditors` spec; a no-op on this class
    return this.serializeNestedEditorHtml({
      type: 'bookmark',
      version: 1,
      url: this.url,
      metadata: {
        icon: this.icon,
        title: this.title,
        description: this.description,
        author: this.author,
        publisher: this.publisher,
        thumbnail: this.thumbnail,
      },
      caption: this.caption,
    })
  }

  isEmpty() {
    return !this.url
  }
}

export const $createBookmarkNode = (dataset: BookmarkData = {}) => {
  return new BookmarkNode(dataset)
}

export function $isBookmarkNode(node: unknown): node is BookmarkNode {
  return node instanceof BookmarkNode
}
