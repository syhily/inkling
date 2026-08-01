import type { LexicalCommand, LexicalEditor } from 'lexical'

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
import { useSelectionAnchoredPopup } from '@/hooks/useSelectionAnchoredPopup'
import { isSlashTriggerPress, registerSlashCardMenuTrigger } from '@/plugins/behaviour/card-menu-trigger'
import trackEvent from '@/utils/analytics'

function useSlashCardMenu(editor: LexicalEditor) {
  // the popup session (cursor lease, close policy, slash trigger-state
  // lifecycle) lives in useCardMenuSession, the trigger policy (valid-press
  // grammar, query extraction, close verdicts) in
  // @/plugins/behaviour/card-menu-trigger, and the placement policy in the
  // anchored-popup seam (absolute mode: parent-relative, natural width,
  // measured flip); this plugin keeps the keypress wiring and the rendering
  const {
    containerRef,
    isOpen: isShowingMenu,
    query,
    commandParams,
    openMenu,
    closeMenu: closeSessionMenu,
    insert: sessionInsert,
    applyTriggerVerdict,
  } = useCardMenuSession()

  // the keyboard-selection state machine (wrap-around index, scroll-request
  // latch, reset-on-rebuild) lives in the headless menu navigator — created
  // once, read through its snapshot (its subscribe/getSnapshot are
  // closure-bound, so they ride useSyncExternalStore directly); the command
  // handlers below call in
  const [menuNavigator] = React.useState<MenuNavigator>(() => createMenuNavigator())
  const { selectedItemIndex, scrollToSelectedItem } = React.useSyncExternalStore(
    menuNavigator.subscribe,
    menuNavigator.getSnapshot,
  )

  // anchor: the trigger paragraph (the selection's closest <p>); the
  // positioning parent is that paragraph's parent — the seam resolves the
  // below/above placement from those rects
  const getSelectionElement = React.useCallback((): HTMLElement | null => {
    const anchorNode = window.getSelection()?.anchorNode

    if (!anchorNode) {
      return null
    }

    if (anchorNode.nodeType === Node.TEXT_NODE) {
      return anchorNode.parentElement?.closest('p') ?? null
    }

    return anchorNode instanceof HTMLElement ? anchorNode : null
  }, [])

  const updatePopupPosition = useSelectionAnchoredPopup({
    editor,
    popupRef: containerRef,
    positioning: 'absolute',
    absoluteEdge: 'below',
    absoluteFlip: 'measured',
    anchor: () => getSelectionElement()?.getBoundingClientRect() ?? null,
    containerRect: () => getSelectionElement()?.parentElement?.getBoundingClientRect() ?? null,
  })

  // the popup mounts with the menu — request the positioning pass on open
  // (the subscription set covers resize/scroll while it stays open)
  React.useLayoutEffect(() => {
    if (isShowingMenu) {
      updatePopupPosition()
    }
  }, [isShowingMenu, updatePopupPosition])

  // the navigator's scroll-request latch releases when the menu closes (the
  // trigger state itself resets inside the session's close policy)
  React.useEffect(() => {
    if (!isShowingMenu) {
      menuNavigator.consumeScrollRequest()
    }
  }, [isShowingMenu, menuNavigator])

  const { cardMenu, insert: insertCardItem } = useCardMenu(editor, query, {
    commandParams,
    replaceTriggerParagraph: true,
  })

  // insert-and-close is the session's seam (it owns the close policy);
  // this adapter only names the dispatch
  const insert = React.useCallback(
    (
      insertCommand: LexicalCommand<unknown> | undefined,
      params: { insertParams?: Record<string, unknown>; queryParams?: string[] } = {},
    ): void => {
      // a menu item without an insert command has nothing to dispatch
      if (!insertCommand) {
        return
      }
      sessionInsert(() => insertCardItem(insertCommand, params))
    },
    [sessionInsert, insertCardItem],
  )

  // the session applies the trigger's update verdicts: query tracking
  // (leasing the cursor range so Escape can restore it) or close
  React.useEffect(() => {
    return registerSlashCardMenuTrigger(editor, { onVerdict: applyTriggerVerdict })
  }, [editor, applyTriggerVerdict])

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
      if (item?.insertCommand) {
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

  if (cardMenu.items.length === 0) {
    return null
  }

  if (isShowingMenu) {
    return (
      <div ref={containerRef} className="absolute -left-2 z-50 mt-2" data-inkling-slash-container>
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
