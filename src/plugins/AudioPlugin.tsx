import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createAudioNode, AudioNode, type AudioNodeDataset, INSERT_AUDIO_COMMAND } from '@/nodes/AudioNode'
import { INSERT_MEDIA_COMMAND } from '@/plugins/DragDropPastePlugin'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isAudioNodeDataset(value: unknown): value is AudioNodeDataset {
  return typeof value === 'object' && value !== null
}

export const AudioPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([AudioNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_AUDIO_COMMAND,
        (dataset) => {
          if (!isAudioNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createAudioNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_MEDIA_COMMAND,
        (dataset) => {
          if (dataset.type === 'audio') {
            editor.dispatchCommand(INSERT_AUDIO_COMMAND, { initialFile: dataset.file })
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor])

  return null
}

export default AudioPlugin
