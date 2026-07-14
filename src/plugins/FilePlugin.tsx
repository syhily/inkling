import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createFileNode, FileNode, type FileNodeDataset, INSERT_FILE_COMMAND } from '@/nodes/FileNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isFileNodeDataset(value: unknown): value is FileNodeDataset {
  return typeof value === 'object' && value !== null
}

export const FilePlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([FileNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_FILE_COMMAND,
        (dataset) => {
          if (!isFileNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createFileNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default FilePlugin
