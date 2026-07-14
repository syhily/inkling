import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createGalleryNode, GalleryNode, type GalleryNodeDataset, INSERT_GALLERY_COMMAND } from '@/nodes/GalleryNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isGalleryNodeDataset(value: unknown): value is GalleryNodeDataset {
  return typeof value === 'object' && value !== null
}

export const GalleryPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([GalleryNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_GALLERY_COMMAND,
        (dataset) => {
          if (!isGalleryNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createGalleryNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default GalleryPlugin
