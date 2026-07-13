import type { LexicalEditor } from 'lexical'

import { $isLinkNode } from '@lexical/link'
import { $isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list'
import { $createHeadingNode, $createQuoteNode, $isQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { mergeRegister } from '@lexical/utils'
import {
  $createNodeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_LINE_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical'

import { $createAsideNode, $isAsideNode } from '@/nodes/AsideNode'
import { $isInklingCard } from '@/nodes/base'
import { $createCodeBlockNode } from '@/nodes/CodeBlockNode'
import { $isAtStartOfDocument, $isAtTopOfNode, $selectDecoratorNode, getTopLevelNativeElement } from '@/utils'

import type { KeyboardNavigationDeps } from './keyboard-navigation/types'
import type { CardKeyboardEvent } from './types'

import { DELETE_CARD_COMMAND, SELECT_CARD_COMMAND } from './commands'
import { registerKeyDownPassthrough } from './keyboard-navigation/key-down'
import { $selectCard, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX, SPECIAL_MARKUPS } from './utils'

export function registerKeyboardNavigation(editor: LexicalEditor, deps: KeyboardNavigationDeps) {
  const { selectedCardKey, isEditingCard, setIsEditingCard, isNested, cursorDidExitAtTop } = deps

  return mergeRegister(
    registerKeyDownPassthrough(editor, deps),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        // toggle edit mode if a card is selected and ctrl/cmd+enter is pressed
        if (selectedCardKey && event && (event.metaKey || event.ctrlKey)) {
          const cardNode = $getNodeByKey(selectedCardKey)

          if ($isInklingCard(cardNode) && cardNode.hasEditMode?.()) {
            event.preventDefault()

            // when leaving edit mode, ensure focus moves back to the editor
            // otherwise focus can be left on removed elements preventing further key events
            if (isEditingCard) {
              const rootElement = editor.getRootElement()
              if (rootElement) {
                rootElement.focus({ preventScroll: true })
              }

              if (cardNode.isEmpty?.()) {
                const lastChild = $getRoot().getLastChild()
                if (lastChild && lastChild.is(cardNode)) {
                  // we don't have anything to select after the card, so create a new paragraph
                  const paragraph = $createParagraphNode()
                  $getRoot().append(paragraph)
                  paragraph.select()
                } else {
                  // select the next paragraph or card directly rather than
                  // dispatching KEY_ARROW_DOWN_COMMAND, which can bail out
                  // when focus is still inside the card's nested editor and
                  // leave the selection on the removed card
                  const nextSibling = cardNode.getNextSibling()
                  if (nextSibling) {
                    if ($isDecoratorNode(nextSibling)) {
                      $selectDecoratorNode(nextSibling)
                    } else {
                      nextSibling.selectStart()
                    }
                  }
                }

                cardNode.remove()
              } else {
                // re-create the node selection because the focus will place the cursor at
                // the beginning of the doc
                $selectCard(editor, selectedCardKey)
              }

              setIsEditingCard(false)
            } else {
              setIsEditingCard(true)
            }

            return true
          }
        }

        // let the browser handle selection when in a card inner element (e.g. nested editor)
        // NOTE: must come after ctrl/cmd+enter because that always toggles no matter the selection
        if (event && !(event as CardKeyboardEvent)._fromNested && document.activeElement !== editor.getRootElement()) {
          return true
        }

        // if a card is selected, insert a new paragraph after it
        if (!isNested && selectedCardKey) {
          event?.preventDefault()
          const cardNode = $getNodeByKey(selectedCardKey)
          const paragraphNode = $createParagraphNode()
          if ($isInklingCard(cardNode)) {
            cardNode.insertAfter(paragraphNode)
            paragraphNode.select()
          }
          return true
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
        }

        return false
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
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
    ),
    editor.registerCommand(
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
    ),
    editor.registerCommand(
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
    ),
    editor.registerCommand(
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
    ),
    editor.registerCommand(
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
            const firstNode = selection?.anchor.getNode().getTopLevelElement()

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
            const firstNode = selection?.anchor.getNode().getTopLevelElement()

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
    ),
    // backspace when card isn't selected
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        // avoid processing card behaviours when an inner element has focus
        if (document.activeElement !== editor.getRootElement()) {
          return true
        }

        // delete selected card if we have one
        if (!isNested && selectedCardKey) {
          event?.preventDefault()
          editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey: selectedCardKey, direction: 'backward' })
          return true
        }

        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            const anchor = selection?.anchor
            const anchorNode = anchor.getNode()
            const topLevelElement = anchorNode.getTopLevelElement()
            const previousSibling = topLevelElement?.getPreviousSibling()

            const atStartOfElement = selection?.anchor.offset === 0 && selection.focus.offset === 0

            // convert empty top level list items to paragraphs
            if (
              atStartOfElement &&
              $isListItemNode(anchorNode) &&
              anchorNode.getIndent() === 0 &&
              anchorNode.isEmpty()
            ) {
              event?.preventDefault()
              editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined)
              return true
            }

            // see https://github.com/facebook/lexical/issues/5226
            // upstream bug with firefox only
            if (atStartOfElement && $isLinkNode(anchorNode.getPreviousSibling())) {
              const linkNode = anchorNode.getPreviousSibling()
              if ($isLinkNode(linkNode)) {
                const lastDescendent = linkNode.getLastDescendant()
                if ($isTextNode(lastDescendent)) {
                  lastDescendent.spliceText(lastDescendent.getTextContentSize(), 1, '', true)
                  return true
                }
              }
            }

            // delete empty paragraphs and select card if preceded by card
            if (
              $isParagraphNode(anchorNode) &&
              anchorNode.isEmpty() &&
              previousSibling &&
              $isDecoratorNode(previousSibling)
            ) {
              topLevelElement?.remove()
              $selectDecoratorNode(previousSibling)
              return true
            }

            // convert populated top level list items to paragraphs when cursor is at beginning
            if (atStartOfElement && $isListItemNode(anchorNode.getParent())) {
              const listItemNode = anchorNode.getParent()
              if (listItemNode && listItemNode.getIndent() === 0) {
                event?.preventDefault()
                const paragraphNode = $createParagraphNode()
                paragraphNode.append(...listItemNode.getChildren())
                listItemNode.replace(paragraphNode)
                return true
              }
            }

            const anchorNodeParent = anchorNode.getParent()

            // convert to paragraph if backspace is at start of the quote/aside block
            if (
              atStartOfElement &&
              anchorNodeParent &&
              ($isQuoteNode(anchorNodeParent) || $isAsideNode(anchorNodeParent))
            ) {
              const paragraph = $createParagraphNode()
              anchorNodeParent.getChildren().forEach((child) => {
                paragraph.append(child)
              })
              anchorNodeParent.replace(paragraph)
              paragraph.selectStart()
              event?.preventDefault()
              return true
            }

            // delete any previous card keeping caret in place
            if (
              atStartOfElement &&
              previousSibling &&
              $isDecoratorNode(previousSibling) &&
              anchorNodeParent === topLevelElement && // handles lists, where the parent node is not the paragraph
              anchorNodeParent?.getFirstChild()?.is(anchorNode) // handles child nodes in paragraphs, e.g. LinkNode and HorizontalRule
            ) {
              event?.preventDefault()
              previousSibling.remove()
              return true
            }

            const anchorNodeLength = anchorNode.getTextContentSize()
            const atEndOfElement =
              selection?.anchor.offset === anchorNodeLength && selection.focus.offset === anchorNodeLength

            // undo any markdown special formats when deleting at the end of a formatted text node
            if (atEndOfElement && $isTextNode(anchorNode)) {
              const textContent = anchorNode.getTextContent()

              for (const tag of Object.keys(SPECIAL_MARKUPS) as Array<keyof typeof SPECIAL_MARKUPS>) {
                if (anchorNode.hasFormat(tag)) {
                  const markup = SPECIAL_MARKUPS[tag]
                  // for replacement strings e.g. {{variable}} we shouldn't add the markup (assumes use of ReplacementStringsPlugin)
                  let newText = textContent
                  if (tag === 'code' && textContent.match(/{.*?}(?![A-Za-z\s])/)) {
                    newText = newText.slice(0, -1)
                  } else {
                    newText = markup + newText + markup
                    newText = newText.slice(0, -1) // remove last markup character
                  }

                  // manually clear formatting and push offset to accommodate for the added markup
                  anchorNode.setFormat(0)
                  anchorNode.setTextContent(newText)
                  selection.anchor.offset = selection.anchor.offset + newText.length - textContent.length
                  selection.focus.offset = selection.focus.offset + newText.length - textContent.length

                  event?.preventDefault()
                  return true
                }
              }
            }
          }
        }
        return false
      },
      COMMAND_PRIORITY_LOW,
    ),
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
