import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_LOW, CONTROLLED_TEXT_INSERTION_COMMAND } from 'lexical'
import { useEffect, useRef } from 'react'

import { getSelectedNode } from '@/utils/getSelectedNode'

const DASH = '-'

function isWhitespace(char: string): boolean {
  return /^\s$/.test(char)
}

export const EmEnDashPlugin = () => {
  const [editor] = useLexicalComposerContext()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const replaceDashes = () => {
      if (!mountedRef.current) {
        return
      }
      editor.update(
        () => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return
          }

          const node = getSelectedNode(selection)
          if (!$isTextNode(node)) {
            return
          }

          const text = node.getTextContent()
          const offset = selection.anchor.offset

          // em dash: three consecutive dashes ending at the cursor
          if (offset >= 3 && text.slice(offset - 3, offset) === '---') {
            const charBefore = text[offset - 4]
            if (charBefore === undefined || charBefore !== DASH) {
              node.setTextContent(text.slice(0, offset - 3) + '—' + text.slice(offset))
              selection.anchor.offset = offset - 2
              selection.focus.offset = offset - 2
              return
            }
          }

          // en dash: non-dash char + '--' + whitespace ending at the cursor
          if (offset >= 3) {
            const charAfterDashes = text[offset - 1]
            const twoDashes = text.slice(offset - 3, offset - 1)
            const charBeforeDashes = text[offset - 4]
            if (
              charAfterDashes !== undefined &&
              /^\s$/.test(charAfterDashes) &&
              twoDashes === '--' &&
              charBeforeDashes !== undefined &&
              charBeforeDashes !== DASH
            ) {
              node.setTextContent(text.slice(0, offset - 3) + '–' + text.slice(offset - 1))
              selection.anchor.offset = offset - 1
              selection.focus.offset = offset - 1
            }
          }
        },
        { tag: 'history-push' },
      )
    }

    return editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (eventOrText) => {
        if (editor.isComposing()) {
          return false
        }

        const text = typeof eventOrText === 'string' ? eventOrText : eventOrText.data
        if (!text || text.length !== 1 || (text !== DASH && !isWhitespace(text))) {
          return false
        }

        // Defer the replacement to the next macrotask so it becomes a separate
        // history entry from the keystroke that triggered it. This lets undo
        // restore the raw typed dashes.
        setTimeout(replaceDashes, 0)
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor])

  return null
}

export default EmEnDashPlugin
