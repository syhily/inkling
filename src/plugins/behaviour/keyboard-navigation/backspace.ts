import type { LexicalEditor } from 'lexical'

import { $isLinkNode } from '@lexical/link'
import { $isListItemNode } from '@lexical/list'
import { $isQuoteNode } from '@lexical/rich-text'
import {
  $createParagraphNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  INSERT_PARAGRAPH_COMMAND,
  KEY_BACKSPACE_COMMAND,
} from 'lexical'

import { $isAsideNode } from '@/nodes/AsideNode'
import { $selectDecoratorNode } from '@/utils'

import type { KeyboardNavigationDeps } from './types'

import { $getLogicallyAdjacentCard, editorOwnsFocus } from '../card-adjacency'
import { DELETE_CARD_COMMAND } from '../commands'

const SPECIAL_MARKUPS = {
  code: '`',
  superscript: '^',
  subscript: '~',
  strikethrough: '~~',
}

export function registerBackspaceCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey, isNested } = deps

  return editor.registerCommand(
    KEY_BACKSPACE_COMMAND,
    (event) => {
      // avoid processing card behaviours when an inner element has focus
      if (!editorOwnsFocus(editor)) {
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

          const atStartOfElement = selection?.anchor.offset === 0 && selection.focus.offset === 0

          // convert empty top level list items to paragraphs
          if (atStartOfElement && $isListItemNode(anchorNode) && anchorNode.getIndent() === 0 && anchorNode.isEmpty()) {
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
          const previousCardSibling = topLevelElement ? $getLogicallyAdjacentCard('previous', topLevelElement) : null
          if ($isParagraphNode(anchorNode) && anchorNode.isEmpty() && previousCardSibling) {
            topLevelElement?.remove()
            $selectDecoratorNode(previousCardSibling)
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
          // (selection-mode 'previous' is gated on exactly atStartOfElement above)
          const previousCard = $getLogicallyAdjacentCard('previous')
          if (
            previousCard &&
            anchorNodeParent === topLevelElement && // handles lists, where the parent node is not the paragraph
            anchorNodeParent?.getFirstChild()?.is(anchorNode) // handles child nodes in paragraphs, e.g. LinkNode and HorizontalRule
          ) {
            event?.preventDefault()
            previousCard.remove()
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
  )
}
