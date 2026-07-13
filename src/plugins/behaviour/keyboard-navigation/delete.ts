import type { LexicalEditor } from 'lexical'

import {
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
} from 'lexical'

import { $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

import { DELETE_CARD_COMMAND } from '../commands'

export function registerDeleteCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey, isNested } = deps

  return editor.registerCommand(
    KEY_DELETE_COMMAND,
    (event) => {
      // avoid processing card behaviours when an inner element has focus
      if (document.activeElement !== editor.getRootElement()) {
        return true
      }

      // delete selected card if we have one
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
          const nextSibling = topLevelElement?.getNextSibling()

          const onEmptyNode = topLevelElement?.getTextContent().trim() === '' && selection?.anchor.offset === 0

          if (onEmptyNode && nextSibling && $isDecoratorNode(nextSibling)) {
            // delete the empty node and select the previous card
            event?.preventDefault()
            topLevelElement?.remove()
            $selectDecoratorNode(nextSibling)
            return true
          }

          const atEndOfNode =
            (anchor.type === 'element' &&
              $isElementNode(anchorNode) &&
              anchor.offset === anchorNode.getChildrenSize()) ||
            (anchor.type === 'text' &&
              anchor.offset === anchorNode.getTextContentSize() &&
              anchor.getNode().getParent()?.getLastChild()?.is(anchor.getNode()))

          if (atEndOfNode && nextSibling && $isDecoratorNode(nextSibling)) {
            // delete the card, keeping selection in place
            event?.preventDefault()
            nextSibling.remove()
            return true
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
