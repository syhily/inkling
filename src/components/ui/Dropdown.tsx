import React from 'react'

import ArrowIcon from '@/assets/icons/inkling-arrow-down.svg?react'
import { DropdownContainer } from '@/components/ui/DropdownContainer'
import { KeyboardSelection } from '@/components/ui/KeyboardSelection'

export interface DropdownMenuItem {
  label: string
  name: string
  icon?: string
}

export interface DropdownProps {
  menu?: DropdownMenuItem[]
  value?: string
  onChange?: (name: string) => void
  placeholder?: string
  dataTestId?: string
}

export function Dropdown({ menu = [], value, onChange, placeholder, dataTestId }: DropdownProps) {
  const [open, setOpen] = React.useState<boolean>(false)

  const selectedItem = menu.find((item) => item.name === value)

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setOpen(!open)

    // For Safari, we need to manually focus the button (doesn't happen by default)
    if (!open) {
      event.currentTarget.focus()
    }
  }

  // Prevent losing focus when clicking the dropdown (needed on Safari)
  const preventLoseFocus = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleBlur = (): void => {
    setOpen(false)
  }

  const handleSelect = (item: DropdownMenuItem): void => {
    onChange?.(item.name)
    setOpen(false)
  }

  const getItem = (item: DropdownMenuItem, selected: boolean): React.ReactElement => {
    return (
      <li
        key={item.name}
        className={`m-0 hover:bg-grey-100 dark:hover:bg-grey-900 ${selected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
        data-testid={`${dataTestId}-option-${item.name}`}
      >
        <button
          className="size-full cursor-pointer px-3 py-2 text-left"
          type="button"
          // Use the capture phase of mouse down, otherwise the option is removed
          // by the trigger blur before the click event fires
          onMouseDownCapture={(event) => {
            event.preventDefault()
            handleSelect(item)
          }}
        >
          {item.label}
        </button>
      </li>
    )
  }

  return (
    <div className="relative" data-testid={dataTestId}>
      <button
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left ${open ? 'border-green bg-white dark:bg-grey-925' : 'border-grey-100 bg-grey-100 dark:border-transparent dark:bg-grey-900 dark:hover:bg-grey-925'}`}
        data-testid={`${dataTestId}-value`}
        type="button"
        onBlur={handleBlur}
        onClick={handleOpen}
        onMouseDownCapture={preventLoseFocus}
      >
        <span className="text-sm text-grey-900 dark:text-white">
          {selectedItem?.label ?? placeholder ?? 'Select...'}
        </span>
        <ArrowIcon className={`size-2 text-grey-900 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <DropdownContainer>
          <KeyboardSelection {...{ defaultSelected: selectedItem, getItem, items: menu, onSelect: handleSelect }} />
        </DropdownContainer>
      )}
    </div>
  )
}
