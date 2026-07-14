import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createHeaderNode, HeaderNode, type HeaderNodeDataset, INSERT_HEADER_COMMAND } from '@/nodes/HeaderNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isHeaderNodeDataset(value: unknown): value is HeaderNodeDataset {
  return typeof value === 'object' && value !== null
}

export const HeaderPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([HeaderNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_HEADER_COMMAND,
        (dataset) => {
          if (!isHeaderNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createHeaderNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode, openInEditMode: true })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  })

  return null
}

export default HeaderPlugin
