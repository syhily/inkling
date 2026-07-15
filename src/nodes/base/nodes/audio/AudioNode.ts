import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { parseAudioNode } from '@/nodes/base/nodes/audio/audio-parser'
import { renderAudioNode } from '@/nodes/base/nodes/audio/audio-renderer'

const audioProperties = [
  { name: 'duration', default: 0 },
  { name: 'mimeType', default: '' },
  { name: 'src', default: '', urlType: 'url' },
  { name: 'title', default: '' },
  { name: 'thumbnailSrc', default: '' },
] as const satisfies readonly DecoratorNodeProperty[]

export type AudioData = DecoratorNodeData<typeof audioProperties>

// Named `BaseAudioNode` (not `AudioNode`) so the base class never shares a
// name with the DOM's global Web Audio `AudioNode` interface — declaration
// bundlers merge the global into their collision scope and mis-rename both.
export interface BaseAudioNode extends DecoratorNodeValueMap<typeof audioProperties> {}

export class BaseAudioNode extends generateDecoratorNode({
  nodeType: 'audio',
  properties: audioProperties,
  defaultRenderFn: renderAudioNode,
}) {
  // Editor-side upload behaviour the card spec doesn't cover lives on the
  // base node (plan 039, Batch 5): the registered card class is assembled
  // from the declaration and inherits it; renderer surfaces never invoke it.
  static uploadType = 'audio'

  static importDOM() {
    return parseAudioNode(this)
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }
}

export const $createAudioNode = (dataset: AudioData = {}) => {
  return new BaseAudioNode(dataset)
}

export function $isAudioNode(node: unknown): node is BaseAudioNode {
  return node instanceof BaseAudioNode
}
