import { type AudioData, BaseAudioNode } from '@/nodes/base'
import { audioDeclaration } from '@/nodes/cards/audio.declaration'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_AUDIO_COMMAND } from '@/nodes/cards/card-menus'

export type AudioNodeDataset = AudioData & {
  initialFile?: File
  triggerFileDialog?: boolean
}

export class AudioNode extends BaseAudioNode {
  // transient props live on the generated base class (static `transientProps`);
  // `declare` keeps these type-only so no field initializer clobbers the
  // values the base constructor computes from the dataset
  declare __triggerFileDialog: boolean
  declare __initialFile: File | undefined

  // adopt the card declaration's transient-prop spec
  static transientProps = audioDeclaration.transientProps

  static cardMenu = CARD_MENUS.audio

  static uploadType = 'audio'

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createAudioNode = (dataset: AudioNodeDataset) => {
  return new AudioNode(dataset)
}

export function $isAudioNode(node: unknown): node is AudioNode {
  return node instanceof AudioNode
}
