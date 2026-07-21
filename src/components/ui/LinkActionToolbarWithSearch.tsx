import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createRangeSelection, $getSelection, $isRangeSelection, $isTextNode, $setSelection } from 'lexical'
import React from 'react'

import { LinkInputWithSearch } from '@/components/ui/LinkInputWithSearch'
import Portal from '@/components/ui/Portal'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useSelectionAnchoredPopup } from '@/hooks/useSelectionAnchoredPopup'
import trackEvent from '@/utils/analytics'
import { isInternalUrl } from '@/utils/isInternalUrl'
import { createSelectionAnchor } from '@/utils/selection-anchored-popup'

interface LinkActionToolbarWithSearchProps {
  anchorElem: HTMLElement
  href?: string
  onClose: () => void
}

export function LinkActionToolbarWithSearch({ anchorElem, href, onClose }: LinkActionToolbarWithSearchProps) {
  const [editor] = useLexicalComposerContext()
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)

  const linkToolbarRef = React.useRef<HTMLDivElement | null>(null)

  // Position the link input and search results below the selected text,
  // flipping above it at the bottom of the document; the deep module owns
  // rect resolution and the flip.
  const anchor = React.useMemo(() => createSelectionAnchor(editor), [editor])
  const containerRect = React.useCallback(() => anchorElem.parentElement?.getBoundingClientRect() ?? null, [anchorElem])
  useSelectionAnchoredPopup({ editor, popupRef: linkToolbarRef, anchor, containerRect, aboveGap: 55 })

  const onLinkUpdate = (updatedHref: string, type?: string) => {
    editor.update(() => {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, updatedHref || null)

      // remove selection to avoid format menu popup
      const selection = $getSelection()
      if (selection && $isRangeSelection(selection)) {
        const focusNode = selection.focus.getNode()
        if (!$isTextNode(focusNode)) {
          return
        }
        const rangeSelection = $createRangeSelection()
        rangeSelection.setTextNodeRange(
          focusNode,
          focusNode.getTextContentSize(),
          focusNode,
          focusNode.getTextContentSize(),
        )
        $setSelection(rangeSelection)
      }

      onClose()

      if (type === 'internal' || type === 'default') {
        trackEvent('Link dropdown: Internal link chosen', { context: 'text', fromLatest: type === 'default' })
      } else {
        try {
          const target = isInternalUrl(updatedHref, cardConfig?.siteUrl) ? 'internal' : 'external'
          trackEvent('Link dropdown: URL entered', { context: 'text', target })
        } catch {
          // noop
        }
      }
    })
  }

  return (
    <Portal>
      <div ref={linkToolbarRef} className="not-inkling-prose fixed z-[10000]">
        <LinkInputWithSearch cancel={onClose} href={href} update={onLinkUpdate} />
      </div>
    </Portal>
  )
}
