import type { LexicalEditor, LexicalNode, NodeKey } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import type { InklingHostIntegrationContextValue } from '@/context/InklingHostIntegrationContext'

import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'

export interface CardChrome<T extends LexicalNode> {
  editor: LexicalEditor
  /** The host integration context (CONTEXT.md: "host config"). */
  host: InklingHostIntegrationContextValue
  /** The card write seam's React binding (CONTEXT.md: "card write seam"). */
  write: (update: (node: T) => void) => void
  /**
   * The field-writer factory: `setField('alt')` returns the
   * `(value) => write(node => { node.alt = value })` setter a card's UI
   * props expect, so a one-line field write is data, not a hand-typed
   * closure (it generalizes header's former private `headerFieldWriter`).
   */
  setField: <K extends keyof T>(field: K) => (value: T[K]) => void
}

/**
 * The card components' chrome prologue: one hook returning the editor, the
 * host integration context, the card's write seam, and the field-writer
 * factory — the quartet every editable card component used to wire by hand
 * (`useLexicalComposerContext` + `useCardWriter` + `useContext`).
 *
 * Selection truth is deliberately NOT folded in: `useCardIsSelected` /
 * `useCardIsEditing` stay the named subscription bindings — a folded
 * subscription would re-render every card on selection changes whether or
 * not the component reads it.
 */
export function useCardChrome<T extends LexicalNode>(
  nodeKey: NodeKey,
  guard: (node: unknown) => node is T,
): CardChrome<T> {
  const [editor] = useLexicalComposerContext()
  const host = React.useContext(InklingHostIntegrationContext)
  const write = useCardWriter(nodeKey, guard)

  const setField = <K extends keyof T>(field: K) => {
    return (value: T[K]) => {
      write((node) => {
        node[field] = value
      })
    }
  }

  return { editor, host, write, setField }
}
