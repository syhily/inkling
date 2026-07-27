import React from 'react'

import type { SlashMenuVerdict } from '@/plugins/behaviour/card-menu-trigger'

// Card-menu session — the one owner of the popup-session behaviour the slash
// and plus card menus used to re-implement each: the cursor lease (a cached
// native Range saved while the menu is open, restored on demand), the close
// policy (Escape closes and restores the cursor because it always blurs the
// contenteditable; outside mousedown and other closes leave the cursor where
// the user put it), insert-and-close, and the slash trigger-state lifecycle
// (verdicts in through applyTriggerVerdict, { query, commandParams } out;
// every close path resets them). The native Selection arrives through an
// injected adapter so the close policy is unit-testable without a plugin
// mount. The plugins keep only their trigger wiring (slash keypress vs
// plus-button hover), their anchoring, and their rendering.

export interface CardMenuSessionSelection {
  removeAllRanges: () => void
  addRange: (range: Range) => void
}

interface UseCardMenuSessionOptions {
  /** Native selection adapter; defaults to document.getSelection(). */
  getSelection?: () => CardMenuSessionSelection | null
}

interface CloseMenuOptions {
  /** Restore the cached cursor range before closing (Escape). */
  resetCursor?: boolean
}

export function useCardMenuSession({ getSelection = () => document.getSelection() }: UseCardMenuSessionOptions = {}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const cachedRange = React.useRef<Range | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  // slash trigger state — the typed query and its command params; owned here
  // so every close path (Escape, outside mousedown, insert, verdict close)
  // resets them in one place instead of the plugin effect-watching isOpen
  const [query, setQuery] = React.useState('')
  const [commandParams, setCommandParams] = React.useState<string[]>([])

  /** Cache the cursor position the menu may later restore (the cursor lease). */
  const saveCursor = React.useCallback((range: Range | null) => {
    cachedRange.current = range
  }, [])

  const restoreCursor = React.useCallback(() => {
    if (!cachedRange.current) {
      return
    }
    const selection = getSelection()
    if (selection) {
      selection.removeAllRanges()
      selection.addRange(cachedRange.current)
    }
  }, [getSelection])

  const openMenu = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  // Closing releases the cursor lease and the trigger state: resetCursor
  // restores first (Escape), every other close leaves the cursor where the
  // user put it.
  const closeMenu = React.useCallback(
    ({ resetCursor = false }: CloseMenuOptions = {}) => {
      if (resetCursor) {
        restoreCursor()
      }
      setIsOpen(false)
      cachedRange.current = null
      setQuery('')
      setCommandParams((current) => (current.length > 0 ? [] : current))
    },
    [restoreCursor],
  )

  // Apply the slash trigger's per-update verdict: a query verdict leases the
  // cursor range and tracks the typed query; a close verdict runs the close
  // policy (which resets the trigger state above)
  const applyTriggerVerdict = React.useCallback(
    (verdict: SlashMenuVerdict) => {
      if (verdict.type === 'close') {
        closeMenu()
        return
      }
      saveCursor(verdict.cursorRange)
      setQuery(verdict.query)
      setCommandParams(verdict.commandParams)
    },
    [closeMenu, saveCursor],
  )

  /** Insert-then-close: run the insertion, then close with the default policy. */
  const insert = React.useCallback(
    (doInsert: () => void) => {
      doInsert()
      closeMenu()
    },
    [closeMenu],
  )

  // Escape closes and restores the cursor — it always blurs the
  // contenteditable, which the menu never wants.
  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu({ resetCursor: true })
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closeMenu])

  // clicks outside the menu close it (without touching the cursor)
  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleMousedown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return
      }
      closeMenu()
    }

    window.addEventListener('mousedown', handleMousedown)
    return () => {
      window.removeEventListener('mousedown', handleMousedown)
    }
  }, [isOpen, closeMenu])

  return {
    containerRef,
    isOpen,
    query,
    commandParams,
    openMenu,
    closeMenu,
    insert,
    saveCursor,
    restoreCursor,
    applyTriggerVerdict,
  }
}

export type CardMenuSession = ReturnType<typeof useCardMenuSession>
