import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createCalloutNode, CalloutNode, type CalloutNodeDataset, INSERT_CALLOUT_COMMAND } from '@/nodes/CalloutNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isCalloutNodeDataset(value: unknown): value is CalloutNodeDataset {
  return typeof value === 'object' && value !== null
}

export const CalloutPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([CalloutNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_CALLOUT_COMMAND,
        (dataset) => {
          if (!isCalloutNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createCalloutNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode, openInEditMode: true })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default CalloutPlugin
