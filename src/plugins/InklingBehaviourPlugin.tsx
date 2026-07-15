import type { LexicalEditor } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import React from 'react'

import { useCardSelectionStore } from '@/context/CardSelectionStoreContext'
import { useInklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { registerDefaultTransforms } from '@/transforms'

import {
  DELETE_CARD_COMMAND,
  DESELECT_CARD_COMMAND,
  EDIT_CARD_COMMAND,
  HIDE_CARD_VISIBILITY_SETTINGS_COMMAND,
  INSERT_CARD_COMMAND,
  PASTE_LINK_COMMAND,
  SELECT_CARD_COMMAND,
  SHOW_CARD_VISIBILITY_SETTINGS_COMMAND,
} from './behaviour/commands'
import { registerCardCommands } from './behaviour/registerCardCommands'
import { registerCardSelection } from './behaviour/registerCardSelection'
import { registerClickAndCut } from './behaviour/registerClickAndCut'
import { registerKeyboardNavigation } from './behaviour/registerKeyboardNavigation'
import { registerLinkMatching } from './behaviour/registerLinkMatching'
import { registerMouseEvents } from './behaviour/registerMouseEvents'
import { registerPasteHandler } from './behaviour/registerPasteHandler'
import { registerVisibilityHandler } from './behaviour/registerVisibilityHandler'

export {
  DELETE_CARD_COMMAND,
  DESELECT_CARD_COMMAND,
  EDIT_CARD_COMMAND,
  HIDE_CARD_VISIBILITY_SETTINGS_COMMAND,
  INSERT_CARD_COMMAND,
  PASTE_LINK_COMMAND,
  SELECT_CARD_COMMAND,
  SHOW_CARD_VISIBILITY_SETTINGS_COMMAND,
}

interface InklingBehaviourPluginProps {
  containerElem?: React.RefObject<HTMLElement | null>
  cursorDidExitAtTop?: () => void
  isNested?: boolean
}

function useInklingBehaviour({
  editor,
  containerElem,
  cursorDidExitAtTop,
  isNested,
}: {
  editor: LexicalEditor
  containerElem: React.RefObject<HTMLElement | null>
  cursorDidExitAtTop?: () => void
  isNested?: boolean
}) {
  const { selectedCardKey, setSelectedCardKey, isEditingCard, setIsEditingCard, setShowVisibilitySettings } =
    useInklingSelectedCardContext()
  const cardSelectionStore = useCardSelectionStore()

  const isShiftPressed = React.useRef(false)

  React.useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      isShiftPressed.current = event.shiftKey
    }

    const keyUp = (event: KeyboardEvent) => {
      isShiftPressed.current = event.shiftKey
    }

    document.addEventListener('keydown', keyDown)
    document.addEventListener('keyup', keyUp)

    return () => {
      document.removeEventListener('keydown', keyDown)
      document.removeEventListener('keyup', keyUp)
    }
  }, [])

  React.useEffect(() => {
    return registerMouseEvents(editor, { containerElem, isNested })
  }, [editor, containerElem, isNested])

  React.useEffect(() => {
    return mergeRegister(
      registerCardSelection(editor, {
        store: cardSelectionStore,
        isNested,
      }),
      registerCardCommands(editor, {
        selectedCardKey,
        isEditingCard,
        setSelectedCardKey,
        setIsEditingCard,
        setShowVisibilitySettings,
      }),
      registerKeyboardNavigation(editor, {
        selectedCardKey,
        isEditingCard,
        setIsEditingCard,
        isNested,
        cursorDidExitAtTop,
      }),
      registerPasteHandler(editor, { isNested }),
      registerLinkMatching(editor, { isShiftPressed }),
      registerClickAndCut(editor),
      registerVisibilityHandler(editor, {
        selectedCardKey,
        isEditingCard,
        setShowVisibilitySettings,
      }),
    )
  })

  // remove alignment formats,
  // denest invalid node nesting,
  // merge list nodes of same type
  React.useEffect(() => {
    return registerDefaultTransforms(editor)
  }, [editor])

  return null
}

export default function InklingBehaviourPlugin({
  containerElem,
  cursorDidExitAtTop,
  isNested,
}: InklingBehaviourPluginProps) {
  const [editor] = useLexicalComposerContext()
  const fallbackRef = React.useRef<HTMLElement | null>(document.querySelector('.inkling-editor'))
  return useInklingBehaviour({
    editor,
    containerElem: containerElem ?? fallbackRef,
    cursorDidExitAtTop,
    isNested,
  })
}
