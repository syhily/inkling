import type { LexicalEditor } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
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
import { createMenuNavigator, type MenuNavigator } from '@/hooks/card-menu-navigation'
import { useCardMenu } from '@/hooks/useCardMenu'
import { useCardMenuSession } from '@/hooks/useCardMenuSession'
import { isSlashTriggerPress, registerSlashCardMenuTrigger } from '@/plugins/behaviour/card-menu-trigger'
import trackEvent from '@/utils/analytics'

function useSlashCardMenu(editor: LexicalEditor) {
  // the popup session (cursor lease, close policy) lives in useCardMenuSession
  // and the trigger policy (valid-press grammar, query extraction, close
  // verdicts) in @/plugins/behaviour/card-menu-trigger; this plugin keeps the
  // keypress wiring, the query state, and the anchoring
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

  // the keyboard-selection state machine (wrap-around index, scroll-request
  // latch, reset-on-rebuild) lives in the headless menu navigator — created
  // once, read through its snapshot; the command handlers below call in
  const navigatorRef = React.useRef<MenuNavigator | null>(null)
  if (!navigatorRef.current) {
    navigatorRef.current = createMenuNavigator()
  }
  const menuNavigator = navigatorRef.current
  const { selectedItemIndex, scrollToSelectedItem } = React.useSyncExternalStore(
    menuNavigator.subscribe,
    menuNavigator.getSnapshot,
  )

  // positioning stays plugin-side on purpose: the selection-anchored popup
  // seam (src/utils/selection-anchored-popup.ts) positions fixed, spans the
  // container's full width, and flips on a scroll-container overflow budget —
  // this menu is absolutely positioned at natural width under the trigger
  // paragraph and flips on measured viewport overflow (only when it also fits
  // above), so routing through the seam would move the menu.
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
      menuNavigator.consumeScrollRequest()
    }
  }, [isShowingMenu, menuNavigator])

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

  // apply the trigger's update verdicts: close the menu, or lease the cursor
  // range to the session (Escape restores it — Escape always blurs the
  // contenteditable, which we don't want) and track the typed query
  React.useEffect(() => {
    return registerSlashCardMenuTrigger(editor, {
      onVerdict: (verdict) => {
        if (verdict.type === 'close') {
          closeSessionMenu()
          return
        }

        saveCursor(verdict.cursorRange)
        setQuery(verdict.query)
        setCommandParams(verdict.commandParams)
      },
    })
  }, [editor, closeSessionMenu, saveCursor])

  // open the menu when / is pressed on a blank paragraph — the valid-press
  // grammar lives in the trigger module; this is only the keypress wiring
  React.useEffect(() => {
    if (isShowingMenu) {
      return
    }

    const triggerMenu = (event: KeyboardEvent) => {
      if (isSlashTriggerPress(editor, event)) {
        openMenu()
      }
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
      menuNavigator.moveUp(cardMenu.maxItemIndex)
      event.preventDefault()
      return true
    }

    const moveDown = (event: KeyboardEvent) => {
      menuNavigator.moveDown(cardMenu.maxItemIndex)
      event.preventDefault()
      return true
    }

    const enter = (event: KeyboardEvent) => {
      // insert from the flat item list — the same data CardMenu renders — so
      // selection never depends on the menu's DOM
      const item = menuNavigator.selectedItem(cardMenu.items)
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
  }, [editor, isShowingMenu, cardMenu, insert, menuNavigator])

  // reset the keyboard selection whenever the menu rebuilds
  React.useEffect(() => {
    menuNavigator.reset()
  }, [cardMenu, menuNavigator])

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
            scrollToSelectedItem={scrollToSelectedItem}
            sections={cardMenu.sections}
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
