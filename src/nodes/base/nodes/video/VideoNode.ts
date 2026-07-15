import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { parseVideoNode } from '@/nodes/base/nodes/video/video-parser'
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

export type VideoData = DecoratorNodeData<typeof videoProperties>

export interface VideoNode extends DecoratorNodeValueMap<typeof videoProperties> {}

export class VideoNode extends generateDecoratorNode({
  nodeType: 'video',
  properties: videoProperties,
  defaultRenderFn: renderVideoNode,
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

  static importDOM() {
    return parseVideoNode(this)
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
    const minutes = Math.floor(this.duration / 60)
    const seconds = Math.floor(this.duration - minutes * 60)
    const paddedSeconds = String(seconds).padStart(2, '0')
    const formattedDuration = `${minutes}:${paddedSeconds}`
    return formattedDuration
  }
}

export const $createVideoNode = (dataset?: VideoData) => {
  return new VideoNode(dataset)
}

export function $isVideoNode(node: unknown): node is VideoNode {
  return node instanceof VideoNode
}
