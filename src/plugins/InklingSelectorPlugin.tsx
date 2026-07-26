import type { LexicalEditor } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, $getSelection, COMMAND_PRIORITY_LOW, createCommand } from 'lexical'
import React from 'react'

import GifPlugin from '@/components/ui/GifPlugin'
import LibraryPlugin from '@/components/ui/LibraryPlugin'
import { OPEN_GIF_SELECTOR_COMMAND, OPEN_IMAGE_LIBRARY_COMMAND } from '@/nodes/cards/card-commands'
import { $createImageNode, ImageNode, type ImageNodeDataset } from '@/nodes/ImageNode'
import { INSERT_CARD_COMMAND } from '@/plugins/behaviour/commands'

// defined with the other card commands (`@/nodes/cards/card-commands`);
// re-exported here to keep this module's public surface unchanged
export { OPEN_GIF_SELECTOR_COMMAND }

export const INSERT_FROM_GIF_COMMAND = createCommand<ImageNodeDataset>()
export const INSERT_FROM_LIBRARY_COMMAND = createCommand<ImageNodeDataset>()

// INSERT_FROM_GIF_COMMAND and INSERT_FROM_LIBRARY_COMMAND share one surgery
// (docs/kobato-fit-plan.md C8 §6): build the card from the picked dataset,
// insert it, and remove the placeholder node the selector overlay rode on.
// Both commands keep their own names so menu/analytics semantics stay
// distinct — if either ever diverges, split the function back out.
function insertFromSelectorDataset(dataset: ImageNodeDataset, editor: LexicalEditor): boolean {
  const imageNode = $createImageNode(dataset)

  const selection = $getSelection()
  if (!selection) {
    return false
  }
  const selectedNode = selection.getNodes()[0]
  if (!selectedNode) {
    return false
  }

  editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode: imageNode })
  selectedNode.remove()

  return true
}

export const InklingSelectorPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        OPEN_GIF_SELECTOR_COMMAND,
        (dataset) => {
          const cardNode = $createImageNode({
            ...dataset,
            selector: GifPlugin,
            isImageHidden: true,
          })

          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        OPEN_IMAGE_LIBRARY_COMMAND,
        (dataset) => {
          const cardNode = $createImageNode({
            ...dataset,
            selector: LibraryPlugin,
            isImageHidden: true,
          })

          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(INSERT_FROM_GIF_COMMAND, insertFromSelectorDataset, COMMAND_PRIORITY_LOW),
      editor.registerCommand(INSERT_FROM_LIBRARY_COMMAND, insertFromSelectorDataset, COMMAND_PRIORITY_LOW),
    )
  }, [editor])

  return null
}

export default InklingSelectorPlugin
