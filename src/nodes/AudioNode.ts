import type { AudioData } from '@/nodes/base/nodes/audio/AudioNode'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { audioDeclaration } from '@/nodes/cards/audio.declaration'

export { $isAudioNode } from '@/nodes/base/nodes/audio/AudioNode'
export { INSERT_AUDIO_COMMAND } from '@/nodes/cards/card-commands'

export type AudioNodeDataset = AudioData & {
  initialFile?: File
  triggerFileDialog?: boolean
}

/**
 * The registered class is assembled from the card declaration, and
 * `$isAudioNode` is canonical on the base node. The instance type carries
 * the spec-derived `__*` field map (names and value types from the
 * declaration's spec via CardSpecFieldMap), so `$createAudioNode`
 * constructs the assembled class — which initializes the transient-prop
 * spec — with no cast.
 */
export const AudioNode = assembleCardNodeOnce(audioDeclaration)
export type AudioNode = InstanceType<typeof AudioNode>

export const $createAudioNode = (dataset: AudioNodeDataset): AudioNode => {
  // the transient fields are initialized by the constructor from the dataset
  return new AudioNode(dataset)
}
