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

const imageAttributesRead = readImageAttributesFromElement as (element: HTMLElement) => Record<string, unknown>

export const imageImportSpec = {
  conversions: [
    {
      tag: 'img',
      priority: 1,
      reads: [
        {
          name: 'imageAttributes',
          kind: 'composite',
          read: imageAttributesRead,
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
          read: imageAttributesRead,
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

export interface ImageNode extends DecoratorNodeValueMap<typeof imageProperties> {}

export class ImageNode extends generateDecoratorNode({
  nodeType: 'image',
  properties: imageProperties,
  defaultRenderFn: renderImageNode,
  importSpec: imageImportSpec,
}) {
  /* @override */
  exportJSON() {
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

  // Editor-side upload behaviour the card spec doesn't cover lives on the
  // base node (plan 039, Batch 5): the registered card class is assembled
  // from the declaration and inherits it; renderer surfaces never invoke it.
  static uploadType = 'image'

  // The transient-prop spec (image.declaration.ts) initializes this only on
  // spec-adopting assembled classes; a raw `new ImageNode()` leaves it unset,
  // so `undefined` is part of the honest type for spec-less base instances
  declare __previewSrc: string | null | undefined

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

export const $createImageNode = (dataset?: ImageData) => {
  return new ImageNode(dataset)
}

export function $isImageNode(node: unknown): node is ImageNode {
  return node instanceof ImageNode
}
