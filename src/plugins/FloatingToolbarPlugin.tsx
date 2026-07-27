import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  KEY_MODIFIER_COMMAND,
  type LexicalEditor,
} from 'lexical'
import React from 'react'

import { FloatingFormatToolbar } from '@/components/ui/FloatingFormatToolbar'
import { FloatingLinkToolbar } from '@/components/ui/FloatingLinkToolbar'
import {
  createLinkHoverFeed,
  createToolbarSession,
  LINK_HOVER_DEBOUNCE_MS,
  registerToolbarSelectionSync,
  type ToolbarSession,
} from '@/plugins/behaviour/link-editing'
import { debounce } from '@/utils'

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
  // the toolbar session (hidden | text | link | snippet, plus the hovered-link
  // slot) lives in the headless link-editing module; this hook only feeds it
  // selection/DOM events and renders its state
  const sessionRef = React.useRef<ToolbarSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = createToolbarSession()
  }
  const session = sessionRef.current
  const { type, href, hoveredLink } = React.useSyncExternalStore(session.handle.subscribe, session.handle.getState)

  // the hover toolbar's element, so the hover feed can ignore mousemoves over
  // the toolbar itself (they must not clear the hovered link)
  const linkToolbarRef = React.useRef<HTMLDivElement | null>(null)

  // the hover feed: debounced document mousemoves in, hovered-link truth out
  // into the session (suppressed by the session while any toolbar is open)
  React.useEffect(() => {
    const hoverFeed = createLinkHoverFeed(editor, session, { getToolbarElement: () => linkToolbarRef.current })
    const onMouseMove = debounce((event: MouseEvent) => hoverFeed.hover(event.target), LINK_HOVER_DEBOUNCE_MS)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      onMouseMove.cancel()
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [editor, session])

  // the selection classifier (composing skip, outside-editor close, at-link
  // suppression, textSelected/href derivation) lives headlessly in the
  // link-editing module; this hook only registers it
  React.useEffect(() => {
    return registerToolbarSelectionSync(editor, session)
  }, [editor, session])

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
  }, [anchorElem, session])

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
        hoveredLink={hoveredLink}
        toolbarRef={linkToolbarRef}
        onEditLink={({ href: editHref }) => session.openLink(editHref)}
        onRemoveLink={() => session.syncHover(null)}
      />
    </>
  )
}
