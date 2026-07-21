import type { LexicalNode } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import type { ListOptionItem, ListOptionSection } from '@/hooks/useSearchLinks'

import { InputListGroup } from '@/components/ui/InputList'
import { KeyboardSelectionWithGroups } from '@/components/ui/KeyboardSelectionWithGroups'
import { LinkInputSearchItem } from '@/components/ui/LinkInputSearchItem'
import { useSelectionAnchoredPopup } from '@/hooks/useSelectionAnchoredPopup'
import trackEvent from '@/utils/analytics'
import { createNodeElementAnchor, POPUP_LIST_MAX_HEIGHT } from '@/utils/selection-anchored-popup'

interface AtLinkResultsPopupProps {
  atLinkNode: LexicalNode
  isSearching?: boolean
  listOptions: ListOptionSection[]
  query?: string
  onSelect: (item?: ListOptionItem) => void
}

export function AtLinkResultsPopup({ atLinkNode, isSearching, listOptions, query, onSelect }: AtLinkResultsPopupProps) {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!query) {
      trackEvent('Link dropdown: Opened', { context: 'at-link' })
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const popupRef = React.useRef<HTMLDivElement | null>(null)

  const testId = 'at-link-results'

  // Position the results popup below the at-link node, flipping above it at the
  // bottom of the document; the deep module owns rect resolution and the flip.
  const anchor = React.useMemo(() => createNodeElementAnchor(editor, atLinkNode.getKey()), [editor, atLinkNode])
  const containerRect = React.useCallback(() => editor.getRootElement()?.getBoundingClientRect() ?? null, [editor])
  useSelectionAnchoredPopup({ editor, popupRef, anchor, containerRect })

  const getItem = (item: ListOptionItem, selected: boolean, onMouseOver: () => void, scrollIntoView: boolean) => {
    return (
      <LinkInputSearchItem
        key={item.value ?? 'no-results'}
        dataTestId={testId}
        highlightString={query}
        item={item}
        scrollIntoView={scrollIntoView}
        selected={selected}
        onClick={onSelect}
        onMouseOver={onMouseOver}
      />
    )
  }

  const getGroup = (group: ListOptionSection, { showSpinner }: { showSpinner?: boolean } = {}) => {
    return <InputListGroup dataTestId={testId} group={group} showSpinner={showSpinner} />
  }

  return (
    <div ref={popupRef} className="not-inkling-prose fixed z-[10000]" data-testid="at-link-results">
      <div className="relative m-0 flex w-full flex-col rounded-lg bg-white p-1 px-2 font-sans text-sm font-medium shadow-md dark:bg-grey-950">
        <ul
          className="w-full overflow-y-auto bg-white py-1 dark:bg-grey-950"
          style={{ maxHeight: POPUP_LIST_MAX_HEIGHT }}
        >
          <KeyboardSelectionWithGroups
            getGroup={getGroup}
            getItem={getItem}
            groups={listOptions}
            isLoading={isSearching}
            onEnterWithoutSelection={onSelect}
            onSelect={onSelect}
          />
        </ul>
      </div>
    </div>
  )
}

export default AtLinkResultsPopup
