import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createVideoNode, INSERT_VIDEO_COMMAND, VideoNode, type VideoNodeDataset } from '@/nodes/VideoNode'
import { INSERT_MEDIA_COMMAND } from '@/plugins/DragDropPastePlugin'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isVideoNodeDataset(value: unknown): value is VideoNodeDataset {
  return typeof value === 'object' && value !== null
}

export const VideoPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([VideoNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_VIDEO_COMMAND,
        (dataset) => {
          if (!isVideoNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createVideoNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_MEDIA_COMMAND,
        (dataset) => {
          if (dataset.type === 'video') {
            editor.dispatchCommand(INSERT_VIDEO_COMMAND, { initialFile: dataset.file })
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

export default VideoPlugin
