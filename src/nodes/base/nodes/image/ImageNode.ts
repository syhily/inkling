import type { CardImportSpec } from '@/nodes/base/import-spec'

import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { renderImageNode } from '@/nodes/base/nodes/image/image-renderer'
import { readImageAttributesFromElement } from '@/nodes/base/utils/read-image-attributes-from-element'

const imageProperties = [
  { name: 'src', default: '', urlType: 'url' },
  { name: 'caption', default: '', urlType: 'html', wordCount: true },
  { name: 'title', default: '' },
  { name: 'alt', default: '' },
  { name: 'cardWidth', default: 'regular' },
  { name: 'width', default: null as number | null },
  { name: 'height', default: null as number | null },
  { name: 'href', default: '', urlType: 'url' },
] as const satisfies readonly DecoratorNodeProperty[]

export const imageImportSpec = {
  conversions: [
    {
      tag: 'img',
      priority: 1,
      reads: [
        {
          name: 'imageAttributes',
          kind: 'composite',
          read: readImageAttributesFromElement,
          provides: ['src', 'width', 'height', 'alt', 'title', 'href'],
        },
      ],
    },
    {
      tag: 'figure',
      // generically parses figure elements, so it must run after others (like the gallery)
      priority: 0,
      guardSelector: 'img',
      reads: [
        {
          name: 'imageAttributes',
          kind: 'composite',
          selector: 'img',
          read: readImageAttributesFromElement,
          provides: ['src', 'width', 'height', 'alt', 'title', 'href'],
        },
        {
          name: 'cardWidth',
          kind: 'classMap',
          classMap: [
            { pattern: /inkling-width-(wide|full)/ },
            { pattern: /graf--layout(FillWidth|OutsetCenter)/, map: { FillWidth: 'full', OutsetCenter: 'wide' } },
          ],
        },
        { name: 'caption', kind: 'caption', fallback: '' },
      ],
    },
  ],
} satisfies CardImportSpec

export type ImageData = DecoratorNodeData<typeof imageProperties>

export interface BaseImageNode extends DecoratorNodeValueMap<typeof imageProperties> {}

export class BaseImageNode extends generateDecoratorNode({
  nodeType: 'image',
  properties: imageProperties,
  defaultRenderFn: renderImageNode,
  importSpec: imageImportSpec,
}) {
  /* @override */
  exportJSON() {
    // Hand-written rather than derived from the generated exportJSON: the
    // persisted key order below (width/height before title/alt/caption) is
    // historical and differs from `imageProperties` order, and payloads must
    // stay byte-identical. The blob guard is the card-specific logic — an
    // upload-in-progress data-string src must not be persisted.
    // checks if src is a data string
    const { src, width, height, title, alt, caption, cardWidth, href } = this
    const isBlob = src && src.startsWith('data:')

    // serializeNestedEditorHtml re-serializes the caption editor for wrapper
    // subclasses that adopt a `nestedEditors` spec; a no-op on the base class
    return this.serializeNestedEditorHtml({
      type: 'image',
      version: 1,
      src: isBlob ? '<base64String>' : src,
      width,
      height,
      title,
      alt,
      caption,
      cardWidth,
      href,
    })
  }

  // The transient-prop spec (image.declaration.ts) initializes this only on
  // spec-adopting assembled classes; a raw `new BaseImageNode()` leaves it unset,
  // so `undefined` is part of the honest type for spec-less base instances
  declare __previewSrc: string | null | undefined
  // see `__previewSrc` — same spec-adoption lifecycle
  declare __triggerFileDialog: boolean | undefined

  get previewSrc() {
    const self = this.getLatest()
    return self.__previewSrc
  }

  set previewSrc(previewSrc: string | null | undefined) {
    const writable = this.getWritable()
    writable.__previewSrc = previewSrc
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  hasEditMode() {
    return false
  }
}

export const $createBaseImageNode = (dataset?: ImageData) => {
  return new BaseImageNode(dataset)
}

export function $isImageNode(node: unknown): node is BaseImageNode {
  return node instanceof BaseImageNode
}
