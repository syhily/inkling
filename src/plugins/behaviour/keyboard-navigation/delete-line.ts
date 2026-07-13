import type { LexicalEditor } from 'lexical'

import {
  $getSelection,
  $isDecoratorNode,
  $isLineBreakNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_LINE_COMMAND,
} from 'lexical'

import { $isAtTopOfNode, $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

import { DELETE_CARD_COMMAND } from '../commands'
import { RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX } from '../utils'

export function registerDeleteLineCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey, isNested } = deps

  return editor.registerCommand(
    DELETE_LINE_COMMAND,
    (isBackward) => {
      // delete selected card if it's not a nested editor
      if (selectedCardKey && document.activeElement === editor.getRootElement() && !isNested) {
        editor.dispatchCommand(DELETE_CARD_COMMAND, {
          cardKey: selectedCardKey,
          direction: isBackward ? 'backward' : 'forward',
        })
        return true
      }

      // Avoid deleting a card accidentally:
      // If a paragraph contains only one line and is next to a card, then by default CMD + Backspace deletes the line + the sibling card
      // In that case, we avoid using the default `selection.deleteLine()` from Lexical
      // Instead, we remove the topLevelElement and put the selection on the sibling card
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          const anchor = selection?.anchor
          const anchorNode = anchor.getNode()
          const topLevelElement = anchorNode.getTopLevelElement()
          const previousSibling = topLevelElement?.getPreviousSibling()
          const nextSibling = topLevelElement?.getNextSibling()
          const sibling = isBackward ? previousSibling : nextSibling

          // Find out if the paragraph contains only one line
          const nativeSelection: Selection | null = window.getSelection()
          const isFirstLine = nativeSelection && $isAtTopOfNode(nativeSelection, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX)

          if (sibling && $isDecoratorNode(sibling) && isFirstLine) {
            if (isBackward && $isLineBreakNode(anchorNode.getNextSibling())) {
              anchorNode.remove()
              return true
            }
            topLevelElement?.remove()
            $selectDecoratorNode(sibling)

            return true
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
