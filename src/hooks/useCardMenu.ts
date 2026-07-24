import type { LexicalCommand, LexicalEditor } from 'lexical'

import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical'
import React from 'react'

import type { BuildCardMenuResult, ResolvedMenuItem } from '@/utils/buildCardMenu'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { buildCardMenu } from '@/utils/buildCardMenu'
import { getEditorCardNodes } from '@/utils/getEditorCardNodes'

export type CardMenuInsertParams = Pick<ResolvedMenuItem, 'insertParams' | 'queryParams'>

export type CardMenuInsert = (insertCommand: unknown, params?: CardMenuInsertParams) => void

export interface UseCardMenuOptions {
  /** Typed `/card param` values, merged into the dispatch dataset under the
   * item's `queryParams` keys. Slash-menu only — the plus menu has no typed
   * params. */
  commandParams?: string[]
  /** Slash-menu insert semantics: the trigger paragraph still carries the
   * "/query" text, so it is swapped for a fresh paragraph before the insert
   * command dispatches. The plus menu dispatches at the cached caret as-is. */
  replaceTriggerParagraph?: boolean
}

export interface UseCardMenu {
  cardMenu: BuildCardMenuResult
  insert: CardMenuInsert
}

/** The card menu as data: the registered card nodes plus the host's
 * cardConfig resolved through buildCardMenu, and the single type-erased
 * insert dispatch shared by the slash and plus menus. Trigger and
 * positioning semantics stay in the plugins. */
export function useCardMenu(editor: LexicalEditor, query?: string, options: UseCardMenuOptions = {}): UseCardMenu {
  const { commandParams = [], replaceTriggerParagraph = false } = options
  const { cardConfig } = React.useContext(InklingHostIntegrationContext)

  // rebuild the menu when the registered nodes, query, or host config change —
  // buildCardMenu is pure, so the menu is computed during render (no empty
  // first-render frame)
  const cardMenu = React.useMemo<BuildCardMenuResult>(() => {
    const cardNodes = getEditorCardNodes(editor)
    return buildCardMenu(cardNodes, { query, config: cardConfig })
  }, [editor, query, cardConfig])

  const insert = React.useCallback<CardMenuInsert>(
    (insertCommand, { insertParams = {}, queryParams = [] } = {}) => {
      const dataset = { ...insertParams }

      for (let i = 0; i < queryParams.length; i++) {
        if (commandParams[i]) {
          const key = queryParams[i]
          const value = commandParams[i]
          dataset[key] = value
        }
      }

      // deliberate boundary: the card menu is a heterogeneous registry of
      // command/payload pairs built from each node's static `cardMenu`, so
      // the specific payload type is erased here. Each plugin handler
      // re-narrows the payload with its own dataset type guard.
      const dispatch = () => editor.dispatchCommand(insertCommand as LexicalCommand<unknown>, dataset)

      if (!replaceTriggerParagraph) {
        dispatch()
        return
      }

      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          return
        }

        const focusPNode = selection.focus.getNode().getTopLevelElement()

        if (!focusPNode) {
          return
        }

        // paragraphs at the beginning of the document will delete themselves
        // via .collapseAtStart() if their contents are deleted so we create
        // a new paragraph and delete the old one before the insert command
        // replaces the selection with the new node
        const paragraph = $createParagraphNode()
        focusPNode.insertAfter(paragraph)
        focusPNode.remove()
        paragraph.select()

        dispatch()
      })
    },
    [editor, commandParams, replaceTriggerParagraph],
  )

  return { cardMenu, insert }
}
