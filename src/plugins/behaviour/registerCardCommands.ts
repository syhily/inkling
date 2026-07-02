import type { LexicalEditor } from 'lexical'

import { mergeRegister } from '@lexical/utils'
import {
  $createNodeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
} from 'lexical'

import type { CardNode } from '@/types/lexical-internals'

import { $insertAndSelectNode } from '@/utils/$insertAndSelectNode'

import {
  DELETE_CARD_COMMAND,
  DESELECT_CARD_COMMAND,
  EDIT_CARD_COMMAND,
  INSERT_CARD_COMMAND,
  SELECT_CARD_COMMAND,
} from './commands'
import { $deselectCard, $selectCard } from './utils'

interface CardCommandDeps {
  selectedCardKey: string | null
  isEditingCard: boolean
  setSelectedCardKey: (key: string | null) => void
  setIsEditingCard: (editing: boolean) => void
  setShowVisibilitySettings: (show: boolean) => void
}

export function registerCardCommands(editor: LexicalEditor, deps: CardCommandDeps) {
  const { selectedCardKey, isEditingCard, setSelectedCardKey, setIsEditingCard, setShowVisibilitySettings } = deps

  return mergeRegister(
    editor.registerCommand(
      INSERT_CARD_COMMAND,
      ({ cardNode, openInEditMode }) => {
        let focusNode

        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          focusNode = selection.focus.getNode()
        } else if ($isNodeSelection(selection)) {
          focusNode = selection.getNodes()[0]
        } else {
          return false
        }

        if (focusNode !== null) {
          $insertAndSelectNode({ selectedNode: focusNode, newNode: cardNode })

          setSelectedCardKey(cardNode.getKey())

          if (openInEditMode) {
            setIsEditingCard(true)
          }
        }

        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      SELECT_CARD_COMMAND,
      ({ cardKey }) => {
        // already selected, delete if empty as we're exiting edit mode
        if (selectedCardKey === cardKey && isEditingCard) {
          const cardNode = $getNodeByKey(cardKey) as CardNode | null
          if (cardNode?.isEmpty?.()) {
            editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey })
            return true
          }
        }

        if (selectedCardKey && selectedCardKey !== cardKey) {
          $deselectCard(editor, selectedCardKey)
          // Hide visibility settings when switching to a different card
          setShowVisibilitySettings(false)
        }

        $selectCard(editor, cardKey)

        setSelectedCardKey(cardKey)
        setIsEditingCard(false)
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      EDIT_CARD_COMMAND,
      ({ cardKey }) => {
        if (selectedCardKey && selectedCardKey !== cardKey) {
          $deselectCard(editor, selectedCardKey)
        }
        $selectCard(editor, cardKey)

        setSelectedCardKey(cardKey)

        const cardNode = $getNodeByKey(cardKey) as CardNode | null
        if (cardNode?.hasEditMode?.()) {
          setIsEditingCard(true)
        }
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      DESELECT_CARD_COMMAND,
      ({ cardKey }) => {
        $deselectCard(editor, cardKey)

        setSelectedCardKey(null)
        setIsEditingCard(false)
        // Hide visibility settings when deselecting a card
        setShowVisibilitySettings(false)
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      DELETE_CARD_COMMAND,
      ({ cardKey, direction = 'forward' }) => {
        const cardNode = $getNodeByKey(cardKey) as CardNode | null
        if (!cardNode) {
          return false
        }
        const previousSibling = cardNode.getPreviousSibling()
        const nextSibling = cardNode.getNextSibling()

        if (direction === 'backward' && previousSibling) {
          if ($isDecoratorNode(previousSibling)) {
            const nodeSelection = $createNodeSelection()
            nodeSelection.add(previousSibling.getKey())
            $setSelection(nodeSelection)
          } else if (previousSibling.selectEnd) {
            // decorator nodes have selectEnd, so this needs to come after that check
            previousSibling.selectEnd()
          } else {
            cardNode.selectPrevious?.()
          }
        } else if (nextSibling) {
          if ($isDecoratorNode(nextSibling)) {
            const nodeSelection = $createNodeSelection()
            nodeSelection.add(nextSibling.getKey())
            $setSelection(nodeSelection)
          } else if (nextSibling.selectStart) {
            // decorator nodes have selectStart, so this needs to come after that check
            nextSibling.selectStart()
          } else {
            cardNode.selectNext?.()
          }
        } else {
          // ensure we still have a paragraph if the deleted card was the only node
          const paragraph = $createParagraphNode()
          $getRoot().append(paragraph)
          paragraph.select()
        }

        cardNode.remove()

        // ensure focus moves back to the editor if we lost it by selecting a card
        const rootElement = editor.getRootElement()
        if (rootElement) {
          rootElement.focus()
        }

        setSelectedCardKey(null)
        setIsEditingCard(false)
        setShowVisibilitySettings(false)
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
  )
}
