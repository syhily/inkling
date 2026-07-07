import type { LexicalEditor } from 'lexical'

import { $createLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $createTextNode, $getSelection, $insertNodes, $isRangeSelection, COMMAND_PRIORITY_LOW } from 'lexical'

import { $createBookmarkNode } from '@/nodes/BookmarkNode'

import { INSERT_CARD_COMMAND, PASTE_LINK_COMMAND } from './commands'

interface LinkMatchingDeps {
  isShiftPressed: { current: boolean }
}

export function registerLinkMatching(editor: LexicalEditor, deps: LinkMatchingDeps) {
  const { isShiftPressed } = deps

  return editor.registerCommand(
    PASTE_LINK_COMMAND,
    ({ linkMatch }) => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) {
        return false
      }
      const selectionContent = selection.getTextContent()
      const node = selection.anchor.getNode()
      const nodeContent = node.getTextContent()

      if (selectionContent.length > 0) {
        const url = linkMatch[1]
        if (url) {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url, rel: null })
        }
        return true
      }

      // if a link is pasted in a populated text node or pasted with Shift pressed, insert a link
      if (nodeContent.length > 0 || isShiftPressed.current === true) {
        const link = linkMatch[1]
        if (!link) {
          return false
        }
        const linkNode = $createLinkNode(link)
        const linkTextNode = $createTextNode(link)
        linkNode.append(linkTextNode)

        // add a space after to avoid the rest of the text being linked when inserting
        // then immediately remove as we don't want the extra space
        // Workaround for Lexical link insertion cursor positioning (reviewed
        // against Lexical 0.46.0). Inserting a trailing space and immediately
        // removing it ensures the selection lands after the link node rather
        // than inside it.
        const spaceTextNode = $createTextNode(' ')
        $insertNodes([linkNode, spaceTextNode])
        spaceTextNode.remove()

        return true
      }

      // if a link is pasted in a blank text node, insert an embed card (may turn into bookmark)
      if (selectionContent.length === 0 && nodeContent.length === 0) {
        const url = linkMatch[1]
        if (!url) {
          return false
        }
        // $createEmbedNode does not exist in this codebase; the embed path is dead code.
        // Insert a bookmark node as the closest available replacement.
        const bookmarkNode = $createBookmarkNode({ url })
        editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode: bookmarkNode })
        return true
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
