import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createToggleNode, INSERT_TOGGLE_COMMAND, ToggleNode, type ToggleNodeDataset } from '@/nodes/ToggleNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isToggleNodeDataset(value: unknown): value is ToggleNodeDataset {
  return typeof value === 'object' && value !== null
}

export const TogglePlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([ToggleNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_TOGGLE_COMMAND,
        (dataset) => {
          if (!isToggleNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createToggleNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode, openInEditMode: true })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default TogglePlugin
