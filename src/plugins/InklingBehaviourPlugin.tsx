import type { LexicalEditor } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import React from 'react'

import { useCardSelectionStore } from '@/context/CardSelectionStoreContext'
import { registerDefaultTransforms } from '@/transforms'

import { getModifierState } from './behaviour/clipboard-protocol'
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
  const cardSelectionStore = useCardSelectionStore()

  const isShiftPressed = getModifierState(editor)

  React.useEffect(() => {
    return registerMouseEvents(editor, { containerElem, isNested })
  }, [editor, containerElem, isNested])

  // Register the behaviour listeners once per mount. Handlers read card
  // selection synchronously from the store, so listeners no longer need to be
  // torn down and re-registered per render to keep their closures fresh.
  React.useEffect(() => {
    return mergeRegister(
      registerCardSelection(editor, {
        store: cardSelectionStore,
        isNested,
      }),
      registerCardCommands(editor, {
        store: cardSelectionStore,
      }),
      registerKeyboardNavigation(editor, {
        store: cardSelectionStore,
        isNested,
        cursorDidExitAtTop,
      }),
      registerPasteHandler(editor, { isNested }),
      registerLinkMatching(editor, { isShiftPressed }),
      registerClickAndCut(editor),
      registerVisibilityHandler(editor, {
        store: cardSelectionStore,
      }),
    )
  }, [editor, cardSelectionStore, isNested, cursorDidExitAtTop, isShiftPressed])

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
  // Fallback container for the outside-click deselect: this editor's own root
  // element, read lazily because it is null at first render and set on mount.
  // Scoping per editor keeps multi-editor pages from cross-scoping the
  // deselect, and no document access happens during render.
  const fallbackRef = React.useMemo<React.RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return editor.getRootElement()
      },
    }),
    [editor],
  )
  return useInklingBehaviour({
    editor,
    containerElem: containerElem ?? fallbackRef,
    cursorDidExitAtTop,
    isNested,
  })
}
