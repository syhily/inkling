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
import { $isAtStartOfDocument, $isAtTopOfNode, $selectDecoratorNode, getTopLevelNativeElement } from '@/utils'

import type { CardKeyboardEvent } from '../types'
import type { KeyboardNavigationDeps } from './types'

import { $selectCard, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX } from '../utils'

export function registerArrowUpCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey, cursorDidExitAtTop } = deps

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
      if (selectedCardKey && (event as CardKeyboardEvent)?._fromCaptionEditor) {
        $selectCard(editor, selectedCardKey)
        return true
      }

      // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
      if (document.activeElement !== editor.getRootElement()) {
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

        if (previousSibling && $isDecoratorNode(previousSibling)) {
          $selectDecoratorNode(previousSibling)
          return true
        }

        // move cursor to end of previous node
        event?.preventDefault()
        previousSibling?.selectEnd()
        return true
      }

      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          const topLevelElement = selection?.anchor.getNode().getTopLevelElement()
          const nativeSelection: Selection | null = window.getSelection()

          if (cursorDidExitAtTop && $isAtStartOfDocument(selection)) {
            cursorDidExitAtTop()
            return true
          }

          // empty paragraphs are odd because the native range won't
          // have a rect to compare positioning
          const onEmptyNode = topLevelElement?.getTextContent().trim() === '' && selection?.anchor.offset === 0

          const atStartOfElement = selection?.anchor.offset === 0 && selection.focus.offset === 0

          if (onEmptyNode || atStartOfElement) {
            const previousSibling = topLevelElement?.getPreviousSibling()
            if (previousSibling && $isDecoratorNode(previousSibling)) {
              $selectDecoratorNode(previousSibling)
              return true
            }
          } else if (nativeSelection) {
            const atTopOfNode = $isAtTopOfNode(nativeSelection, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX)
            if (atTopOfNode) {
              const previousSibling = topLevelElement?.getPreviousSibling()
              if (previousSibling && $isDecoratorNode(previousSibling)) {
                $selectDecoratorNode(previousSibling)
                return true
              }
            }
          }
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}

export function registerArrowDownCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey } = deps

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
      if (selectedCardKey && (event as CardKeyboardEvent)?._fromCaptionEditor) {
        $selectCard(editor, selectedCardKey)
        return true
      }

      // avoid processing card behaviours when an inner element has focus (e.g. nested editors)
      if (document.activeElement !== editor.getRootElement()) {
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
        if ($isDecoratorNode(nextSibling)) {
          $selectDecoratorNode(nextSibling)
          return true
        }

        // move cursor to end of previous node
        event?.preventDefault()
        nextSibling.selectStart()
        return true
      }

      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          const topLevelElement = selection?.anchor.getNode().getTopLevelElement()
          const nativeSelection: Selection | null = window.getSelection()
          if (!nativeSelection) {
            return false
          }
          const nativeTopLevelElement = getTopLevelNativeElement(nativeSelection.anchorNode)

          // empty paragraphs are odd because the native range won't
          // have a rect to compare positioning
          const onEmptyNode = topLevelElement?.getTextContent().trim() === '' && selection?.anchor.offset === 0

          const atEndOfElement =
            nativeSelection?.rangeCount !== 0 &&
            nativeSelection.anchorNode === nativeTopLevelElement &&
            nativeTopLevelElement &&
            nativeSelection.anchorOffset === nativeTopLevelElement.children.length - 1 &&
            nativeSelection.focusOffset === nativeTopLevelElement.children.length - 1

          if (onEmptyNode || atEndOfElement) {
            const nextSibling = topLevelElement?.getNextSibling()
            if (nextSibling && $isDecoratorNode(nextSibling)) {
              $selectDecoratorNode(nextSibling)
              return true
            }
          } else {
            const range = nativeSelection?.getRangeAt(0)?.cloneRange()
            if (!range) {
              return false
            }
            const rects = range.getClientRects()

            if (rects.length > 0) {
              // rects.length will be 2 if at the start/end of a line and we should default to the new/second line for
              //  determining if a card is below the cursor
              const rangeRect = rects.length > 1 ? rects[1] : rects[0]
              if (!nativeTopLevelElement) {
                return false
              }
              const elemRect = nativeTopLevelElement.getBoundingClientRect()

              if (Math.abs(rangeRect.bottom - elemRect.bottom) < RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX) {
                const nextSibling = topLevelElement?.getNextSibling()
                if (nextSibling && $isDecoratorNode(nextSibling)) {
                  $selectDecoratorNode(nextSibling)
                  return true
                }
              }
            }
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
      if (document.activeElement !== editor.getRootElement()) {
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
      let previousSibling

      if (!$isInklingCard(firstNode)) {
        const topLevelElement = firstNode.getTopLevelElement()
        previousSibling = topLevelElement?.getPreviousSibling()
      } else {
        previousSibling = firstNode.getPreviousSibling()
      }

      if (previousSibling && $isDecoratorNode(previousSibling)) {
        event?.preventDefault()
        $selectDecoratorNode(previousSibling)
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
      if (document.activeElement !== editor.getRootElement()) {
        return true
      }

      const selection = $getSelection()

      if (!$isNodeSelection(selection)) {
        return false
      }

      const selectedNodes = selection.getNodes()
      const lastNode = selectedNodes[selectedNodes.length - 1]

      let nextSibling
      if ($isInklingCard(lastNode)) {
        nextSibling = lastNode.getNextSibling()
      } else {
        const topLevelElement = lastNode.getTopLevelElement()
        nextSibling = topLevelElement?.getNextSibling()
      }

      if (nextSibling && $isDecoratorNode(nextSibling)) {
        event?.preventDefault()
        $selectDecoratorNode(nextSibling)
        return true
      }

      return false
    },
    COMMAND_PRIORITY_LOW,
  )
}
