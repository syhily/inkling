import {
  $createNodeSelection,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import { describe, expect, it, vi } from 'vitest'

import type { CardNode } from '@/types/lexical-internals'

import { drainEnqueuedUpdates } from '#/utils/test-editor'
import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import { createCardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import { registerCardSelection } from '@/plugins/behaviour/registerCardSelection'

// Characterization tests for the preserveCardSelection undo-restore logic
// (plan 038 step 1). They recorded the pre-swap update-tag/selection behavior
// as a fixed baseline; the step 3 swap to store-based deps ({ store,
// isNested? }) touched only createSelectionHarness, never the test bodies.
// The setter spies stand in for the old React mirror by observing store
// notifications. Assertions stay on shape-invariant observables (editor
// selection, setter call arguments) and deliberately avoid pinning mirror
// artifacts that the swap changed (noted per test).

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

// The one place CardSelectionDeps are constructed. The setter spies stand in
// for the old React mirror: every store notification mirrors both current
// values into them, so assertions on setter call arguments keep their
// pre-swap meaning.
function createSelectionHarness(
  editor: LexicalEditor,
  initial: { selectedCardKey?: string | null; isNested?: boolean } = {},
) {
  const setSelectedCardKey = vi.fn()
  const setIsEditingCard = vi.fn()
  const store = createCardSelectionStore()
  // seed before subscribing so the spies only record listener-driven writes
  if (initial.selectedCardKey) {
    store.setState({ selectedCardKey: initial.selectedCardKey })
  }
  store.subscribe((state) => {
    setSelectedCardKey(state.selectedCardKey)
    setIsEditingCard(state.isEditingCard)
  })
  const dispose = registerCardSelection(editor, { store, isNested: initial.isNested })
  return { setSelectedCardKey, setIsEditingCard, dispose }
}

// editor.update resolves its onUpdate before updates scheduled from inside
// update listeners (the history-merge bookkeeping updates) have committed, so
// the harness's drainEnqueuedUpdates settles one macrotask to let the nested
// passes land.

async function setupEditorWithCard() {
  const editor = createTestEditor()
  let cardKey = ''
  await drainEnqueuedUpdates(editor, () => {
    const root = $getRoot()
    root.clear()
    const imageNode = $createImageNode({ src: '/image.png' })
    root.append($createParagraphNode(), imageNode)
    cardKey = imageNode.getKey()
  })
  return { editor, cardKey }
}

function selectCard(editor: LexicalEditor, cardKey: string, options?: { tag?: string }) {
  return drainEnqueuedUpdates(
    editor,
    () => {
      const selection = $createNodeSelection()
      selection.add(cardKey)
      $setSelection(selection)
    },
    options,
  )
}

function clearSelection(editor: LexicalEditor, options?: { tag?: string }) {
  return drainEnqueuedUpdates(
    editor,
    () => {
      $setSelection(null)
    },
    options,
  )
}

function touchDocument(editor: LexicalEditor) {
  return drainEnqueuedUpdates(editor, () => {
    $getRoot().append($createParagraphNode())
  })
}

/** Selected card keys when a card is node-selected, null otherwise. */
function readSelectedCardKeys(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection()
    return $isNodeSelection(selection) ? selection.getNodes().map((node) => node.getKey()) : null
  })
}

/** Tags of every delivered update, in order (updates that change nothing are not delivered to listeners). */
function recordUpdateTags(editor: LexicalEditor) {
  const log: Array<Array<string>> = []
  editor.registerUpdateListener(({ tags }) => {
    log.push([...tags].sort())
  })
  return log
}

const countHistoryMergeUpdates = (log: Array<Array<string>>) =>
  log.filter((tags) => tags.includes('history-merge')).length

describe('registerCardSelection', () => {
  it('registers an update listener and mirrors a plain card selection', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const harness = createSelectionHarness(editor)

    expect(typeof harness.dispose).toBe('function')

    await selectCard(editor, cardKey)

    expect(harness.setSelectedCardKey).toHaveBeenCalledTimes(1)
    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(cardKey)
    expect(harness.setIsEditingCard).toHaveBeenCalledTimes(1)
    expect(harness.setIsEditingCard).toHaveBeenCalledWith(false)

    harness.dispose()
  })

  it('marks a card selection restored by a historic update as protected without touching the setters', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    // the mirror already holds the restored card, as after an undo/redo
    const harness = createSelectionHarness(editor, { selectedCardKey: cardKey })

    await selectCard(editor, cardKey, { tag: 'historic' })

    expect(harness.setSelectedCardKey).not.toHaveBeenCalled()
    expect(harness.setIsEditingCard).not.toHaveBeenCalled()
    expect(readSelectedCardKeys(editor)).toEqual([cardKey])
    // the guard itself is a closure local; the next test proves it was set

    harness.dispose()
  })

  it('re-selects a protected selection exactly once after a transient clear, then allows deselection', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const harness = createSelectionHarness(editor, { selectedCardKey: cardKey })
    const tagLog = recordUpdateTags(editor)

    await selectCard(editor, cardKey, { tag: 'historic' })

    // the transient clear (decorator reconciliation side-effect after undo)
    await clearSelection(editor)

    // exactly one re-selection, delivered as a history-merge update; the
    // deselection setters were not called
    expect(harness.setSelectedCardKey).not.toHaveBeenCalled()
    expect(harness.setIsEditingCard).not.toHaveBeenCalled()
    expect(countHistoryMergeUpdates(tagLog)).toBe(1)
    expect(readSelectedCardKeys(editor)).toEqual([cardKey])

    // the guard was consumed by that one use: a further clear is a legitimate
    // deselection and goes through the deselect path exactly once
    await clearSelection(editor)

    expect(harness.setSelectedCardKey).toHaveBeenCalledTimes(1)
    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(null)
    expect(harness.setIsEditingCard).toHaveBeenCalledTimes(1)
    expect(harness.setIsEditingCard).toHaveBeenCalledWith(false)
    expect(readSelectedCardKeys(editor)).toBeNull()
    // the deselect bookkeeping update changes nothing, so it is not delivered
    // to update listeners and no second history-merge entry appears
    expect(countHistoryMergeUpdates(tagLog)).toBe(1)

    harness.dispose()
  })

  it('does not protect a deselection without a preceding historic update', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const harness = createSelectionHarness(editor, { selectedCardKey: cardKey })
    const tagLog = recordUpdateTags(editor)

    await selectCard(editor, cardKey)
    await clearSelection(editor)

    expect(harness.setSelectedCardKey).toHaveBeenCalledTimes(1)
    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(null)
    expect(harness.setIsEditingCard).toHaveBeenCalledTimes(1)
    expect(harness.setIsEditingCard).toHaveBeenCalledWith(false)
    expect(readSelectedCardKeys(editor)).toBeNull()
    expect(countHistoryMergeUpdates(tagLog)).toBe(0)

    harness.dispose()
  })

  it('clears the guard without re-selecting when a non-historic update keeps the card selected', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const harness = createSelectionHarness(editor, { selectedCardKey: cardKey })
    const tagLog = recordUpdateTags(editor)

    await selectCard(editor, cardKey, { tag: 'historic' })

    // reconciliation succeeds without a transient deselection: a plain update
    // arrives with the card still selected and the guard is dropped silently
    await touchDocument(editor)

    expect(harness.setSelectedCardKey).not.toHaveBeenCalled()
    expect(harness.setIsEditingCard).not.toHaveBeenCalled()
    expect(readSelectedCardKeys(editor)).toEqual([cardKey])

    // a later deselection is therefore not blocked (contrast with the
    // protected case above, where this clear would be re-selected)
    await clearSelection(editor)

    expect(harness.setSelectedCardKey).toHaveBeenCalledTimes(1)
    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(null)
    expect(harness.setIsEditingCard).toHaveBeenCalledTimes(1)
    expect(harness.setIsEditingCard).toHaveBeenCalledWith(false)
    expect(readSelectedCardKeys(editor)).toBeNull()
    expect(countHistoryMergeUpdates(tagLog)).toBe(0)

    harness.dispose()
  })

  it('ignores collaboration and card-export tagged updates', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const harness = createSelectionHarness(editor, { selectedCardKey: cardKey })

    await selectCard(editor, cardKey)
    await clearSelection(editor, { tag: 'collaboration' })

    expect(harness.setSelectedCardKey).not.toHaveBeenCalled()
    expect(harness.setIsEditingCard).not.toHaveBeenCalled()
    expect(readSelectedCardKeys(editor)).toBeNull()

    await selectCard(editor, cardKey)
    await clearSelection(editor, { tag: 'card-export' })

    expect(harness.setSelectedCardKey).not.toHaveBeenCalled()
    expect(harness.setIsEditingCard).not.toHaveBeenCalled()
    expect(readSelectedCardKeys(editor)).toBeNull()

    harness.dispose()
  })

  it('ignores updates when isNested is set', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const nestedHarness = createSelectionHarness(editor, { isNested: true })

    await selectCard(editor, cardKey)

    expect(nestedHarness.setSelectedCardKey).not.toHaveBeenCalled()
    expect(nestedHarness.setIsEditingCard).not.toHaveBeenCalled()
    expect(readSelectedCardKeys(editor)).toEqual([cardKey])

    nestedHarness.dispose()

    // positive control: the same selection is mirrored once the guard is gone
    const harness = createSelectionHarness(editor)
    await touchDocument(editor)
    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(cardKey)

    harness.dispose()
  })

  it('ignores updates while focus is inside a decorator (nested editor)', async () => {
    const { editor, cardKey } = await setupEditorWithCard()
    const harness = createSelectionHarness(editor)

    const decoratorHost = document.createElement('div')
    decoratorHost.setAttribute('data-lexical-decorator', 'true')
    const nestedButton = document.createElement('button')
    decoratorHost.appendChild(nestedButton)
    document.body.appendChild(decoratorHost)

    try {
      nestedButton.focus()
      expect(document.activeElement).toBe(nestedButton)

      await selectCard(editor, cardKey)

      expect(harness.setSelectedCardKey).not.toHaveBeenCalled()
      expect(harness.setIsEditingCard).not.toHaveBeenCalled()
      expect(readSelectedCardKeys(editor)).toEqual([cardKey])
    } finally {
      nestedButton.blur()
      decoratorHost.remove()
    }

    // positive control: once focus leaves the decorator the guard is gone
    await touchDocument(editor)
    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(cardKey)

    harness.dispose()
  })

  it('sets editing state for a card flagged __openInEditMode', async () => {
    const editor = createTestEditor()
    const harness = createSelectionHarness(editor)
    const clearOpenInEditMode = vi.fn(function (this: CardNode) {
      ;(this.getWritable() as CardNode).__openInEditMode = false
    })

    let cardKey = ''
    await drainEnqueuedUpdates(editor, () => {
      const root = $getRoot()
      root.clear()
      const imageNode = $createImageNode({ src: '/image.png' }) as CardNode
      imageNode.__openInEditMode = true
      imageNode.clearOpenInEditMode = clearOpenInEditMode
      root.append($createParagraphNode(), imageNode)
      cardKey = imageNode.getKey()

      const selection = $createNodeSelection()
      selection.add(cardKey)
      $setSelection(selection)
    })

    expect(harness.setSelectedCardKey).toHaveBeenCalledWith(cardKey)
    expect(harness.setIsEditingCard).toHaveBeenCalledWith(true)
    expect(clearOpenInEditMode).toHaveBeenCalledTimes(1)
    expect(readSelectedCardKeys(editor)).toEqual([cardKey])
    // as-is note: before the store swap, the history-merge bookkeeping pass
    // read the stale mirror (null) and repeated setSelectedCardKey(cardKey) /
    // setIsEditingCard(false) after the branch ran. The synchronous store read
    // no longer produces that artifact. Exact call counts and the final
    // isEditingCard value stay intentionally unpinned so this test pins branch
    // behavior, not deps wiring.

    harness.dispose()
  })
})
