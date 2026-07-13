import type { LexicalEditor } from 'lexical'

import { $isLinkNode } from '@lexical/link'
import { $isListItemNode } from '@lexical/list'
import { $isQuoteNode } from '@lexical/rich-text'
import { mergeRegister } from '@lexical/utils'
import {
  $createNodeSelection,
  $createParagraphNode,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_LINE_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical'

import { $isAsideNode } from '@/nodes/AsideNode'
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
import { registerEnterCommand } from './keyboard-navigation/enter'
import { registerKeyDownPassthrough } from './keyboard-navigation/key-down'
import { registerModifierCommand } from './keyboard-navigation/modifier'
import { RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX, SPECIAL_MARKUPS } from './utils'

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
