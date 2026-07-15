import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { BLUR_COMMAND, COMMAND_PRIORITY_EDITOR } from 'lexical'
import { useEffect } from 'react'

export const InklingBlurPlugin = ({ onBlur }: { onBlur?: () => void }) => {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    // return the unregister handle so the listener is removed on unmount
    return editor.registerCommand(
      BLUR_COMMAND,
      () => {
        onBlur?.()
        // mark handled at editor priority so propagation stops here
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor, onBlur])

  return null
}
