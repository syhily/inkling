import React from 'react'

/**
 * Renders a list of options, which are selectable by using the up and down arrow keys.
 * You pass in the template for each option via the getItem function, which is called for each option and also passes in whether the item is selected or not.
 */
export function KeyboardSelection<T = { value?: string; label?: string }>({
  items,
  getItem,
  onSelect,
  defaultSelected,
}: {
  items: T[]
  getItem: (item: T, selected: boolean) => React.ReactElement
  onSelect: (item: T) => void
  defaultSelected?: T
}) {
  const defaultIndex = Math.max(
    0,
    items.findIndex((item: T) => item === defaultSelected),
  )
  const [selectedIndex, setSelectedIndex] = React.useState(defaultIndex)

  // Adjust the selection during render (React discards this render's output
  // and re-renders immediately): re-select the default when it changes, and
  // clamp the index back into range when the items shrink
  const [prevDefaultIndex, setPrevDefaultIndex] = React.useState(defaultIndex)
  if (prevDefaultIndex !== defaultIndex) {
    setPrevDefaultIndex(defaultIndex)
    setSelectedIndex(defaultIndex)
  } else if (selectedIndex >= items.length && selectedIndex !== defaultIndex) {
    setSelectedIndex(defaultIndex)
  }

  const handleKeydown = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        // The stop propagation is required for Safari
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((i) => {
          return Math.min(i + 1, items.length - 1)
        })
      }
      if (event.key === 'ArrowUp') {
        // The stop propagation is required for Safari
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((i) => {
          return Math.max(i - 1, 0)
        })
      }
      if (event.key === 'Enter') {
        const selectedItem = items[selectedIndex]
        if (!selectedItem) {
          return
        }

        // The stop propagation is required for Safari
        event.preventDefault()
        event.stopPropagation()
        onSelect(selectedItem)
      }
    },
    [items, selectedIndex, onSelect],
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
      {items.map((item: T, index: number) => {
        return getItem(item, index === selectedIndex)
      })}
    </>
  )
}
