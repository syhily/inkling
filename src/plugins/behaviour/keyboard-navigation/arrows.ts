import type { LexicalEditor } from 'lexical'

import {
  $createParagraphNode,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical'

import { $isInklingCard } from '@/nodes/base'
import { $isAtStartOfDocument, $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

import { $getLogicallyAdjacentCard, $getVisuallyAdjacentCard, editorOwnsFocus } from '../card-adjacency'
import { $extendSelectionAcrossCardBoundary, $selectCardFromCaptionArrow } from './selection-extension'

export function registerArrowUpCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { store, cursorDidExitAtTop } = deps

  return editor.registerCommand(
    KEY_ARROW_UP_COMMAND,
    (event) => {
      const selection = $getSelection()

      // if a selection is being made, we need to handle it ourselves (lexical does not handle decorator nodes at this time)
      if (event?.shiftKey) {
        if ($isRangeSelection(selection)) {
          return $extendSelectionAcrossCardBoundary('up', selection, event)
        }
        // use default behavior for other selection
        return false
      }

      // if we're in a nested editor, we need to move selection back to the parent editor
      const { selectedCardKey } = store.getState()
      if ($selectCardFromCaptionArrow(editor, selectedCardKey, event)) {
        return true
      }

      // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
      if (!editorOwnsFocus(editor)) {
        return true
      }

      if ($isNodeSelection(selection)) {
        const currentNode = selection.getNodes()[0]
        if (!currentNode) {
          return false
        }
        const previousSibling = currentNode.getPreviousSibling()

        if (!previousSibling && cursorDidExitAtTop) {
          selection.clear()
          cursorDidExitAtTop()
          return true
        }

        const previousCard = $getLogicallyAdjacentCard('previous', currentNode)
        if (previousCard) {
          $selectDecoratorNode(previousCard)
          return true
        }

        // move cursor to end of previous node
        event?.preventDefault()
        previousSibling?.selectEnd()
        return true
      }

      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          if (cursorDidExitAtTop && $isAtStartOfDocument(selection)) {
            cursorDidExitAtTop()
            return true
          }

          const previousCard = $getVisuallyAdjacentCard('up')
          if (previousCard) {
            $selectDecoratorNode(previousCard)
            return true
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}

export function registerArrowDownCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { store } = deps

  return editor.registerCommand(
    KEY_ARROW_DOWN_COMMAND,
    (event) => {
      const selection = $getSelection()

      // if a selection is being made, we need to handle it ourselves (lexical does not handle decorator nodes at this time)
      if (event?.shiftKey) {
        if ($isRangeSelection(selection)) {
          return $extendSelectionAcrossCardBoundary('down', selection, event)
        }
        // use default behavior for other selection
        return false
      }

      // if we're in a nested editor, we need to move selection back to the parent editor
      const { selectedCardKey } = store.getState()
      if ($selectCardFromCaptionArrow(editor, selectedCardKey, event)) {
        return true
      }

      // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
      if (!editorOwnsFocus(editor)) {
        return true
      }

      if ($isNodeSelection(selection)) {
        const currentNode = selection.getNodes()[0]
        if (!currentNode) {
          return false
        }
        const nextSibling = currentNode.getNextSibling()

        // create a new paragraph and select it if selected card is at end of document
        if (!nextSibling) {
          const paragraph = $createParagraphNode()
          currentNode.insertAfter(paragraph)
          paragraph.select()
          return true
        }

        // if next sibling is a card, select it (default Lexical behaviour skips over cards)
        const nextCard = $getLogicallyAdjacentCard('next', currentNode)
        if (nextCard) {
          $selectDecoratorNode(nextCard)
          return true
        }

        // move cursor to start of next node
        event?.preventDefault()
        nextSibling.selectStart()
        return true
      }

      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          const nextCard = $getVisuallyAdjacentCard('down')
          if (nextCard) {
            $selectDecoratorNode(nextCard)
            return true
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}

export function registerArrowLeftCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { cursorDidExitAtTop } = deps

  return editor.registerCommand(
    KEY_ARROW_LEFT_COMMAND,
    (event) => {
      // avoid processing card behaviours when an inner element has focus
      if (!editorOwnsFocus(editor)) {
        return true
      }

      const selection = $getSelection()

      if (cursorDidExitAtTop) {
        if ($isNodeSelection(selection)) {
          const currentNode = selection.getNodes()[0]
          if (!currentNode) {
            return false
          }
          const previousSibling = currentNode.getPreviousSibling()

          if (!previousSibling) {
            event?.preventDefault()
            selection.clear()
            cursorDidExitAtTop()
            return true
          }
        } else if (selection && $isAtStartOfDocument(selection)) {
          event?.preventDefault()
          cursorDidExitAtTop()
          return true
        }
      }

      if (!$isNodeSelection(selection)) {
        return false
      }

      const firstNode = selection.getNodes()[0]
      if (!firstNode) {
        return false
      }
      // non-card selections resolve their top-level element; cards resolve themselves
      const referenceNode = $isInklingCard(firstNode) ? firstNode : firstNode.getTopLevelElement()
      const previousCard = referenceNode ? $getLogicallyAdjacentCard('previous', referenceNode) : null

      if (previousCard) {
        event?.preventDefault()
        $selectDecoratorNode(previousCard)
        return true
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}

export function registerArrowRightCommand(editor: LexicalEditor, _deps: KeyboardNavigationDeps): () => void {
  return editor.registerCommand(
    KEY_ARROW_RIGHT_COMMAND,
    (event) => {
      // avoid processing card behaviours when an inner element has focus
      if (!editorOwnsFocus(editor)) {
        return true
      }

      const selection = $getSelection()

      if (!$isNodeSelection(selection)) {
        return false
      }

      const selectedNodes = selection.getNodes()
      const lastNode = selectedNodes[selectedNodes.length - 1]
      if (!lastNode) {
        return false
      }

      // cards resolve themselves; other selections resolve their top-level element
      const referenceNode = $isInklingCard(lastNode) ? lastNode : lastNode.getTopLevelElement()
      const nextCard = referenceNode ? $getLogicallyAdjacentCard('next', referenceNode) : null

      if (nextCard) {
        event?.preventDefault()
        $selectDecoratorNode(nextCard)
        return true
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
