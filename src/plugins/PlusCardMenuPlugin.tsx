import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $setSelection, type LexicalEditor } from 'lexical'
import React from 'react'

import { CardMenu } from '@/components/ui/CardMenu'
import { PlusButton, PlusMenu } from '@/components/ui/PlusMenu'
import { useCardMenu } from '@/hooks/useCardMenu'
import { useCardMenuSession } from '@/hooks/useCardMenuSession'
import {
  registerPlusCardMenuTrigger,
  resolvePlusHoverButtonVerdict,
  shouldHidePlusButtonOnSelectionChange,
  type PlusButtonVerdict,
} from '@/plugins/behaviour/card-menu-trigger'

function usePlusCardMenu(editor: LexicalEditor): React.ReactElement | null {
  // the popup session (cursor lease, close policy, Escape/outside-mousedown)
  // lives in useCardMenuSession and the trigger policy (caret/hover verdicts,
  // the selectionchange hide rule) in @/plugins/behaviour/card-menu-trigger;
  // this plugin keeps the mousemove/selectionchange wiring and the button's
  // anchoring. cachedRange here is the button's anchor — a copy is leased to
  // the session when the menu opens so closes can release it without losing
  // the button's position.
  const {
    containerRef,
    isOpen: isShowingMenu,
    openMenu: openSessionMenu,
    closeMenu,
    saveCursor,
    restoreCursor,
  } = useCardMenuSession()
  const [isShowingButton, setIsShowingButton] = React.useState<boolean>(false)
  const [topPosition, setTopPosition] = React.useState<number>(0)
  const [cachedRange, setCachedRange] = React.useState<Range | null>(null)

  function getTopPosition(elem: Element): number {
    const elemRect = elem.getBoundingClientRect()
    const parent = elem.parentElement
    if (!parent) {
      return 0
    }
    const containerRect = parent.getBoundingClientRect()
    return elemRect.top - containerRect.top
  }

  function getElementRange(elem: Element): Range {
    const range = new Range()
    range.setStart(elem, 0)
    range.setEnd(elem, 0)
    return range
  }

  const showButton = React.useCallback(
    (elem: Element) => {
      const range = getElementRange(elem)
      setCachedRange(range)
      setIsShowingButton(true)
    },
    [setIsShowingButton, setCachedRange],
  )

  const hideButton = React.useCallback(() => {
    setIsShowingButton(false)
    setCachedRange(null)
    closeMenu()
  }, [setIsShowingButton, setCachedRange, closeMenu])

  const openMenu = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.preventDefault()

      editor.update(
        () => {
          $setSelection(null)
        },
        { discrete: true },
      )

      saveCursor(cachedRange)
      restoreCursor()
      openSessionMenu()
    },
    [editor, cachedRange, saveCursor, restoreCursor, openSessionMenu],
  )

  // apply a trigger verdict: anchor the button to the verdict's paragraph or
  // hide it (a null verdict — composing, hover outside the editor — is
  // filtered before this runs)
  const applyButtonVerdict = React.useCallback(
    (verdict: PlusButtonVerdict) => {
      if (verdict.type === 'show') {
        setTopPosition(getTopPosition(verdict.paragraph))
        showButton(verdict.paragraph)
      } else {
        hideButton()
      }
    },
    [showButton, hideButton],
  )

  const { cardMenu, insert: insertCardItem } = useCardMenu(editor)

  const insert = React.useCallback(
    (insertCommand: unknown, params: { insertParams?: Record<string, unknown> } = {}): void => {
      insertCardItem(insertCommand, params)
      closeMenu()
    },
    [insertCardItem, closeMenu],
  )

  // the caret-based button verdicts arrive through the trigger registration
  React.useEffect(() => {
    return registerPlusCardMenuTrigger(editor, { onVerdict: applyButtonVerdict })
  }, [editor, applyButtonVerdict])

  const hideButtonOnOutsideSelection = React.useCallback(() => {
    if (!isShowingButton) {
      return
    }

    const shouldHide = shouldHidePlusButtonOnSelectionChange(
      window.getSelection()?.anchorNode ?? null,
      editor.getRootElement(),
      isShowingMenu ? containerRef.current : null,
    )

    if (shouldHide) {
      hideButton()
    }
  }, [editor, isShowingButton, isShowingMenu, hideButton, containerRef])

  React.useEffect(() => {
    document.addEventListener('selectionchange', hideButtonOnOutsideSelection)
    return () => {
      document.removeEventListener('selectionchange', hideButtonOnOutsideSelection)
    }
  }, [hideButtonOnOutsideSelection])

  // the hover policy (elementFromPoint hit-testing, the left-gutter fudge)
  // lives in the trigger module; this is only the mousemove wiring
  const updateButtonOnMousemove = React.useCallback(
    (event: MouseEvent) => {
      if (isShowingMenu) {
        return
      }

      const verdict = resolvePlusHoverButtonVerdict(editor, event.pageX, event.pageY)

      if (verdict) {
        applyButtonVerdict(verdict)
      }
    },
    [editor, isShowingMenu, applyButtonVerdict],
  )

  React.useEffect(() => {
    window.addEventListener('mousemove', updateButtonOnMousemove)
    return () => {
      window.removeEventListener('mousemove', updateButtonOnMousemove)
    }
  }, [updateButtonOnMousemove])

  // arrows close the menu (leaving the cursor alone); Escape and
  // outside-mousedown are owned by the session
  const handleKeydown = React.useCallback(
    (event: KeyboardEvent) => {
      if (isShowingMenu) {
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
        if (arrowKeys.includes(event.key)) {
          closeMenu()
        }
      }
    },
    [isShowingMenu, closeMenu],
  )

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [handleKeydown])

  const style: React.CSSProperties = {
    top: `${topPosition}px`,
  }

  if (cardMenu.items.length === 0) {
    return null
  }

  if (isShowingButton) {
    return (
      <div ref={containerRef} className="absolute z-50" style={style} data-inkling-plus-container>
        <PlusButton onClick={openMenu} />
        {isShowingMenu && (
          <PlusMenu>
            <CardMenu closeMenu={closeMenu} insert={insert} sections={cardMenu.sections} />
          </PlusMenu>
        )}
      </div>
    )
  } else {
    return null
  }
}

export default function PlusCardMenuPlugin(): React.ReactElement | null {
  const [editor] = useLexicalComposerContext()
  return usePlusCardMenu(editor)
}
