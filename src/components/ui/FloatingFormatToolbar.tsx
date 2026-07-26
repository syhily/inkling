import type { LexicalEditor } from 'lexical'

import React from 'react'

import FloatingToolbar from '@/components/ui/FloatingToolbar'
import { default as FormatToolbar } from '@/components/ui/FormatToolbar'
import { LinkActionToolbarWithSearch } from '@/components/ui/LinkActionToolbarWithSearch'
import { LinkInput } from '@/components/ui/LinkInput'
import { SnippetActionToolbar } from '@/components/ui/SnippetActionToolbar'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { $applyLinkToSelection, createToolbarRevealFeed } from '@/plugins/behaviour/link-editing'
import { debounce } from '@/utils'

export const toolbarItemTypes = {
  snippet: 'snippet',
  link: 'link',
  text: 'text',
} as const

export function FloatingFormatToolbar({
  editor,
  anchorElem,
  href,
  isSnippetsEnabled,
  toolbarItemType,
  onClose,
  onOpenLink,
  onOpenSnippet,
  hiddenFormats = [],
}: {
  editor: LexicalEditor
  anchorElem: HTMLElement
  href?: string
  isSnippetsEnabled?: boolean
  toolbarItemType?: string | null
  onClose: () => void
  onOpenLink: () => void
  onOpenSnippet: () => void
  hiddenFormats?: string[]
}) {
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)
  const isLinkSearchEnabled = typeof cardConfig?.searchLinks === 'function'

  const toolbarRef = React.useRef<HTMLDivElement>(null)

  const isLinkSearchToolbarVisible = toolbarItemType === toolbarItemTypes.link && isLinkSearchEnabled

  // toolbar opacity is 0 by default; the reveal feed flips it once the
  // selection gesture completes (mouseup inside the selection, or a threshold
  // mousemove) so the toolbar does not re-position while dragging
  const reveal = React.useCallback(() => {
    if (toolbarItemType && toolbarRef.current?.style.opacity === '0') {
      toolbarRef.current.style.opacity = '1'
    }
  }, [toolbarItemType])

  React.useEffect(() => {
    const revealFeed = createToolbarRevealFeed(editor, { reveal })
    const onRelease = (event: Event) => revealFeed.release(event.target)
    const onMouseMove = debounce(
      (event: MouseEvent) => revealFeed.move({ x: event.clientX, y: event.clientY }, event.buttons),
      10,
    )

    document.addEventListener('mouseup', onRelease) // desktop
    document.addEventListener('touchend', onRelease) // mobile
    document.addEventListener('mousemove', onMouseMove)

    return () => {
      onMouseMove.cancel()
      document.removeEventListener('mouseup', onRelease) // desktop
      document.removeEventListener('touchend', onRelease) // mobile
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [editor, reveal])

  const handleActionToolbarClose = onClose

  const isSnippetToolbar = toolbarItemTypes.snippet === toolbarItemType
  const isLinkToolbar = toolbarItemTypes.link === toolbarItemType
  const isTextToolbar = toolbarItemTypes.text === toolbarItemType

  const showTextToolbar = isTextToolbar || (isLinkSearchEnabled && isLinkToolbar)

  // When link searching is enabled the link toolbar has alternative styling
  // where the search input and results are displayed below the format toolbar.
  //
  // When link searching is disabled the link input toolbar visually replaces
  // the format toolbar.

  return (
    <>
      <FloatingToolbar
        anchorElem={anchorElem}
        // toolbar opacity is 0 by default
        // shouldn't display until selection via mouse is complete to avoid toolbar re-positioning while dragging
        controlOpacity={!isTextToolbar}
        editor={editor}
        isVisible={!!toolbarItemType}
        onReposition={() => {}}
        shouldReposition={toolbarItemType !== toolbarItemTypes.text} // format toolbar shouldn't reposition when applying formats
        targetElem={null}
        toolbarRef={toolbarRef}
      >
        {isSnippetToolbar && <SnippetActionToolbar onClose={handleActionToolbarClose} />}

        {isLinkToolbar && !isLinkSearchEnabled && (
          <LinkInput
            href={href}
            cancel={handleActionToolbarClose}
            update={(url) => {
              editor.update(() => {
                $applyLinkToSelection(editor, url)
              })
              handleActionToolbarClose()
            }}
          />
        )}

        {showTextToolbar && (
          <FormatToolbar
            editor={editor}
            hiddenFormats={hiddenFormats}
            isLinkSelected={!!href || (isLinkSearchEnabled && isLinkToolbar)}
            isSnippetsEnabled={isSnippetsEnabled}
            onLinkClick={onOpenLink}
            onSnippetClick={onOpenSnippet}
          />
        )}
      </FloatingToolbar>

      {isLinkSearchToolbarVisible && (
        <LinkActionToolbarWithSearch anchorElem={anchorElem} href={href} onClose={handleActionToolbarClose} />
      )}
    </>
  )
}
