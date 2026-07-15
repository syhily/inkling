import type { EditorState, LexicalEditor } from 'lexical'

import { $createNodeSelection, $getNodeByKey, $getSelection, $isNodeSelection, $setSelection } from 'lexical'

import type { CardNode } from '@/types/lexical-internals'

import { $isInklingCard } from '@/nodes/base'

import { $deselectCard } from './card-adjacency'

interface CardSelectionDeps {
  selectedCardKey: string | null
  setSelectedCardKey: (key: string | null) => void
  setIsEditingCard: (editing: boolean) => void
  isNested?: boolean
}

export function registerCardSelection(editor: LexicalEditor, deps: CardSelectionDeps) {
  const { selectedCardKey, setSelectedCardKey, setIsEditingCard, isNested } = deps

  // Track card selections restored by undo/redo so we can protect them from
  // being cleared by decorator reconciliation side-effects. When a 'historic'
  // update restores a NodeSelection, subsequent Lexical updates triggered by
  // React rendering the decorator component can momentarily change the
  // selection, causing the card to appear deselected. We suppress one
  // clearing cycle and re-set the selection instead.
  let preserveCardSelection: string | null = null

  return editor.registerUpdateListener(({ editorState, tags }: { editorState: EditorState; tags: Set<string> }) => {
    // ignore updates triggered by other users or by card node exportJSON calls
    if (tags.has('collaboration') || tags.has('card-export')) {
      return
    }

    // ignore selections inside of nested editors otherwise we'll
    // mistakenly deselect the card containing the nested editor
    if (isNested || document.activeElement?.closest('[data-lexical-decorator]')) {
      return
    }

    // trigger card selection/deselection when selection changes
    const { isCardSelected, cardKey, cardNode } = editorState.read(() => {
      const selection = $getSelection()

      const hasCardSelection =
        $isNodeSelection(selection) && selection.getNodes().length === 1 && $isInklingCard(selection.getNodes()[0])

      if (hasCardSelection) {
        const selectedNode = selection.getNodes()[0] as CardNode
        return { isCardSelected: true, cardKey: selectedNode.getKey(), cardNode: selectedNode }
      } else {
        return { isCardSelected: false }
      }
    })

    if (isCardSelected && cardKey) {
      if (!selectedCardKey) {
        setSelectedCardKey(cardKey)
        setIsEditingCard(false)
      } else if (selectedCardKey !== cardKey) {
        editor.update(
          () => {
            $deselectCard(editor, selectedCardKey)

            setSelectedCardKey(cardKey)
            setIsEditingCard(false)
          },
          { tag: 'history-merge' },
        ) // don't include a history entry for selection change
      }
    }

    // When undo/redo restores a card selection, protect it from
    // being cleared by side-effects of decorator reconciliation
    if (tags.has('historic') && isCardSelected) {
      preserveCardSelection = cardKey ?? null
    }

    // If a non-historic, non-history-merge update arrives with the
    // card still selected, reconciliation succeeded without a
    // transient deselection so the ref is no longer needed -
    // clear it to avoid blocking future legitimate deselections.
    // history-merge updates are excluded because they fire as
    // internal bookkeeping before decorator reconciliation.
    if (!tags.has('historic') && !tags.has('history-merge') && isCardSelected && preserveCardSelection === cardKey) {
      preserveCardSelection = null
    }

    if (!isCardSelected && selectedCardKey) {
      // If the selection was just restored by undo/redo, re-set
      // it instead of clearing - the deselection is a transient
      // side-effect of decorator re-rendering, not a user action.
      // Clear the ref after one use so subsequent legitimate
      // deselections are not blocked.
      if (preserveCardSelection === selectedCardKey) {
        preserveCardSelection = null
        editor.update(
          () => {
            const node = $getNodeByKey(selectedCardKey)
            if (node) {
              const selection = $createNodeSelection()
              selection.add(selectedCardKey)
              $setSelection(selection)
            } else {
              setSelectedCardKey(null)
              setIsEditingCard(false)
            }
          },
          { tag: 'history-merge' },
        )
        return
      }

      editor.update(
        () => {
          $deselectCard(editor, selectedCardKey)

          setSelectedCardKey(null)
          setIsEditingCard(false)
        },
        { tag: 'history-merge' },
      ) // don't include a history entry for selection change
    }

    // we have special-case cards that are inserted via markdown
    // expansions where we can't use editor commands to open in
    // edit mode so we handle that here instead
    if (isCardSelected && cardNode?.__openInEditMode) {
      editor.update(
        () => {
          cardNode.clearOpenInEditMode?.()
        },
        { tag: 'history-merge' },
      ) // don't include a history entry for clearing the open in edit mode prop

      setIsEditingCard(true)
    }
  })
}
