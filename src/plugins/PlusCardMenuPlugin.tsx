import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isParagraphNode, $isRangeSelection, $setSelection, type LexicalEditor } from 'lexical'
import React from 'react'

import { CardMenu } from '@/components/ui/CardMenu'
import { PlusButton, PlusMenu } from '@/components/ui/PlusMenu'
import { useCardMenu } from '@/hooks/useCardMenu'
import { useCardMenuSession } from '@/hooks/useCardMenuSession'
import { getSelectedNode } from '@/utils/getSelectedNode'

function usePlusCardMenu(editor: LexicalEditor): React.ReactElement | null {
  // the popup session (cursor lease, close policy, Escape/outside-mousedown)
  // lives in useCardMenuSession; this plugin keeps the plus-button trigger and
  // its anchoring. cachedRange here is the button's anchor — a copy is leased
  // to the session when the menu opens so closes can release it without
  // losing the button's position.
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

  const updateButton = React.useCallback(() => {
    editor.getEditorState().read(() => {
      if (editor.isComposing()) {
        return
      }

      const selection = $getSelection()

      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        hideButton()
        return
      }

      const node = getSelectedNode(selection)

      if (!$isParagraphNode(node) || node.getTextContent() !== '') {
        hideButton()
        return
      }

      const nativeSelection = window.getSelection()
      const p = nativeSelection?.anchorNode
      const rootElement = editor.getRootElement()

      if (!p || !(p instanceof Element) || p.tagName !== 'P' || !rootElement?.contains(p)) {
        hideButton()
        return
      }

      setTopPosition(getTopPosition(p))
      showButton(p)
    })
  }, [editor, showButton, hideButton])

  const { cardMenu, insert: insertCardItem } = useCardMenu(editor)

  const insert = React.useCallback(
    (insertCommand: unknown, params: { insertParams?: Record<string, unknown> } = {}): void => {
      insertCardItem(insertCommand, params)
      closeMenu()
    },
    [insertCardItem, closeMenu],
  )

  React.useEffect(() => {
    return editor.registerUpdateListener(() => {
      updateButton()
    })
  }, [editor, updateButton])

  const hideButtonOnOutsideSelection = React.useCallback(() => {
    if (isShowingButton) {
      const nativeSelection = window.getSelection()

      if (isShowingMenu && containerRef.current?.contains(nativeSelection?.anchorNode ?? null)) {
        return
      }

      const rootElement = editor.getRootElement()
      const anchorNode = nativeSelection?.anchorNode

      if (!anchorNode || !rootElement?.contains(anchorNode)) {
        hideButton()
      }
    }
  }, [editor, isShowingButton, isShowingMenu, hideButton, containerRef])

  React.useEffect(() => {
    document.addEventListener('selectionchange', hideButtonOnOutsideSelection)
    return () => {
      document.removeEventListener('selectionchange', hideButtonOnOutsideSelection)
    }
  }, [hideButtonOnOutsideSelection])

  const updateButtonOnMousemove = React.useCallback(
    (event: MouseEvent) => {
      if (isShowingMenu) {
        return
      }

      const rootElement = editor.getRootElement()
      if (!rootElement) {
        return
      }
      let { pageX, pageY } = event

      const containerRect = rootElement.getBoundingClientRect()
      if (pageX < containerRect.left) {
        pageX = pageX + 40
      }

      const hoveredElem = document.elementFromPoint(pageX, pageY)

      if (hoveredElem && rootElement.contains(hoveredElem) && !hoveredElem.closest('[data-inkling-card]')) {
        if (hoveredElem.tagName === 'P' && hoveredElem.textContent === '') {
          setTopPosition(getTopPosition(hoveredElem))
          showButton(hoveredElem)
        } else {
          updateButton()
        }
      }
    },
    [editor, isShowingMenu, setTopPosition, showButton, updateButton],
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
            <CardMenu closeMenu={closeMenu} insert={insert} items={cardMenu.items} />
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
