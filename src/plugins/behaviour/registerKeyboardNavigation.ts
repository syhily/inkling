import type { LexicalEditor } from 'lexical'

import { $isListItemNode } from '@lexical/list'
import { mergeRegister } from '@lexical/utils'
import {
  $createNodeSelection,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical'

import { $createCodeBlockNode } from '@/nodes/CodeBlockNode'

import type { KeyboardNavigationDeps } from './keyboard-navigation/types'

import { SELECT_CARD_COMMAND } from './commands'
import {
  registerArrowDownCommand,
  registerArrowLeftCommand,
  registerArrowRightCommand,
  registerArrowUpCommand,
} from './keyboard-navigation/arrows'
import { registerBackspaceCommand } from './keyboard-navigation/backspace'
import { registerDeleteCommand } from './keyboard-navigation/delete'
import { registerDeleteLineCommand } from './keyboard-navigation/delete-line'
import { registerEnterCommand } from './keyboard-navigation/enter'
import { registerKeyDownPassthrough } from './keyboard-navigation/key-down'
import { registerModifierCommand } from './keyboard-navigation/modifier'

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
    registerDeleteCommand(editor, deps),
    registerDeleteLineCommand(editor, deps),
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
