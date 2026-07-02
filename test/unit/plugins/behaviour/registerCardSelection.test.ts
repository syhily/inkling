import { $createNodeSelection, $getRoot, $setSelection, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import { registerCardSelection } from '@/plugins/behaviour/registerCardSelection'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerCardSelection', () => {
  let editor: LexicalEditor
  const setSelectedCardKey = vi.fn()
  const setIsEditingCard = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  it('registers an update listener and returns a cleanup function', async () => {
    const cleanup = registerCardSelection(editor, {
      selectedCardKey: null,
      setSelectedCardKey,
      setIsEditingCard,
    })

    expect(typeof cleanup).toBe('function')

    await new Promise<void>((resolve) => {
      editor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const imageNode = $createImageNode({ src: '/image.png' })
          root.append(imageNode)

          const nodeSelection = $createNodeSelection()
          nodeSelection.add(imageNode.getKey())
          $setSelection(nodeSelection)
        },
        { onUpdate: () => resolve() },
      )
    })

    cleanup()
  })
})
