import { $insertDataTransferForRichText } from '@lexical/clipboard'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { render as markdownRender } from '@/markdown/markdown-html-renderer'
import {
  getModifierState,
  MIME_TEXT_HTML,
  MIME_TEXT_PLAIN,
  PASTE_MARKDOWN_COMMAND,
} from '@/plugins/behaviour/clipboard-protocol'
import { sanitizeHtml } from '@/utils/sanitize-html'

export const MarkdownPastePlugin = () => {
  const [editor] = useLexicalComposerContext()
  const modifierState = getModifierState(editor)

  // Per-consumer listeners are deliberate: the plugin must work standalone,
  // and writes into the shared modifier state are idempotent.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        modifierState.current = true
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        modifierState.current = false
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [modifierState])

  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        PASTE_MARKDOWN_COMMAND,
        ({ text, allowBr }) => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) {
            return false
          }
          const dataTransfer = new DataTransfer()
          if (modifierState.current) {
            dataTransfer.setData(MIME_TEXT_PLAIN, text)
          } else {
            const markdownHtml = markdownRender(text)
            // don't use cleanBasicHtml as it removes images and hr; in this case, we need to remove just br
            const cleanedHtml = allowBr ? markdownHtml : markdownHtml.replace(/<br\s?\/?>/g, '')
            const sanitizedHtml = sanitizeHtml(cleanedHtml, { replaceJS: true })
            dataTransfer.setData(MIME_TEXT_HTML, sanitizedHtml)
          }
          $insertDataTransferForRichText(dataTransfer, selection, editor)

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor, modifierState])

  return null
}

export default MarkdownPastePlugin
