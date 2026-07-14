import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createButtonNode, ButtonNode, type ButtonNodeDataset, INSERT_BUTTON_COMMAND } from '@/nodes/ButtonNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isButtonNodeDataset(value: unknown): value is ButtonNodeDataset {
  return typeof value === 'object' && value !== null
}

export const ButtonPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([ButtonNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_BUTTON_COMMAND,
        (dataset) => {
          if (!isButtonNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createButtonNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode, openInEditMode: true })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default ButtonPlugin
