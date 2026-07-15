import type { LexicalEditor } from 'lexical'

import {
  $createParagraphNode,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical'

import { $isInklingCard } from '@/nodes/base'
import { $isAtStartOfDocument, $selectDecoratorNode } from '@/utils'

import type { CardKeyboardEvent } from '../types'
import type { KeyboardNavigationDeps } from './types'

import { $getLogicallyAdjacentCard, $getVisuallyAdjacentCard, $selectCard, editorOwnsFocus } from '../card-adjacency'

export function registerArrowUpCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { store, cursorDidExitAtTop } = deps

  return editor.registerCommand(
    KEY_ARROW_UP_COMMAND,
    (event) => {
      const selection = $getSelection()

      // if a selection is being made, we need to handle it ourselves (lexical does not handle decorator nodes at this time)
      if (event?.shiftKey) {
        if ($isRangeSelection(selection)) {
          let anchorNode = selection?.anchor.getNode()

          if (!$isRootNode(anchorNode)) {
            const topLevelAnchor = anchorNode.getTopLevelElement()
            if (!topLevelAnchor) {
              return false
            }
            anchorNode = topLevelAnchor
            const focusNode = selection.focus.getNode().getTopLevelElement()

            // treat text nodes as normal
            let previousSibling = focusNode?.getPreviousSibling()
            if ($isTextNode(focusNode) && $isTextNode(previousSibling)) {
              return false
            }
            // if on or about to move to decorator node selection, select the entire current node using root node offsets
            if (
              anchorNode &&
              focusNode &&
              previousSibling &&
              ($isDecoratorNode(anchorNode) || $isDecoratorNode(previousSibling))
            ) {
              // if at the start of the line, treat that line/node as not selected
              if (selection?.anchor.offset === 0) {
                selection.focus.set('root', focusNode.getIndexWithinParent() - 1, 'element')
                selection?.anchor.set('root', anchorNode.getIndexWithinParent(), 'element')
              } else {
                selection.focus.set('root', focusNode.getIndexWithinParent(), 'element')
                selection?.anchor.set('root', anchorNode.getIndexWithinParent() + 1, 'element')
              }
              event.preventDefault()
              return true
            }
          }

          // if using the root node, simply add the card above
          if ($isRootNode(anchorNode)) {
            const offset = selection.focus.offset
            if (offset > 0) {
              selection.focus.set('root', selection.focus.offset - 1, 'element')
            }
            event.preventDefault()
            return true
          }
        }
        // use default behavior for other selection
        return false
      }

      // if we're in a nested editor, we need to move selection back to the parent editor
      const { selectedCardKey } = store.getState()
      if (selectedCardKey && (event as CardKeyboardEvent)?._fromCaptionEditor) {
        $selectCard(editor, selectedCardKey)
        return true
      }

      // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
      if (!editorOwnsFocus(editor)) {
        return true
      }

      if ($isNodeSelection(selection)) {
        const currentNode = selection.getNodes()[0]
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
          let anchorNode = selection?.anchor.getNode()

          if (!$isRootNode(anchorNode)) {
            const topLevelAnchor = anchorNode.getTopLevelElement()
            if (!topLevelAnchor) {
              return false
            }
            anchorNode = topLevelAnchor
            const focusNode = selection.focus.getNode().getTopLevelElement()

            // treat text nodes as normal
            let nextSibling = focusNode?.getNextSibling()
            if ($isTextNode(focusNode) && $isTextNode(nextSibling)) {
              return false
            }
            // if on or about to move to decorator node selection, select the entire current node using root node offsets
            if (
              anchorNode &&
              focusNode &&
              nextSibling &&
              ($isDecoratorNode(anchorNode) || $isDecoratorNode(nextSibling))
            ) {
              // if at end of a line, treat it as if that line/node is not selected
              if (selection?.anchor.offset === anchorNode.getTextContentSize()) {
                selection?.anchor.set('root', anchorNode.getIndexWithinParent() + 1, 'element')
                selection.focus.set('root', focusNode.getIndexWithinParent() + 2, 'element')
              } else {
                selection?.anchor.set('root', anchorNode.getIndexWithinParent(), 'element')
                selection.focus.set('root', focusNode.getIndexWithinParent() + 1, 'element')
              }
              event.preventDefault()
              return true
            }
          }

          // if using the root node, simply add the card below
          if ($isRootNode(anchorNode)) {
            const offset = selection.focus.offset
            const lastChild = anchorNode.getLastChildOrThrow()
            if (offset <= lastChild.getIndexWithinParent()) {
              selection.focus.set('root', selection.focus.offset + 1, 'element')
            }
            event.preventDefault()
            return true
          }
        }
        // use default behavior for other selection
        return false
      }

      // if we're in a nested editor, we need to move selection back to the parent editor
      const { selectedCardKey } = store.getState()
      if (selectedCardKey && (event as CardKeyboardEvent)?._fromCaptionEditor) {
        $selectCard(editor, selectedCardKey)
        return true
      }

      // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
      if (!editorOwnsFocus(editor)) {
        return true
      }

      if ($isNodeSelection(selection)) {
        const currentNode = selection.getNodes()[0]
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
