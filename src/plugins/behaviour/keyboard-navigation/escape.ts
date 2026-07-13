import type { LexicalEditor } from 'lexical'

import { COMMAND_PRIORITY_LOW, KEY_ESCAPE_COMMAND } from 'lexical'

import type { KeyboardNavigationDeps } from './types'

import { SELECT_CARD_COMMAND } from '../commands'

export function registerEscapeCommand(editor: LexicalEditor, deps: KeyboardNavigationDeps): () => void {
  const { selectedCardKey, isEditingCard } = deps

  return editor.registerCommand(
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
  )
}
