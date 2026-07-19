import type { InitialEditorStateType } from '@lexical/react/LexicalComposer'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
  BLUR_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from 'lexical'
import React, { useCallback, useContext } from 'react'

import type { NestedKeyboardEvent } from '@/types/events'

import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingNestedComposer from '@/components/InklingNestedComposer'
import CardContext from '@/context/CardContext'
import { MINIMAL_TRANSFORMERS } from '@/markdown/transformers'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import RestrictContentPlugin from '@/plugins/RestrictContentPlugin'

const Placeholder = ({ text = 'Type here' }) => {
  return (
    <div className="pointer-events-none absolute top-0 left-0 !m-0 min-w-full cursor-text font-sans text-sm leading-[24px] font-normal tracking-wide text-grey-500 dark:text-grey-800">
      {text}
    </div>
  )
}

function CaptionPlugin({ parentEditor }: { parentEditor: LexicalEditor }) {
  const [editor] = useLexicalComposerContext()
  const { setCaptionHasFocus, captionHasFocus, nodeKey, isSelected } = useContext(CardContext)

  // focus on caption editor when something is typed while card is selected
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // don't focus caption input if card is not selected
      if (!isSelected) {
        return
      }

      // don't focus caption input if any other input or textarea is focused
      const target = event.target
      if (target instanceof Element && target.matches('input, textarea')) {
        return
      }

      // only if key is printable key, focus on editor
      if (!captionHasFocus && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        editor.focus()
      }
    },
    [editor, captionHasFocus, isSelected],
  )

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, editor])

  // handle focus/blur and enter key commands
  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          setCaptionHasFocus(true)
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          setCaptionHasFocus(false)
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          // Lexical 0.46.0 added `commandPriority` to typeahead menus, but the
          // project's menus still register at the default `COMMAND_PRIORITY_LOW`,
          // which is the same priority used here. Until the menu is configured
          // to register at a higher priority, bail out when a typeahead menu is
          // open so the menu can handle Enter itself.
          if (document.querySelector(`#typeahead-menu`)) {
            return false
          }

          // allow shift+enter to create a line break
          if (event?.shiftKey) {
            return false
          }

          // the IME/mobile Enter path dispatches a null event
          if (!event) {
            return false
          }

          // otherwise, let the parent editor handle the enter key
          // - with ctrl/cmd+enter toggles edit mode
          // - or creates paragraph after card and moves cursor
          const nestedEvent: NestedKeyboardEvent = event
          nestedEvent._fromNested = true
          parentEditor.dispatchCommand(KEY_ENTER_COMMAND, nestedEvent)

          // prevent normal/InklingBehaviourPlugin enter key behaviour
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          // Lexical 0.46.0 added `commandPriority` to typeahead menus, but the
          // project's menus still register at the default `COMMAND_PRIORITY_LOW`.
          // Bail out when a typeahead menu is open so arrow keys navigate the
          // menu instead of moving focus to the next/parent editor.
          if (document.querySelector(`#typeahead-menu`)) {
            return false
          }
          // handle moving focus at the parent editor level (select next card)
          const captionEvent: NestedKeyboardEvent = event
          captionEvent._fromCaptionEditor = true
          parentEditor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, captionEvent)
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          // Lexical 0.46.0 added `commandPriority` to typeahead menus, but the
          // project's menus still register at the default `COMMAND_PRIORITY_LOW`.
          // Bail out when a typeahead menu is open so arrow keys navigate the
          // menu instead of moving focus to the next/parent editor.
          if (document.querySelector(`#typeahead-menu`)) {
            return false
          }
          // handle moving focus at the parent editor level (select next card)
          const captionEvent: NestedKeyboardEvent = event
          captionEvent._fromCaptionEditor = true
          parentEditor.dispatchCommand(KEY_ARROW_UP_COMMAND, captionEvent)
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor, setCaptionHasFocus, parentEditor, nodeKey])

  return null
}

interface InklingCaptionEditorProps {
  paragraphs?: number
  captionEditor: LexicalEditor
  captionEditorInitialState?: InitialEditorStateType
  placeholderText?: string
  className?: string
}

const InklingCaptionEditor = ({
  paragraphs = 1,
  captionEditor,
  captionEditorInitialState,
  placeholderText,
  className = 'inkling-lexical-caption',
}: InklingCaptionEditorProps) => {
  const [parentEditor] = useLexicalComposerContext()
  return (
    <InklingNestedComposer
      initialEditor={captionEditor}
      initialEditorState={captionEditorInitialState}
      initialNodes={MINIMAL_NODES}
    >
      <InklingComposableEditor
        className={className}
        markdownTransformers={MINIMAL_TRANSFORMERS}
        placeholder={<Placeholder text={placeholderText} />}
      >
        <CaptionPlugin parentEditor={parentEditor} />
        <RestrictContentPlugin paragraphs={paragraphs} />
        <EmojiPickerPlugin />
      </InklingComposableEditor>
    </InklingNestedComposer>
  )
}

export default InklingCaptionEditor
