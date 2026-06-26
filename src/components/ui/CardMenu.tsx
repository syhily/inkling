import React from 'react'

import ExternalLinkIcon from '@/assets/icons/inkling-help.svg?react'
import TrashCardIcon from '@/assets/icons/inkling-trash.svg?react'

export interface CardMenuItemData {
  label?: string
  name?: string
  type?: string
  icon?: string
  insertCommand?: unknown
  insertParams?: Record<string, unknown>
  queryParams?: Record<string, unknown>
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  dataTestId?: string
  customContent?: React.ReactNode
  hidden?: boolean
  disabled?: boolean
  shortcut?: string
  desc?: string
  onRemove?: () => void
  [key: string]: unknown
}

export interface CardMenuItemProps {
  label?: string
  desc?: string
  icon?: string
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  isSelected?: boolean
  scrollToItem?: boolean
  dataTestId?: string
  dataItemId?: number
  shortcut?: string
  onClick?: (event: React.MouseEvent) => void
  onRemove?: () => void
  customContent?: React.ReactNode
  'data-inkling-cardmenu-idx'?: number
}

export const CardMenuItem = ({
  label,
  desc,
  Icon,
  isSelected,
  scrollToItem,
  dataTestId,
  dataItemId,
  shortcut,
  onClick,
  onRemove,
  customContent,
  ...props
}: CardMenuItemProps) => {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (scrollToItem && buttonRef.current) {
      buttonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [scrollToItem])

  if (customContent) {
    return <li>{customContent}</li>
  }

  // browsers will move focus on mouseDown but we don't want that because it
  // removes focus from the editor meaning key commands don't work as
  // expected after a card is inserted
  const preventMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
  }

  return (
    <li
      className={`mb-0 ${isSelected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
      data-testid={dataTestId}
      onClick={onClick}
      {...props}
    >
      <button
        ref={buttonRef}
        className={`group gap-3 px-2 text-grey-800 hover:bg-grey-100 dark:hover:bg-grey-900 md:rounded-md flex w-full cursor-pointer flex-row items-center border border-transparent py-[.6rem] text-left ${isSelected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
        data-inkling-card-menu-item={label}
        data-inkling-cardmenu-idx={dataItemId}
        data-inkling-cardmenu-selected={isSelected}
        role="menuitem"
        type="button"
        onMouseDown={preventMouseDown}
      >
        {Icon && (
          <div className="size-7 rounded-md bg-white text-grey-900 dark:text-grey-500 flex shrink-0 items-center justify-center dark:bg-transparent">
            <Icon className="size-[1.8rem]" />
          </div>
        )}
        <div className="flex w-full justify-between">
          <div className="flex flex-col items-start">
            <div className="m-0 font-medium leading-snug text-grey-900 dark:text-grey-200 truncate text-[1.35rem] tracking-[.02rem]">
              {label}
            </div>
            {desc && (
              <div className="m-0 font-medium leading-snug text-grey-500 dark:text-grey-200 truncate text-[1.35rem] tracking-[.02rem]">
                {desc}
              </div>
            )}
          </div>
          {shortcut && (
            <div className="m-0 font-medium leading-snug text-grey-500 dark:text-grey-200 invisible truncate text-[1.35rem] tracking-[.02rem] group-hover:visible">
              {shortcut}
            </div>
          )}
        </div>
      </button>
      {onRemove && (
        <button
          className="text-xs text-red ml-auto"
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          Remove
        </button>
      )}
    </li>
  )
}

export interface CardMenuSectionProps {
  label: string
  children?: React.ReactNode
}

export const CardMenuSection = ({ label, children }: CardMenuSectionProps) => {
  let helpLink = ''
  if (label === 'Primary') {
    helpLink = 'https://inkling.local/help/cards/'
  } else if (label === 'Snippets') {
    helpLink = 'https://inkling.local/help/snippets/'
  }

  return (
    <li
      className="border-grey-200 font-semibold tracking-wide text-grey-600 dark:border-grey-900 dark:text-grey-600 flex shrink-0 flex-col justify-center border-t text-[1.1rem] first-of-type:border-t-0"
      role="separator"
    >
      <span
        className="px-4 pb-2 pt-3 flex items-center justify-between uppercase"
        data-card-menu-section="label"
        style={{ minWidth: 'calc(100% - 3.2rem)' }}
      >
        {label}
        {helpLink && (
          <a href={helpLink} rel="noreferrer" target="_blank">
            <ExternalLinkIcon className="-m-1 size-6 p-1 hover:text-green-600 cursor-pointer transition-all" />
          </a>
        )}
      </span>
      <ul className="md:grid md:gap-y-[.2rem] md:px-2" role="menu">
        {children}
      </ul>
    </li>
  )
}

export interface CardSnippetItemProps {
  label?: string
  dataTestId?: string
  dataItemId?: number
  isSelected?: boolean
  scrollToItem?: boolean
  onClick?: (event: React.MouseEvent) => void
  onRemove?: () => void
}

export const CardSnippetItem = ({
  label,
  dataTestId,
  dataItemId,
  isSelected,
  scrollToItem,
  onClick,
  onRemove,
}: CardSnippetItemProps) => {
  const itemRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (scrollToItem && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [scrollToItem])

  const handleMouseDown = (event: React.MouseEvent) => {
    // prevent menu closing before snippet insertion
    event.stopPropagation()
    event.preventDefault()
  }

  return (
    <li className="mb-0 min-w-0 md:col-span-2" data-testid={dataTestId} onClick={onClick}>
      <div
        ref={itemRef}
        className={`inkling-cardmenu-card-hover group min-w-0 rounded-md px-2 py-1 text-grey-800 hover:bg-grey-100 dark:hover:bg-grey-900 flex w-full cursor-pointer flex-row items-center border border-transparent ${isSelected ? 'bg-grey-100 dark:bg-grey-900' : ''}`}
        data-inkling-cardmenu-idx={dataItemId}
        data-inkling-cardmenu-selected={isSelected}
        role="menuitem"
        tabIndex={-1}
        onMouseDown={handleMouseDown}
      >
        <div className="m-0 ml-4 min-w-0 font-medium leading-snug text-grey-900 dark:text-grey-200 flex-1 truncate text-[1.35rem] tracking-[.02rem]">
          {label}
        </div>
        {onRemove && (
          <button
            className="rounded-md hover:bg-grey-200 dark:hover:bg-grey-950 ml-auto shrink-0 cursor-pointer p-[4px] group-hover:block"
            title="Remove snippet"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <TrashCardIcon className="stroke-red text-red size-[1.8rem] stroke-[1.5]" />
            <span className="sr-only">Remove</span>
          </button>
        )}
      </div>
    </li>
  )
}

export interface CardMenuProps {
  menu?: Map<string, CardMenuItemData[]>
  insert?: (
    insertCommand?: unknown,
    params?: { insertParams?: Record<string, unknown>; queryParams?: Record<string, unknown> },
  ) => void
  selectedItemIndex?: number
  scrollToSelectedItem?: boolean
  closeMenu?: () => void
}

export const CardMenu = ({
  menu = new Map() as Map<string, CardMenuItemData[]>,
  insert = () => {},
  selectedItemIndex = 0,
  scrollToSelectedItem = false,
}: CardMenuProps) => {
  const CardMenuSections: React.ReactElement[] = []

  let itemIndex = 0
  for (const [sectionLabel, items] of menu) {
    const CardMenuItems: React.ReactElement[] = []

    items.forEach((item) => {
      const isSelected = itemIndex === selectedItemIndex
      const onClick = (event: React.MouseEvent): void => {
        event.preventDefault()
        event.stopPropagation()
        insert?.(item.insertCommand, {
          insertParams: item.insertParams as Record<string, unknown>,
          queryParams: item.queryParams,
        })
        trackEvent('Card Added', { card: item.label ?? 'unknown' })
      }

      if (!item.type || item.type === 'card') {
        CardMenuItems.push(
          <CardMenuItem
            key={itemIndex}
            Icon={item.Icon}
            data-inkling-cardmenu-idx={itemIndex}
            data-testid={item.dataTestId}
            dataItemId={itemIndex}
            desc={item.desc}
            isSelected={isSelected}
            label={item.label}
            scrollToItem={isSelected && scrollToSelectedItem}
            shortcut={item.shortcut}
            onClick={onClick}
          />,
        )
      } else if (item.type === 'snippet') {
        CardMenuItems.push(
          <CardSnippetItem
            key={itemIndex}
            dataItemId={itemIndex}
            data-testid={item.dataTestId}
            isSelected={isSelected}
            label={item.label}
            scrollToItem={isSelected && scrollToSelectedItem}
            onClick={onClick}
            onRemove={item.onRemove as () => void}
          />,
        )
      }

      itemIndex += 1
    })

    CardMenuSections.push(
      <CardMenuSection key={sectionLabel} label={sectionLabel}>
        {CardMenuItems}
      </CardMenuSection>,
    )
  }

  return (
    <ul
      className="not-inkling-prose m-0 mb-3 scroll-p-2 rounded-lg bg-white p-0 font-sans text-sm shadow-md after:pb-1 dark:bg-grey-950 md:w-[348px] z-[9999999] max-h-[420px] w-[312px] flex-col overflow-x-hidden overflow-y-auto bg-clip-padding after:block"
      data-inkling-card-menu
      role="menu"
    >
      {CardMenuSections}
    </ul>
  )
}

function trackEvent(_card: string, _props: Record<string, unknown>): void {
  // TODO: integrate with analytics provider
}
