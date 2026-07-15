import type { LexicalEditor } from 'lexical'

import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, KEY_DELETE_COMMAND } from 'lexical'

import { $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

import { $getLogicallyAdjacentCard, editorOwnsFocus } from '../card-adjacency'
import { DELETE_CARD_COMMAND } from '../commands'

export function registerDeleteCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { store, isNested } = deps

  return editor.registerCommand(
    KEY_DELETE_COMMAND,
    (event) => {
      // avoid processing card behaviours when an inner element has focus
      if (!editorOwnsFocus(editor)) {
        return true
      }

      // delete selected card if we have one
      const { selectedCardKey } = store.getState()
      if (!isNested && selectedCardKey) {
        event?.preventDefault()
        editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey: selectedCardKey, direction: 'forward' })
        return true
      }

      // handle card selection around card boundaries
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          const anchor = selection?.anchor
          const anchorNode = anchor.getNode()
          const topLevelElement = anchorNode.getTopLevelElement()

          const onEmptyNode = topLevelElement?.getTextContent().trim() === '' && selection?.anchor.offset === 0

          // from-mode, not selection-mode: selection-mode's 'next' boundary requires an
          // element anchor at offset === getChildrenSize(), which a whitespace-only block
          // with zero-text children (e.g. a lone LineBreakNode, caret at element offset 0)
          // does not satisfy — this site still removes the block and selects the card there
          const nextCardSibling = topLevelElement ? $getLogicallyAdjacentCard('next', topLevelElement) : null

          if (onEmptyNode && nextCardSibling) {
            // delete the empty node and select the next card
            event?.preventDefault()
            topLevelElement?.remove()
            $selectDecoratorNode(nextCardSibling)
            return true
          }

          // selection-mode 'next' is gated on exactly the atEndOfNode derivation
          // previously inlined here (element anchor at children size, or text anchor
          // at the end of the parent's last child)
          const nextCard = $getLogicallyAdjacentCard('next')
          if (nextCard) {
            // delete the card, keeping selection in place
            event?.preventDefault()
            nextCard.remove()
            return true
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
