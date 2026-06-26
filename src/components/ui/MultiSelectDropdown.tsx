import React from 'react'

import ArrowIcon from '@/assets/icons/inkling-arrow-down.svg?react'
import CloseIcon from '@/assets/icons/inkling-close.svg?react'
import { DropdownContainer } from '@/components/ui/DropdownContainer'
import { KeyboardSelection } from '@/components/ui/KeyboardSelection'

interface MultiSelectItem {
  name: string
  label: string | React.ReactElement
}

interface ItemProps {
  item: MultiSelectItem
  selected: boolean
  onChange: (item: MultiSelectItem) => void
}

function Item({ item, selected, onChange }: ItemProps) {
  let selectionClass = ''

  if (selected) {
    selectionClass = 'bg-grey-100 dark:bg-grey-900'
  }

  const handleOptionMouseDown = (event: React.MouseEvent): void => {
    event.preventDefault()
    onChange(item)
  }

  return (
    <li key={item.name} className={`${selectionClass} m-0 hover:bg-grey-100 dark:hover:bg-grey-900`}>
      <button
        className="px-3 dark:text-white size-full cursor-pointer py-[7px] text-left"
        data-testid="multiselect-dropdown-item"
        type="button"
        onMouseDownCapture={handleOptionMouseDown}
      >
        {item.label}
      </button>
    </li>
  )
}

export interface MultiSelectDropdownProps {
  placeholder?: string
  items?: string[]
  availableItems?: string[]
  onChange: (items: string[]) => void
  dataTestId?: string
  allowAdd?: boolean
}

export function MultiSelectDropdown({
  placeholder = '',
  items = [],
  availableItems = [],
  onChange,
  dataTestId,
  allowAdd = true,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState<boolean>(false)
  const [filter, setFilter] = React.useState<string>('')
  const [isFocused, setIsFocused] = React.useState<boolean>(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const handleOpen = (event?: React.MouseEvent): void => {
    setOpen(!open)

    if (!open && event) {
      ;(event.target as HTMLElement).focus()
    }
  }

  const handleBlur = (): void => {
    setOpen(false)
    setFilter('')
    setIsFocused(false)
  }

  const handleFocus = (): void => {
    setIsFocused(true)
    handleOpen()
  }

  const handleSelect = (item: MultiSelectItem): void => {
    if (!item.name || items?.includes(item.name)) {
      return
    }

    onChange(items.concat(item.name))
    setFilter('')
  }

  const handleDeselect = (event: React.MouseEvent, selectedItem: MultiSelectItem): void => {
    event.preventDefault()
    event.stopPropagation()

    onChange(items.filter((selection) => selection !== selectedItem.name))
  }

  const handleBackspace = (event: React.KeyboardEvent): void => {
    if (event.key === 'Backspace' && !filter) {
      onChange(items.slice(0, -1))
    }
  }

  const getItem = (item: MultiSelectItem, selected: boolean): React.ReactElement => {
    return <Item key={item.name} item={item} selected={selected} onChange={handleSelect} />
  }

  const selectedItems: MultiSelectItem[] = items.map((item) => ({ name: item, label: item }))
  const nonSelectedItems: MultiSelectItem[] = availableItems
    .map((item) => ({ name: item, label: item }))
    .filter((ai) => !selectedItems.some((ii) => ii.name === ai.name))

  const filteredItems: MultiSelectItem[] = nonSelectedItems.filter((item) =>
    item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
  )
  const defaultSelected = filteredItems[0]

  if (filter && allowAdd) {
    const exactMatch =
      items.find((item) => item.toLocaleLowerCase() === filter.toLocaleLowerCase()) ||
      availableItems.find((item) => item.toLocaleLowerCase() === filter.toLocaleLowerCase())
    if (!exactMatch) {
      filteredItems.unshift({
        name: filter,
        label: (
          <>
            Add <strong>&quot;{filter}&quot;...</strong>
          </>
        ),
      })
    }
  }

  return (
    <div className="font-sans text-sm font-normal relative z-0" data-testid={dataTestId}>
      <div
        className={`gap-1 rounded-lg relative flex w-full cursor-text flex-wrap border ${isFocused ? 'border-green bg-white dark:bg-grey-925 shadow-[0_0_0_2px_rgba(48,207,67,.25)]' : 'border-grey-100 bg-grey-100 dark:bg-grey-900 dark:hover:bg-grey-925 dark:border-transparent'} py-2 pr-5 font-sans text-sm font-normal text-grey-900 placeholder:text-grey-500 dark:text-white dark:selection:bg-grey-800 dark:placeholder:text-grey-700 px-[10px] leading-[1.5] focus-visible:outline-none`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedItems.map((item) => (
          <button
            key={item.name}
            className="gap-1.5 rounded bg-black pl-2 pr-1 text-white dark:bg-grey-100 dark:text-grey-900 flex cursor-pointer items-center py-px leading-[1.5]"
            data-testid="multiselect-dropdown-selected"
            type="button"
            onMouseDownCapture={(event) => handleDeselect(event, item)}
          >
            {item.label}
            <CloseIcon className="mt-px size-[1rem] stroke-[3]" />
          </button>
        ))}

        <div className="flex-1">
          <input
            ref={inputRef}
            className="px-0 size-full min-w-[5rem] appearance-none bg-transparent leading-none outline-none"
            placeholder={selectedItems.length === 0 ? placeholder : ''}
            value={filter}
            onBlur={handleBlur}
            onChange={(event) => setFilter(event.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleBackspace}
          />
        </div>

        <ArrowIcon className={`right-3 top-4 size-2 text-grey-900 absolute ${open && 'rotate-180'}`} />
      </div>
      {open && !!filteredItems.length && (
        <DropdownContainer>
          <KeyboardSelection {...{ defaultSelected, getItem, items: filteredItems, onSelect: handleSelect }} />
        </DropdownContainer>
      )}
    </div>
  )
}
