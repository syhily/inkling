import type { LexicalEditor } from 'lexical'

import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $createHeadingNode, $createQuoteNode, $isQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_MODIFIER_COMMAND,
} from 'lexical'

import { $createAsideNode, $isAsideNode } from '@/nodes/AsideNode'
import { $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

export function registerModifierCommand(editor: LexicalEditor, _deps: KeyboardNavigationDeps): () => void {
  return editor.registerCommand(
    KEY_MODIFIER_COMMAND,
    (event) => {
      const { altKey, ctrlKey, metaKey, shiftKey, code, key } = event
      const isArrowUp = key === 'ArrowUp' || event.keyCode === 38
      const isArrowDown = key === 'ArrowDown' || event.keyCode === 40

      if (metaKey && (isArrowUp || isArrowDown)) {
        const selection = $getSelection()
        const isNodeSelected = $isNodeSelection(selection)
        const firstChild = $getRoot().getFirstChild()
        const lastChild = $getRoot().getLastChild()
        const hasCardAtStart = firstChild !== null && $isDecoratorNode(firstChild)
        const hasCardAtEnd = lastChild !== null && $isDecoratorNode(lastChild)

        if (isNodeSelected || hasCardAtStart || hasCardAtEnd) {
          // meta+down on macos moves cursor to end of document
          if (isArrowDown) {
            event.preventDefault()

            if (lastChild !== null) {
              if ($isDecoratorNode(lastChild)) {
                $selectDecoratorNode(lastChild)
                return true
              } else {
                lastChild.selectEnd()
                return true
              }
            }
          }

          // meta+up on macos moves cursor to start of document
          if (isArrowUp) {
            event.preventDefault()

            if (firstChild !== null) {
              if ($isDecoratorNode(firstChild)) {
                $selectDecoratorNode(firstChild)
                return true
              } else {
                firstChild.selectStart()
                return true
              }
            }
          }
        }
      }

      if (ctrlKey && code === 'KeyQ') {
        // avoid quit behaviour
        event.preventDefault()

        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const firstNode = selection.anchor.getNode().getTopLevelElement()

          if ($isParagraphNode(firstNode)) {
            $setBlocksType(selection, () => $createQuoteNode())
          } else if ($isQuoteNode(firstNode)) {
            $setBlocksType(selection, () => $createAsideNode())
          } else if ($isAsideNode(firstNode)) {
            $setBlocksType(selection, () => $createParagraphNode())
          }
        }
      }

      // Ctrl+Option+H to toggle highlight
      if ((ctrlKey || metaKey) && altKey && code === 'KeyH') {
        event.preventDefault()
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight')
        return true
      }

      // ctrl shift K should format text as code
      if (ctrlKey && shiftKey && code === 'KeyK') {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
        return true
      }

      // ctrl alt U should strikethrough (cmd alt U launches the browser source view)
      if (ctrlKey && altKey && code === 'KeyU') {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
        return true
      }

      // ctrl alt 1-6 should create headings
      const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
      if (ctrlKey && altKey && key && /^[1-6]$/.test(key)) {
        event.preventDefault()

        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const headingIndex = Number(key) - 1
          $setBlocksType(selection, () => $createHeadingNode(HEADING_TAGS[headingIndex]))
        }
      }

      if (ctrlKey && code === 'KeyL') {
        event.preventDefault()

        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const firstNode = selection.anchor.getNode().getTopLevelElement()

          if ($isListNode(firstNode)) {
            editor.update(() => {
              const pNode = $createParagraphNode()
              $setBlocksType(selection, () => pNode)

              // Lexical will automatically indent the paragraph node to the
              // list item level but we don't allow indented paragraphs
              pNode.setIndent(0)
            })
          } else {
            if (altKey) {
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
            } else {
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
            }
          }
        }
      }
      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
