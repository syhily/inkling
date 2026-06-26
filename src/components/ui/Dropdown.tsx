import React from 'react'

import ArrowIcon from '@/assets/icons/inkling-arrow-down.svg?react'
import { DropdownContainer } from '@/components/ui/DropdownContainer'
import { KeyboardSelection } from '@/components/ui/KeyboardSelection'

export interface DropdownMenuItem {
  label: string
  name: string
  icon?: string
  [key: string]: unknown
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
  const [filter, setFilter] = React.useState<string>('')
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const selectedItem = menu.find((item) => item.name === value)

  const handleOpen = (): void => {
    setOpen(!open)
  }

  const handleSelect = (item: DropdownMenuItem): void => {
    onChange?.(item.name)
    setOpen(false)
    setFilter('')
  }

  const getItem = (item: DropdownMenuItem, selected: boolean): React.ReactElement => {
    return (
      <li
        key={item.name}
        className={`px-3 py-2 hover:bg-grey-100 dark:hover:bg-grey-900 cursor-pointer ${selected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
        data-testid={`${dataTestId}-option-${item.name}`}
        onClick={() => handleSelect(item)}
      >
        {item.label}
      </li>
    )
  }

  const filteredMenu = filter ? menu.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase())) : menu

  return (
    <div ref={containerRef} className="relative" data-testid={dataTestId}>
      <div
        className={`rounded-lg px-3 py-2 flex w-full cursor-pointer items-center justify-between border ${open ? 'border-green bg-white dark:bg-grey-925' : 'border-grey-100 bg-grey-100 dark:bg-grey-900 dark:hover:bg-grey-925 dark:border-transparent'}`}
        onClick={handleOpen}
      >
        <span className="text-sm text-grey-900 dark:text-white">
          {selectedItem?.label ?? placeholder ?? 'Select...'}
        </span>
        <ArrowIcon className={`size-2 text-grey-900 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <DropdownContainer dataTestId={''}>
          <KeyboardSelection {...{ getItem, items: filteredMenu, onSelect: handleSelect }} />
        </DropdownContainer>
      )}
    </div>
  )
}
