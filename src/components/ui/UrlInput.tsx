import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND } from 'lexical'
import React from 'react'

import CloseIcon from '@/assets/icons/inkling-close.svg?react'

export interface UrlInputProps {
  dataTestId?: string
  handleClose?: () => void
  handlePasteAsLink?: (href: string) => void
  handleRetry?: () => void
  handleUrlChange?: (value: string) => void
  handleUrlSubmit?: (event: React.KeyboardEvent<HTMLInputElement> | KeyboardEvent | null) => void
  hasError?: boolean
  isLoading?: boolean
  placeholder?: string
  value?: string
}

// submits the URL on Enter even when focus is in the main editor rather
// than the input (e.g. right after pasting a URL into the editor)
function UrlInputPlugin({ onEnter }: { onEnter?: (event: KeyboardEvent | null) => void }) {
  const composerContext = React.useContext(LexicalComposerContext)
  const editor = composerContext?.[0]

  React.useEffect(() => {
    if (!editor || !onEnter) {
      return
    }

    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        onEnter(event)
        return false
      },
      COMMAND_PRIORITY_LOW,
    )
  }, [editor, onEnter])

  return null
}

export function UrlInput({
  dataTestId,
  handleClose,
  handlePasteAsLink,
  handleRetry,
  handleUrlChange,
  handleUrlSubmit,
  hasError,
  isLoading,
  placeholder,
  value = '',
}: UrlInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    handleUrlChange?.(event.target.value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      handleUrlSubmit?.(event)
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      handleClose?.()
    }
  }

  React.useEffect(() => {
    if (!hasError) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleClose?.()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [hasError, handleClose])

  if (isLoading) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-md border border-grey-300 p-2 font-sans text-sm leading-snug font-normal text-grey-900 focus-visible:outline-none dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800"
        data-testid={`${dataTestId}-loading-container`}
      >
        <div
          className="mr-3 -ml-1 inline-block size-5 animate-spin rounded-full border-4 border-green/20 text-white after:mt-[11px] after:block after:size-1 after:rounded-full after:bg-green/70 after:content-['']"
          data-testid={`${dataTestId}-loading-spinner`}
        ></div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div
        className="min-width-[500px] flex flex-row items-center justify-between rounded-md border border-grey-300 px-3 py-2 text-sm leading-snug font-normal text-grey-900"
        data-testid={`${dataTestId}-error-container`}
      >
        <div>
          <span className="mr-3" data-testid={`${dataTestId}-error-message`}>
            Oops, that link didn&apos;t work.
          </span>
          <button
            className="mr-3 cursor-pointer"
            data-testid={`${dataTestId}-error-retry`}
            type="button"
            onClick={handleRetry}
          >
            <span className="font-semibold underline">Retry</span>
          </button>
          <button
            className="mr-3 cursor-pointer"
            data-testid={`${dataTestId}-error-pasteAsLink`}
            type="button"
            onClick={() => handlePasteAsLink?.(value)}
          >
            <span className="font-semibold underline">Paste URL as link</span>
          </button>
        </div>
        {handleClose && (
          <button
            className="ml-2 cursor-pointer p-1"
            data-testid={`${dataTestId}-error-close`}
            type="button"
            onClick={handleClose}
          >
            <CloseIcon className="size-4 stroke-2 text-grey-400" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full items-center rounded-md border border-grey-300 px-3 py-2 text-sm leading-snug font-normal text-grey-900 focus-within:border-green focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(48,207,67,.25)] focus-visible:outline-none dark:border-grey-800 dark:bg-grey-900 dark:placeholder:text-grey-800">
      <UrlInputPlugin onEnter={handleUrlSubmit} />
      <input
        autoFocus
        className="w-full bg-transparent text-sm outline-none"
        data-testid={dataTestId}
        placeholder={placeholder ?? 'Paste URL...'}
        type="text"
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {handleClose && (
        <button className="ml-2 cursor-pointer" data-testid={`${dataTestId}-close`} type="button" onClick={handleClose}>
          ✕
        </button>
      )}
    </div>
  )
}
