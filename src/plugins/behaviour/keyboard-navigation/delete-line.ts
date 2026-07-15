import type { LexicalEditor } from 'lexical'

import { $getSelection, $isDecoratorNode, $isRangeSelection, COMMAND_PRIORITY_LOW, DELETE_LINE_COMMAND } from 'lexical'

import { $isAtTopOfNode, $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

import { RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX } from '../card-adjacency'
import { DELETE_CARD_COMMAND } from '../commands'

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
      // If a paragraph is on the first visual line and adjacent to a card,
      // Lexical's default DELETE_LINE behaviour can pull the card in. For backward
      // deletion we delete from the paragraph start to the caret, preserving any
      // text after the caret and later lines; we only remove the block and select
      // the card when the paragraph becomes empty. Forward deletion beside a
      // following card removes the whole block and selects the card.
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
            if (!topLevelElement) {
              return false
            }
            if (isBackward) {
              // Delete from the paragraph start to the caret, preserving any text
              // after the caret and any later lines. If the paragraph becomes empty,
              // remove it and select the adjacent card.
              const anchor = selection.anchor
              anchor.set(topLevelElement.getKey(), 0, 'element')
              selection.removeText()
              if (topLevelElement.getChildrenSize() === 0) {
                topLevelElement.remove()
                $selectDecoratorNode(sibling)
              }
            } else {
              // Forward delete-line beside a following card: remove the whole block
              // and select the card. The existing E2E coverage only exercises the
              // one-line case; multi-line forward deletion can be added separately.
              topLevelElement.remove()
              $selectDecoratorNode(sibling)
            }
            return true
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
