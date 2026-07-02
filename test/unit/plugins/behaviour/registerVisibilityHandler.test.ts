import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { registerVisibilityHandler } from '@/plugins/behaviour/registerVisibilityHandler'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerVisibilityHandler', () => {
  let editor: LexicalEditor
  const setShowVisibilitySettings = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  it('registers visibility command listeners and returns a cleanup function', () => {
    const cleanup = registerVisibilityHandler(editor, {
      selectedCardKey: null,
      isEditingCard: false,
      setShowVisibilitySettings,
    })

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
