import type { LexicalEditor } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
} from 'lexical'
import React from 'react'

import { CardMenu } from '@/components/ui/CardMenu'
import { SlashMenu } from '@/components/ui/SlashMenu'
import { useCardMenu } from '@/hooks/useCardMenu'
import { useCardMenuSession } from '@/hooks/useCardMenuSession'
import trackEvent from '@/utils/analytics'
import { getSelectedNode } from '@/utils/getSelectedNode'

function useSlashCardMenu(editor: LexicalEditor) {
  // the popup session (cursor lease, close policy) lives in useCardMenuSession;
  // this plugin keeps the slash trigger, the query state, and the anchoring
  const {
    containerRef,
    isOpen: isShowingMenu,
    openMenu,
    closeMenu: closeSessionMenu,
    saveCursor,
  } = useCardMenuSession()
  const [position, setPosition] = React.useState<React.CSSProperties>({})
  const [query, setQuery] = React.useState('')
  const [commandParams, setCommandParams] = React.useState<string[]>([])
  const [selectedItemIndex, setSelectedItemIndex] = React.useState(0)
  const [scrollToSelectedItem, setScrollToSelectedItem] = React.useState(false)

  const setMenuPosition = React.useCallback(
    (elem: HTMLElement | null) => {
      if (!elem) {
        return
      }

      const elemRect = elem.getBoundingClientRect()
      const containerRect = elem.parentElement?.getBoundingClientRect()
      const menuRect = containerRef.current?.getBoundingClientRect()

      if (!containerRect || !menuRect) {
        return
      }

      const wouldBeOffscreenBottom = elemRect.bottom - containerRect.top + menuRect.height > window.innerHeight
      const wouldBeOffscreenTop = elemRect.top - menuRect.height < 0

      if (wouldBeOffscreenBottom && !wouldBeOffscreenTop) {
        const bottom = containerRect.height - elem.offsetTop
        setPosition({ left: 0, bottom })
      } else {
        const top = elem.offsetTop + elemRect.height
        setPosition({ top, left: 0 })
      }
    },
    [containerRef],
  )

  function getSelectionElement(): HTMLElement | null {
    const anchorNode = window.getSelection()?.anchorNode

    if (!anchorNode) {
      return null
    }

    if (anchorNode.nodeType === Node.TEXT_NODE) {
      return anchorNode.parentElement?.closest('p') ?? null
    }

    return anchorNode instanceof HTMLElement ? anchorNode : null
  }

  // slash-specific trigger state resets whenever the session closes the menu,
  // no matter which close path fired (Escape, outside mousedown, insert, …)
  React.useEffect(() => {
    if (!isShowingMenu) {
      setQuery('')
      setCommandParams((current) => (current.length > 0 ? [] : current))
      setScrollToSelectedItem(false)
    }
  }, [isShowingMenu])

  const { cardMenu, insert: insertCardItem } = useCardMenu(editor, query, {
    commandParams,
    replaceTriggerParagraph: true,
  })

  const insert = React.useCallback(
    (insertCommand: unknown, params: { insertParams?: Record<string, unknown>; queryParams?: string[] } = {}) => {
      insertCardItem(insertCommand, params)
      closeSessionMenu()
    },
    [insertCardItem, closeSessionMenu],
  )

  // close menu if selection moves out of the slash command
  // update the search query when typing
  React.useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        // don't do anything when using IME input
        if (editor.isComposing()) {
          return
        }

        const selection = $getSelection()

        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          const nativeSelection = window.getSelection()
          const anchorParent = nativeSelection?.anchorNode?.parentNode
          const isMenuSection = anchorParent instanceof HTMLElement ? anchorParent.dataset.cardMenuSection : undefined

          // don't close the menu if the selection inside the card section
          if (isMenuSection) {
            return
          }

          closeSessionMenu()
          return
        }

        const node = getSelectedNode(selection).getTopLevelElement()

        if (!node || !$isParagraphNode(node) || !node.getTextContent().startsWith('/')) {
          closeSessionMenu()
          return
        }

        const nativeSelection = window.getSelection()
        const anchorNode = nativeSelection?.anchorNode
        const rootElement = editor.getRootElement()

        if (anchorNode?.nodeType !== Node.TEXT_NODE || !rootElement?.contains(anchorNode)) {
          closeSessionMenu()
          return
        }

        // lease the cursor range to the session so Escape can restore it —
        // Escape always blurs the contenteditable, which we don't want
        if (nativeSelection) {
          saveCursor(nativeSelection.getRangeAt(0))
        }

        // capture text after the / as a query for filtering cards
        const command = node.getTextContent().slice(1)
        const [q, ...cps] = command.split(' ')
        setQuery(q)
        setCommandParams(cps)
      })
    })
  }, [editor, isShowingMenu, closeSessionMenu, saveCursor])

  // open the menu when / is pressed on a blank paragraph
  React.useEffect(() => {
    if (isShowingMenu) {
      return
    }

    const triggerMenu = (event: KeyboardEvent) => {
      const { key, isComposing, ctrlKey, metaKey } = event

      // we only care about / presses when not composing or pressed with modifiers
      if (key !== '/' || isComposing || ctrlKey || metaKey) {
        return
      }

      // ignore if editor doesn't have focus
      const rootElement = editor.getRootElement()
      if (!rootElement?.matches(':focus')) {
        return
      }

      // potentially valid / press
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          return
        }
        const node = getSelectedNode(selection).getTopLevelElement()

        // ignore if selection is not on a top-level paragraph
        if (!node || !$isParagraphNode(node)) {
          return
        }

        const paragraphSize = node.getTextContentSize()
        const isEmptyParagraph = selection.isCollapsed() && node.getTextContent() === ''
        // if full paragraph is selected, pressing / will replace it so that's a valid press
        const isFullParagraphSelection =
          !selection.isCollapsed() &&
          ((selection.anchor.offset === 0 && selection.focus.offset === paragraphSize) ||
            (selection.anchor.offset === paragraphSize && selection.focus.offset === 0))

        if (isEmptyParagraph || isFullParagraphSelection) {
          openMenu()
        }
      })
    }

    window.addEventListener('keypress', triggerMenu)
    return () => {
      window.removeEventListener('keypress', triggerMenu)
    }
  }, [editor, isShowingMenu, openMenu])

  // capture key navigation to move/insert selected card item
  React.useEffect(() => {
    if (!isShowingMenu) {
      return
    }

    const moveUp = (event: KeyboardEvent) => {
      if (selectedItemIndex === 0) {
        setSelectedItemIndex(cardMenu.maxItemIndex)
      } else {
        setSelectedItemIndex(selectedItemIndex - 1)
      }
      setScrollToSelectedItem(true)

      event.preventDefault()
      return true
    }

    const moveDown = (event: KeyboardEvent) => {
      if (selectedItemIndex === cardMenu.maxItemIndex) {
        setSelectedItemIndex(0)
      } else {
        setSelectedItemIndex(selectedItemIndex + 1)
      }
      setScrollToSelectedItem(true)

      event.preventDefault()
      return true
    }

    const enter = (event: KeyboardEvent) => {
      // insert from the flat item list — the same data CardMenu renders — so
      // selection never depends on the menu's DOM
      const item = cardMenu.items[selectedItemIndex]
      if (item) {
        insert(item.insertCommand, item)
        trackEvent('Card Added', { card: item.label ?? 'unknown' })
      }
      event.preventDefault()
      return true
    }

    return mergeRegister(
      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, moveDown, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(KEY_ARROW_UP_COMMAND, moveUp, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, moveDown, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, moveUp, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(KEY_ENTER_COMMAND, enter, COMMAND_PRIORITY_HIGH),
    )
  }, [editor, isShowingMenu, cardMenu, selectedItemIndex, insert])

  // reset the keyboard selection whenever the menu rebuilds
  React.useEffect(() => {
    setSelectedItemIndex(0)
  }, [cardMenu])

  // attach a resize observer to call setMenuPosition when the window resizes
  React.useEffect(() => {
    if (!isShowingMenu) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      setMenuPosition(getSelectionElement())
    })
    resizeObserver.observe(window.document.body)

    return () => {
      resizeObserver.disconnect()
    }
  }, [isShowingMenu, setMenuPosition])

  // use this to position the menu based on the window size
  React.useLayoutEffect(() => {
    if (!isShowingMenu) {
      return
    }

    if (!containerRef.current) {
      return
    }

    setMenuPosition(getSelectionElement())
  }, [isShowingMenu, containerRef, setMenuPosition])

  if (cardMenu.items.length === 0) {
    return null
  }

  if (isShowingMenu) {
    return (
      <div ref={containerRef} className="absolute -left-2 z-50 mt-2" style={position} data-inkling-slash-container>
        <SlashMenu>
          <CardMenu
            closeMenu={closeSessionMenu}
            insert={insert}
            items={cardMenu.items}
            scrollToSelectedItem={scrollToSelectedItem}
            selectedItemIndex={selectedItemIndex}
          />
        </SlashMenu>
      </div>
    )
  }

  return null
}

export default function SlashCardMenuPlugin() {
  const [editor] = useLexicalComposerContext()
  return useSlashCardMenu(editor)
}
