import React from 'react'

export interface LinkActionToolbarProps {
  href?: string
  onEdit?: () => void
  onRemove?: () => void
  onClose?: () => void
  dataTestId?: string
  children?: React.ReactNode
}

export function LinkActionToolbar({ href, onEdit, onRemove, dataTestId, children }: LinkActionToolbarProps) {
  return (
    <div className="gap-2 flex items-center" data-testid={dataTestId}>
      {href && (
        <a
          className="text-sm text-green max-w-[200px] truncate hover:underline"
          data-testid={`${dataTestId}-link`}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {href}
        </a>
      )}
      {onEdit && (
        <button
          className="rounded-md bg-grey-200 px-2 py-1 text-xs font-medium text-grey-700 hover:bg-grey-300 dark:bg-grey-800 dark:text-grey-300 dark:hover:bg-grey-700"
          data-testid={`${dataTestId}-edit`}
          type="button"
          onClick={onEdit}
        >
          Edit
        </button>
      )}
      {onRemove && (
        <button
          className="rounded-md bg-red/10 px-2 py-1 text-xs font-medium text-red hover:bg-red/20"
          data-testid={`${dataTestId}-remove`}
          type="button"
          onClick={onRemove}
        >
          Remove
        </button>
      )}
      {children}
    </div>
  )
}
