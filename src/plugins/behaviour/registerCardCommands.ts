import type { LexicalEditor, LexicalNode } from 'lexical'

import { mergeRegister } from '@lexical/utils'
import {
  $createNodeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
} from 'lexical'

import type { CardNode } from '@/types/lexical-internals'

import { $insertAndSelectNode } from '@/utils/$insertAndSelectNode'

import type { CardSelectionStore } from './cardSelectionStore'

import { $deselectCard, $getLogicallyAdjacentCard, $selectCard } from './card-adjacency'
import {
  DELETE_CARD_COMMAND,
  DESELECT_CARD_COMMAND,
  EDIT_CARD_COMMAND,
  INSERT_CARD_COMMAND,
  SELECT_CARD_COMMAND,
} from './commands'

interface CardCommandDeps {
  store: CardSelectionStore
  setShowVisibilitySettings: (show: boolean) => void
}

export function registerCardCommands(editor: LexicalEditor, deps: CardCommandDeps) {
  const { store, setShowVisibilitySettings } = deps

  return mergeRegister(
    editor.registerCommand(
      INSERT_CARD_COMMAND,
      ({ cardNode, openInEditMode }) => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection) && !$isNodeSelection(selection)) {
          return false
        }
        // focus.getNode() is non-null (it throws on a missing node); a node
        // selection's first node is defined once the selection is non-empty
        // (the same exposure the old dead null check had, kept consciously)
        const focusNode: LexicalNode = $isRangeSelection(selection)
          ? selection.focus.getNode()
          : selection.getNodes()[0]

        $insertAndSelectNode({ selectedNode: focusNode, newNode: cardNode })

        store.setState({ selectedCardKey: cardNode.getKey() })

        if (openInEditMode) {
          store.setState({ isEditingCard: true })
        }

        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      SELECT_CARD_COMMAND,
      ({ cardKey }) => {
        const { selectedCardKey, isEditingCard } = store.getState()

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

        store.setState({ selectedCardKey: cardKey, isEditingCard: false })
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      EDIT_CARD_COMMAND,
      ({ cardKey }) => {
        const { selectedCardKey } = store.getState()

        if (selectedCardKey && selectedCardKey !== cardKey) {
          $deselectCard(editor, selectedCardKey)
        }
        $selectCard(editor, cardKey)

        store.setState({ selectedCardKey: cardKey })

        const cardNode = $getNodeByKey(cardKey) as CardNode | null
        if (cardNode?.hasEditMode?.()) {
          store.setState({ isEditingCard: true })
        }
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      DESELECT_CARD_COMMAND,
      ({ cardKey }) => {
        $deselectCard(editor, cardKey)

        store.setState({ selectedCardKey: null, isEditingCard: false })
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
          // from-mode: cardNode comes from the payload, not the selection
          const previousCard = $getLogicallyAdjacentCard('previous', cardNode)
          if (previousCard) {
            const nodeSelection = $createNodeSelection()
            nodeSelection.add(previousCard.getKey())
            $setSelection(nodeSelection)
          } else {
            previousSibling.selectEnd()
          }
        } else if (nextSibling) {
          // from-mode: cardNode comes from the payload, not the selection
          const nextCard = $getLogicallyAdjacentCard('next', cardNode)
          if (nextCard) {
            const nodeSelection = $createNodeSelection()
            nodeSelection.add(nextCard.getKey())
            $setSelection(nodeSelection)
          } else {
            nextSibling.selectStart()
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

        store.setState({ selectedCardKey: null, isEditingCard: false })
        setShowVisibilitySettings(false)
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
  )
}
