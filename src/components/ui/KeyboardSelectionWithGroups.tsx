import React from 'react'

import type { ListOptionItem } from '@/hooks/useSearchLinks'

export interface KeyboardSelectionWithGroupsProps<T extends { value: string | null } = ListOptionItem> {
  groups: Array<{ label: string; items: T[] }>
  getItem: (item: T, selected: boolean, onMouseOver: () => void, scrollIntoView: boolean) => React.ReactElement
  getGroup: (group: { label: string; items: T[] }, options?: { showSpinner?: boolean }) => React.ReactElement
  onSelect: (item: T) => void
  onEnterWithoutSelection?: () => void
  defaultSelected?: T
  isLoading?: boolean
}

/**
 * Renders a list of options, which are selectable by using the up and down arrow keys.
 * You pass in the template for each option via the getItem function, which is called for each option and also passes in whether the item is selected or not.
 */
export function KeyboardSelectionWithGroups<T extends { value: string | null } = ListOptionItem>({
  groups,
  getItem,
  getGroup,
  onSelect,
  onEnterWithoutSelection,
  defaultSelected,
  isLoading,
}: KeyboardSelectionWithGroupsProps<T>) {
  const items = groups.flatMap((group) => group.items)
  const defaultSelectedIndex = items.findIndex((item) => item === defaultSelected)
  const defaultIndex = Math.max(0, defaultSelectedIndex)
  const [selectedIndex, setSelectedIndex] = React.useState(defaultIndex)
  const [scrollSelectedIntoView, setScrollSelectedIntoView] = React.useState(false)
  const [hasNavigated, setHasNavigated] = React.useState(false)

  // Adjust the selection during render (React discards this render's output
  // and re-renders immediately): re-select the default and reset navigation
  // state when the default changes, clamp the index when the items shrink
  const [prevDefaultIndex, setPrevDefaultIndex] = React.useState(defaultIndex)
  if (prevDefaultIndex !== defaultIndex) {
    setPrevDefaultIndex(defaultIndex)
    setSelectedIndex(defaultIndex)
    setHasNavigated(false)
  } else if (selectedIndex >= items.length && selectedIndex !== defaultIndex) {
    setSelectedIndex(defaultIndex)
  }

  const handleKeydown = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        // The stop propagation is required for Safari
        event.preventDefault()
        event.stopPropagation()
        setHasNavigated(true)
        setSelectedIndex((i) => {
          return Math.min(i + 1, items.length - 1)
        })
        setScrollSelectedIntoView(true)
      }
      if (event.key === 'ArrowUp') {
        // The stop propagation is required for Safari
        event.preventDefault()
        event.stopPropagation()
        setHasNavigated(true)
        setSelectedIndex((i) => {
          return Math.max(i - 1, 0)
        })
        setScrollSelectedIntoView(true)
      }
      if (event.key === 'Enter') {
        const selectedItem = items[selectedIndex]
        if (!selectedItem && !onEnterWithoutSelection) {
          return
        }

        // When the link input is focused and the user hasn't explicitly navigated
        // the suggestion list, let the input's own Enter handler submit the typed
        // URL instead of selecting the default suggestion.
        const target = event.target
        if (!hasNavigated && target instanceof HTMLInputElement && target.dataset.inklingLinkInput !== undefined) {
          return
        }

        // The stop propagation is required for Safari
        event.preventDefault()
        event.stopPropagation()

        if (selectedItem) {
          onSelect(selectedItem)
        } else {
          onEnterWithoutSelection?.()
        }
      }
    },
    [items, selectedIndex, onSelect, onEnterWithoutSelection, hasNavigated],
  )

  React.useEffect(() => {
    // The capture phase is required for Safari
    window.addEventListener('keydown', handleKeydown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeydown, { capture: true })
    }
  }, [handleKeydown])

  return (
    <>
      {groups.map((group, groupIndex) => (
        <React.Fragment key={group.label}>
          {getGroup(group, { showSpinner: groupIndex === 0 && isLoading })}
          {(group.items || []).map((item, index) => {
            const itemsBefore = groups.slice(0, groupIndex).reduce((sum, prevGroup) => sum + prevGroup.items.length, 0)
            const absoluteIndex = itemsBefore + index
            const isSelected = absoluteIndex === selectedIndex && !!item.value
            const onMouseOver = () => {
              if (item.value) {
                setSelectedIndex(absoluteIndex)
              }
              setScrollSelectedIntoView(false)
            }
            return getItem(item, isSelected, onMouseOver, scrollSelectedIntoView)
          })}
        </React.Fragment>
      ))}
    </>
  )
}
