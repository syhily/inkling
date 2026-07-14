import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH } from 'lexical'
import React from 'react'

import {
  $createBookmarkNode,
  BookmarkNode,
  type BookmarkNodeDataset,
  INSERT_BOOKMARK_COMMAND,
} from '@/nodes/BookmarkNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isBookmarkNodeDataset(value: unknown): value is BookmarkNodeDataset {
  return typeof value === 'object' && value !== null
}

export const BookmarkPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([BookmarkNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_BOOKMARK_COMMAND,
        (dataset) => {
          const selection = $getSelection()

          if (!$isRangeSelection(selection)) {
            return false
          }

          if (!isBookmarkNodeDataset(dataset)) {
            return false
          }

          const focusNode = selection.focus.getNode()
          if (focusNode !== null) {
            const cardNode = $createBookmarkNode(dataset)
            editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode })
          }

          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor])

  return null
}

export default BookmarkPlugin
