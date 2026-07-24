import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
  $createNodeSelection,
  $getSelection,
  $setSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
} from 'lexical'
import React from 'react'

import CardContext from '@/context/CardContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { isTypeaheadMenuOpen, markEventFromNested } from '@/plugins/behaviour/nested-editor-protocol'
import { getParentEditor } from '@/utils/lexical-internals'

// the nested editor the Enter key hands focus to (Header subheader, Toggle
// content) — structurally the part of LexicalEditor the hand-off needs
export type FocusNextTarget = { focus: (fn: () => void) => void; getRootElement: () => HTMLElement | null }

function InklingNestedEditorPlugin({
  autoFocus,
  focusNext,
  hasSettingsPanel,
  // Enter will focus the next card if this is true
  defaultInklingEnterBehaviour = false,
}: {
  autoFocus?: boolean
  focusNext?: FocusNextTarget | null
  hasSettingsPanel?: boolean
  defaultInklingEnterBehaviour?: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const { nodeKey: parentCardNodeKey } = React.useContext(CardContext)
  const isParentCardEditing = useCardSelection(
    (state) => state.selectedCardKey === parentCardNodeKey && state.isEditingCard,
  )

  // using state here because this component can get re-rendered after the
  // editor's editable state changes so we need to re-focus on re-render
  const [shouldFocus, setShouldFocus] = React.useState(autoFocus)

  // Sync the nested editor's editable state with the parent card's editing
  // state synchronously (before browser paint). Without this, the nested
  // editor can briefly be contenteditable="true" during decorator mount
  // (e.g. after undo restores a card), causing the browser to fire
  // selectionchange events that interfere with the parent editor's selection.
  React.useLayoutEffect(() => {
    if (parentCardNodeKey !== undefined) {
      editor.setEditable(!!isParentCardEditing)
    }
  }, [editor, isParentCardEditing, parentCardNodeKey])

  React.useEffect(() => {
    // prevent nested editor getting focus when its card isn't being edited
    if (!isParentCardEditing) {
      return
    }

    if (shouldFocus) {
      editor.focus(() => {
        editor.getRootElement()?.focus({ preventScroll: true })
      })
    }
  }, [shouldFocus, editor, isParentCardEditing])

  React.useEffect(() => {
    return mergeRegister(
      // watch for editor becoming editable rather than relying on an `isEditing` prop
      // because the prop will change before the contenteditable becomes editable, meaning
      // we try to focus a non-editable editor which puts focus on the main editor instead
      editor.registerEditableListener((isEditable) => {
        if (!autoFocus) {
          return
        }

        if (isEditable) {
          setShouldFocus(true)
        } else {
          setShouldFocus(false)
        }
      }),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          const parentEditor = getParentEditor(editor)

          // don't swallow events meant for an open typeahead menu — the
          // protocol module explains why this can't be priority-based yet
          if (isTypeaheadMenuOpen()) {
            return false
          }

          // let the parent editor handle the edit mode product
          if (event && (event.metaKey || event.ctrlKey)) {
            if (!parentEditor) {
              return true
            }
            parentEditor.dispatchCommand(KEY_ENTER_COMMAND, markEventFromNested(event))
            return true
          }

          // move focus to the next editor if it exists (e.g. from header to content editor)
          if (focusNext && !event?.shiftKey) {
            event?.preventDefault()
            focusNext.focus(() => {
              focusNext.getRootElement()?.focus({ preventScroll: true })
            })
            return true
          }

          if (defaultInklingEnterBehaviour) {
            // allow shift+enter to create a line break
            if (event?.shiftKey) {
              return false
            }

            // otherwise, let the parent editor handle the enter key
            // - with ctrl/cmd+enter toggles edit mode
            // - or creates paragraph after card and moves cursor
            if (!parentEditor) {
              return false
            }
            if (event) {
              markEventFromNested(event)
            }
            parentEditor.dispatchCommand(KEY_ENTER_COMMAND, event)

            // prevent normal/InklingBehaviourPlugin enter key behaviour
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          const parentEditor = getParentEditor(editor)

          // when the nested editor is selected, the parent editor clears its selection so we need to
          //   return parent editor selection to the card when the nested editor loses focus
          if (hasSettingsPanel && parentEditor) {
            parentEditor.getEditorState().read(() => {
              parentEditor.update(
                () => {
                  if (!$getSelection()) {
                    const selection = $createNodeSelection()
                    if (parentCardNodeKey) {
                      selection.add(parentCardNodeKey)
                    }
                    $setSelection(selection)
                  }
                },
                { tag: 'history-merge' },
              ) // don't include an undo history entry for this change of selection
            })

            return true
          }

          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor, autoFocus, focusNext, parentCardNodeKey, hasSettingsPanel, defaultInklingEnterBehaviour])

  return null
}

export default InklingNestedEditorPlugin
