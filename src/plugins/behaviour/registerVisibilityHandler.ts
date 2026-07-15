import type { LexicalEditor } from 'lexical'

import { mergeRegister } from '@lexical/utils'
import { $getNodeByKey, COMMAND_PRIORITY_LOW } from 'lexical'

import type { CardNode } from '@/types/lexical-internals'

import { $isHtmlNode } from '@/nodes/HtmlNode'

import type { CardSelectionStore } from './cardSelectionStore'

import { $deselectCard } from './card-adjacency'
import {
  DESELECT_CARD_COMMAND,
  EDIT_CARD_COMMAND,
  HIDE_CARD_VISIBILITY_SETTINGS_COMMAND,
  SELECT_CARD_COMMAND,
  SHOW_CARD_VISIBILITY_SETTINGS_COMMAND,
} from './commands'

interface VisibilityHandlerDeps {
  store: CardSelectionStore
  setShowVisibilitySettings: (show: boolean) => void
}

export function registerVisibilityHandler(editor: LexicalEditor, deps: VisibilityHandlerDeps) {
  const { store, setShowVisibilitySettings } = deps

  return mergeRegister(
    editor.registerCommand(
      SHOW_CARD_VISIBILITY_SETTINGS_COMMAND,
      ({ cardKey }) => {
        editor.update(() => {
          const { selectedCardKey, isEditingCard } = store.getState()
          const cardNode = $getNodeByKey(cardKey) as CardNode | null

          // If the card is an html card, we toggle the visibility settings differently
          // because we want to show the visibility settings panel while in selected mode
          // instead of entering edit mode
          if ($isHtmlNode(cardNode)) {
            setShowVisibilitySettings(true)
            if (!selectedCardKey) {
              editor.dispatchCommand(SELECT_CARD_COMMAND, { cardKey, focusEditor: true })
            }
          } else {
            if (cardNode?.hasEditMode?.() && !isEditingCard) {
              setShowVisibilitySettings(true)
              editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey, focusEditor: true })
            } else if (isEditingCard) {
              $deselectCard(editor, cardKey)
            }
          }
        })
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      HIDE_CARD_VISIBILITY_SETTINGS_COMMAND,
      ({ cardKey }) => {
        editor.update(() => {
          setShowVisibilitySettings(false)
          editor.dispatchCommand(DESELECT_CARD_COMMAND, { cardKey })
        })
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
  )
}
