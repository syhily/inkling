import React from 'react'

export interface SnippetActionToolbarProps {
  onClose?: () => void
  onInsert?: (value: string) => void
  value?: string
  isLoading?: boolean
  dataTestId?: string
}

export function SnippetActionToolbar({
  onClose,
  onInsert,
  value = '',
  isLoading,
  dataTestId,
}: SnippetActionToolbarProps) {
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      onClose?.()
    }
  }

  return (
    <div className="gap-2 flex items-center" data-testid={dataTestId} onKeyDown={handleKeyDown}>
      <input
        className="rounded-md border-grey-300 bg-white px-3 py-2 text-sm font-sans text-grey-900 placeholder:text-grey-500 focus:border-green dark:border-grey-800 dark:bg-grey-900 dark:text-white flex-1 border focus:outline-none"
        data-testid={`${dataTestId}-input`}
        placeholder="Search snippets..."
        type="text"
        value={value ?? ''}
      />
      <button
        className="rounded-md bg-green px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
        data-testid={`${dataTestId}-insert`}
        type="button"
        onClick={() => onInsert?.(value)}
      >
        Insert
      </button>
      {onClose && (
        <button
          className="rounded-md bg-grey-200 px-3 py-2 text-sm font-medium text-grey-700 hover:bg-grey-300 dark:bg-grey-800 dark:text-grey-300 dark:hover:bg-grey-700"
          data-testid={`${dataTestId}-close`}
          type="button"
          onClick={onClose}
        >
          Close
        </button>
      )}
    </div>
  )
}
