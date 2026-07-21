import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  KEY_MODIFIER_COMMAND,
  type LexicalEditor,
} from 'lexical'
import React from 'react'

import { FloatingFormatToolbar } from '@/components/ui/FloatingFormatToolbar'
import { FloatingLinkToolbar } from '@/components/ui/FloatingLinkToolbar'
import { $isAtLinkSearchNode } from '@/nodes/base'
import { $getLinkHrefAtSelection, createToolbarSession, type ToolbarSession } from '@/plugins/behaviour/link-editing'
import { getSelectedNode } from '@/utils/getSelectedNode'

export default function FloatingToolbarPlugin({
  anchorElem = document.body,
  isSnippetsEnabled,
  hiddenFormats = [],
}: {
  anchorElem?: HTMLElement
  isSnippetsEnabled?: boolean
  hiddenFormats?: string[]
}) {
  const [editor] = useLexicalComposerContext()
  return useFloatingFormatToolbar(editor, anchorElem, isSnippetsEnabled, hiddenFormats)
}

function useFloatingFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  isSnippetsEnabled?: boolean,
  hiddenFormats: string[] = [],
) {
  // the toolbar session (hidden | text | link | snippet) lives in the headless
  // link-editing module; this hook only feeds it selection/DOM events and
  // renders its state
  const sessionRef = React.useRef<ToolbarSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = createToolbarSession()
  }
  const session = sessionRef.current
  const { type, href } = React.useSyncExternalStore(session.handle.subscribe, session.handle.getState)

  const syncToolbarToSelection = React.useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return
      }

      const selection = $getSelection()
      const nativeSelection = window.getSelection()
      const rootElement = editor.getRootElement()

      // close toolbar if selection was outside of editor
      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) || rootElement === null || !rootElement.contains(nativeSelection.anchorNode))
      ) {
        session.syncSelection(null)
        return
      }

      if (!$isRangeSelection(selection) || $isAtLinkSearchNode(selection.anchor.getNode())) {
        session.syncSelection(null)
        return
      }

      const anchorNode = getSelectedNode(selection)
      const textSelected =
        selection.getTextContent().trim() !== '' && ($isTextNode(anchorNode) || $isParagraphNode(anchorNode))
      session.syncSelection({ textSelected, href: $getLinkHrefAtSelection() })
    })
  }, [editor, session])

  React.useEffect(() => {
    document.addEventListener('selectionchange', syncToolbarToSelection)
    return () => {
      document.removeEventListener('selectionchange', syncToolbarToSelection)
    }
  }, [syncToolbarToSelection])

  React.useEffect(() => {
    // clear out the toolbar when the user removes selected content
    return editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () => {
        session.close()
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, session])

  React.useEffect(() => {
    return editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event: KeyboardEvent) => {
        const { keyCode, ctrlKey, metaKey, shiftKey } = event
        // ctrl/cmd K with selected text should prompt for link insertion
        if (!shiftKey && keyCode === 75 && (ctrlKey || metaKey)) {
          const selection = $getSelection()
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            session.openLink()
            event.preventDefault()
            return true
          }
        }
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, session])

  // use native mousedown event so the toolbar can close when something is
  // clicked outside of the editor and the selection is lost
  React.useEffect(() => {
    const handleMousedown = (event: MouseEvent) => {
      if (!anchorElem.contains(event.target as Node)) {
        session.close()
      }
    }

    document.addEventListener('mousedown', handleMousedown)

    return () => {
      document.removeEventListener('mousedown', handleMousedown)
    }
  })

  return (
    <>
      <FloatingFormatToolbar
        anchorElem={anchorElem}
        editor={editor}
        hiddenFormats={hiddenFormats}
        href={href}
        isSnippetsEnabled={isSnippetsEnabled}
        toolbarItemType={type === 'hidden' ? null : type}
        onClose={session.close}
        onOpenLink={() => session.openLink()}
        onOpenSnippet={session.openSnippet}
      />

      <FloatingLinkToolbar
        anchorElem={anchorElem}
        disabled={type !== 'hidden'} // don't show link toolbar on hover when format toolbar is active
        onEditLink={({ href: editHref }) => session.openLink(editHref)}
      />
    </>
  )
}
