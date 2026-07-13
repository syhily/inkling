import type { LexicalEditor } from 'lexical'

import { $isListItemNode } from '@lexical/list'
import { mergeRegister } from '@lexical/utils'
import {
  $createNodeSelection,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_LINE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical'

import { $createCodeBlockNode } from '@/nodes/CodeBlockNode'
import { $isAtTopOfNode, $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './keyboard-navigation/types'

import { DELETE_CARD_COMMAND, SELECT_CARD_COMMAND } from './commands'
import {
  registerArrowDownCommand,
  registerArrowLeftCommand,
  registerArrowRightCommand,
  registerArrowUpCommand,
} from './keyboard-navigation/arrows'
import { registerBackspaceCommand } from './keyboard-navigation/backspace'
import { registerEnterCommand } from './keyboard-navigation/enter'
import { registerKeyDownPassthrough } from './keyboard-navigation/key-down'
import { registerModifierCommand } from './keyboard-navigation/modifier'
import { RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX } from './utils'

export function registerKeyboardNavigation(editor: LexicalEditor, deps: KeyboardNavigationDeps) {
  const { selectedCardKey, isEditingCard, isNested, cursorDidExitAtTop } = deps

  return mergeRegister(
    registerKeyDownPassthrough(editor, deps),
    registerEnterCommand(editor, deps),
    registerArrowUpCommand(editor, deps),
    registerArrowDownCommand(editor, deps),
    registerArrowLeftCommand(editor, deps),
    registerArrowRightCommand(editor, deps),
    registerModifierCommand(editor, deps),
    // backspace when card isn't selected
    registerBackspaceCommand(editor, deps),
    editor.registerCommand(
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
    ),
    editor.registerCommand(
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
            const isFirstLine =
              nativeSelection && $isAtTopOfNode(nativeSelection, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX)

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
    ),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        // avoid processing card behaviours when an inner element has focus
        if (document.activeElement !== editor.getRootElement()) {
          return true
        }

        // exit the editor if we're shift tabbing on an element that isn't tabbed
        if (event?.shiftKey && cursorDidExitAtTop) {
          const selection = $getSelection()

          if ($isNodeSelection(selection)) {
            event.preventDefault()
            selection.clear()
            cursorDidExitAtTop()
            return true
          }

          let nodes
          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const anchorNode = selection?.anchor.getNode()
            nodes = $isTextNode(anchorNode) ? [anchorNode.getParent()] : [anchorNode]
          } else if ($isRangeSelection(selection)) {
            nodes = selection.getNodes()
          } else {
            return false
          }

          const hasIndentedNode = nodes.some((node) => {
            return node && $isElementNode(node) && node.getIndent() > 0
          })

          if (!hasIndentedNode) {
            event.preventDefault()
            cursorDidExitAtTop()
            return true
          }
        }

        // code card shortcut
        if (!isNested && event) {
          const selection = $getSelection()
          const currentNode = selection?.getNodes()[0]
          if ($isTextNode(currentNode)) {
            const textContent = currentNode.getTextContent()
            if (textContent.match(/^```(\w{1,10})?/)) {
              event.preventDefault()
              const language = textContent.replace(/^```/, '')
              const topLevelElement = currentNode.getTopLevelElement()
              if (!topLevelElement) {
                return false
              }
              const replacementNode = topLevelElement.insertAfter(
                $createCodeBlockNode({ language, _openInEditMode: true }),
              )
              topLevelElement.remove()

              // select node when replacing so it immediately renders in editing mode
              const replacementSelection = $createNodeSelection()
              replacementSelection.add(replacementNode.getKey())
              $setSelection(replacementSelection)
              return true
            }
          }

          // handle indent behavior
          if ($isListItemNode(currentNode) || ($isTextNode(currentNode) && $isListItemNode(currentNode.getParent()))) {
            event.preventDefault()
            let node = $isTextNode(currentNode) ? currentNode.getParent() : currentNode
            if (!node) {
              return false
            }
            const indent = node.getIndent()
            if (event.shiftKey) {
              if (indent > 0) {
                node.setIndent(indent - 1)
              }
            } else {
              node.setIndent(indent + 1)
            }
            return true
          }

          // generally prevent tabs from leaving the editor/interacting with the browser
          event.preventDefault()
          return true
        }

        return false
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (selectedCardKey && isEditingCard) {
          ;(editor._parentEditor || editor).dispatchCommand(SELECT_CARD_COMMAND, {
            cardKey: selectedCardKey,
          })
        }

        if (editor._parentEditor) {
          editor._parentEditor.getRootElement()?.focus()
        }

        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
  )
}
