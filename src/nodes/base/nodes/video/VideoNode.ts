import type { CardImportSpec } from '@/nodes/base/import-spec'

import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { formatVideoDuration } from '@/nodes/base/nodes/video/format-video-duration'
import { renderVideoNode } from '@/nodes/base/nodes/video/video-renderer'

const videoProperties = [
  { name: 'src', default: '', urlType: 'url' },
  { name: 'caption', default: '', urlType: 'html', wordCount: true },
  { name: 'fileName', default: '' },
  { name: 'mimeType', default: '' },
  { name: 'width', default: null as number | null },
  { name: 'height', default: null as number | null },
  { name: 'duration', default: 0 },
  { name: 'thumbnailSrc', default: '', urlType: 'url' },
  { name: 'customThumbnailSrc', default: '', urlType: 'url' },
  { name: 'thumbnailWidth', default: null as number | null },
  { name: 'thumbnailHeight', default: null as number | null },
  { name: 'cardWidth', default: 'regular' },
  { name: 'loop', default: false },
] as const satisfies readonly DecoratorNodeProperty[]

export const videoImportSpec = {
  conversions: [
    {
      tag: 'figure',
      priority: 1,
      guardClass: 'inkling-video-card',
      reads: [
        // property reads, not attributes — `.src` absolutizes; required:
        // a card figure with no playable video aborts the conversion
        {
          name: 'src',
          kind: 'property',
          property: 'src',
          selector: '.inkling-video-container video',
          required: true,
        },
        { name: 'loop', kind: 'property', property: 'loop', selector: '.inkling-video-container video' },
        {
          name: 'cardWidth',
          kind: 'classMap',
          // token-anchored to reproduce the old classList.contains semantics
          // exactly (a `\b` pattern would also match `foo-inkling-width-full`)
          classMap: [
            { pattern: /(?:^|\s)inkling-width-(full)(?=\s|$)/ },
            { pattern: /(?:^|\s)inkling-width-(wide)(?=\s|$)/ },
          ],
          fallback: 'regular',
        },
        {
          name: 'duration',
          kind: 'html',
          selector: '.inkling-video-duration',
          trim: true,
          omit: 'falsy',
          // video's m:ss parse — deliberately not unified with audio's
          // Number/isInteger variant
          parse: (raw) => {
            const [rawMinutes, rawSeconds = '0'] = raw.split(':')
            const minutes = Number.parseInt(rawMinutes.trim(), 10)
            const seconds = Number.parseInt(rawSeconds.trim(), 10)
            return Number.isFinite(minutes) && Number.isFinite(seconds) ? minutes * 60 + seconds : undefined
          },
        },
        { name: 'thumbnailSrc', kind: 'attribute', attribute: 'data-inkling-thumbnail', omit: 'falsy' },
        { name: 'customThumbnailSrc', kind: 'attribute', attribute: 'data-inkling-custom-thumbnail', omit: 'falsy' },
        { name: 'caption', kind: 'caption', omit: 'falsy' },
        // truthy-guarded so a 0 width/height is excluded
        {
          name: 'width',
          kind: 'property',
          property: 'width',
          selector: '.inkling-video-container video',
          omit: 'falsy',
        },
        {
          name: 'height',
          kind: 'property',
          property: 'height',
          selector: '.inkling-video-container video',
          omit: 'falsy',
        },
      ],
    },
  ],
} satisfies CardImportSpec

export type VideoData = DecoratorNodeData<typeof videoProperties>

export interface VideoNode extends DecoratorNodeValueMap<typeof videoProperties> {}

export class VideoNode extends generateDecoratorNode({
  nodeType: 'video',
  properties: videoProperties,
  defaultRenderFn: renderVideoNode,
  importSpec: videoImportSpec,
}) {
  /* override */
  exportJSON() {
    const {
      src,
      caption,
      fileName,
      mimeType,
      width,
      height,
      duration,
      thumbnailSrc,
      customThumbnailSrc,
      thumbnailWidth,
      thumbnailHeight,
      cardWidth,
      loop,
    } = this
    // checks if src is a data string
    const isBlob = src && src.startsWith('data:')

    // serializeNestedEditorHtml re-serializes the caption editor for wrapper
    // subclasses that adopt a `nestedEditors` spec; a no-op on the base class
    return this.serializeNestedEditorHtml({
      type: 'video',
      version: 1,
      src: isBlob ? '<base64String>' : src,
      caption,
      fileName,
      mimeType,
      width,
      height,
      duration,
      thumbnailSrc,
      customThumbnailSrc,
      thumbnailWidth,
      thumbnailHeight,
      cardWidth,
      loop,
    })
  }

  // Editor-side upload behaviour the card spec doesn't cover lives on the
  // base node (plan 039, Batch 5): the registered card class is assembled
  // from the declaration and inherits it; renderer surfaces never invoke it.
  static uploadType = 'video'

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  get formattedDuration() {
    return formatVideoDuration(this.duration)
  }
}

export const $createVideoNode = (dataset?: VideoData) => {
  return new VideoNode(dataset)
}

export function $isVideoNode(node: unknown): node is VideoNode {
  return node instanceof VideoNode
}
