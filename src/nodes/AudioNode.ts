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
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and `$isAudioNode`
 * is canonical on the base node. `$createAudioNode` keeps constructing the
 * assembled class so the transient-prop spec is initialized.
 */
export const AudioNode = assembleCardNodeOnce(audioDeclaration)
export type AudioNode = InstanceType<typeof AudioNode> & {
  __triggerFileDialog: boolean
  __initialFile: File | undefined
}

export const $createAudioNode = (dataset: AudioNodeDataset): AudioNode => {
  // the transient fields are initialized by the constructor from the dataset
  return new AudioNode(dataset) as AudioNode
}
