import type { LexicalEditor } from 'lexical'

import {
  $createNodeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
} from 'lexical'

import { $isInklingCard } from '@/nodes/base'
import { $createCodeBlockNode } from '@/nodes/CodeBlockNode'
import { $selectDecoratorNode } from '@/utils'

import type { CardKeyboardEvent } from '../types'
import type { KeyboardNavigationDeps } from './types'

import { $selectCard } from '../card-adjacency'

export function registerEnterCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey, isEditingCard, setIsEditingCard, isNested } = deps

  return editor.registerCommand(
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
  )
}
