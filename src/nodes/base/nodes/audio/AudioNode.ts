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
  static importDOM() {
    return parseAudioNode(this)
  }
}

export const $createAudioNode = (dataset: AudioData = {}) => {
  return new BaseAudioNode(dataset)
}

export function $isAudioNode(node: unknown): node is BaseAudioNode {
  return node instanceof BaseAudioNode
}
