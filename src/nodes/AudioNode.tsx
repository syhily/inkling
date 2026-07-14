import { createCommand } from 'lexical'

import AudioCardIcon from '@/assets/icons/inkling-card-type-audio.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { AudioNodeComponent } from '@/nodes/AudioNodeComponent'
import { AudioNode as BaseAudioNode, type AudioData } from '@/nodes/base'

export type AudioNodeDataset = AudioData & {
  initialFile?: File
  triggerFileDialog?: boolean
}

export const INSERT_AUDIO_COMMAND = createCommand<AudioNodeDataset>()

export class AudioNode extends BaseAudioNode {
  __triggerFileDialog = false
  __initialFile: File | undefined = undefined

  static cardMenu = [
    {
      label: 'Audio',
      desc: 'Upload and play an audio file',
      Icon: AudioCardIcon,
      insertCommand: INSERT_AUDIO_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['audio'],
      priority: 14,
      shortcut: '/audio',
    },
  ]

  static uploadType = 'audio'

  constructor(dataset: AudioNodeDataset = {}, key?: string) {
    super(dataset, key)

    const { triggerFileDialog, initialFile } = dataset

    // don't trigger the file dialog when rendering if we've already been given a url
    this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false
    this.__initialFile = initialFile
  }

  getIcon() {
    return AudioCardIcon
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()}>
        <AudioNodeComponent
          duration={this.duration}
          initialFile={this.__initialFile}
          nodeKey={this.getKey()}
          src={this.src}
          thumbnailSrc={this.thumbnailSrc}
          title={this.title}
          triggerFileDialog={this.__triggerFileDialog}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createAudioNode = (dataset: AudioNodeDataset) => {
  return new AudioNode(dataset)
}

export function $isAudioNode(node: unknown): node is AudioNode {
  return node instanceof AudioNode
}
