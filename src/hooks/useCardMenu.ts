import type { LexicalCommand, LexicalEditor } from 'lexical'

import { TableNode } from '@lexical/table'
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical'
import React from 'react'

import type { BuildCardMenuResult, CardMenuSource, ResolvedMenuItem } from '@/utils/buildCardMenu'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { lookupLabel } from '@/labels/inkling-labels'
import { TABLE_MENU_SOURCE } from '@/nodes/table/table-menu'
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
  const { labels } = React.useContext(InklingUiPrefsContext)

  // rebuild the menu when the registered nodes, query, host config, or labels
  // change — buildCardMenu is pure, so the menu is computed during render (no
  // empty first-render frame). The label resolver is the single injection
  // point for labels (C7): declaration labelKeys resolve through the table,
  // snippet/custom items render as declared.
  const cardMenu = React.useMemo<BuildCardMenuResult>(() => {
    const cardNodes = getEditorCardNodes(editor)
    // the table entry is a pseudo CardMenuSource (snippet precedent) — the
    // table family is not a card, so it joins the menu here instead of
    // through the declarations, and only when the editor registers TableNode
    const nodes: Iterable<[string, CardMenuSource]> = editor.hasNode(TableNode)
      ? [...cardNodes, TABLE_MENU_SOURCE]
      : cardNodes
    const resolveLabel = (key: string, fallback: string) => lookupLabel(labels, key, fallback)
    return buildCardMenu(nodes, { query, config: cardConfig, resolveLabel })
  }, [editor, query, cardConfig, labels])

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
      // command/payload pairs built from each card's declaration-derived menu
      // data, so the specific payload type is erased here. Each plugin handler
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
