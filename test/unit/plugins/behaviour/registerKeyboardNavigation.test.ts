import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { registerKeyboardNavigation } from '@/plugins/behaviour/registerKeyboardNavigation'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerKeyboardNavigation', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  it('registers keyboard command listeners and returns a cleanup function', () => {
    const cleanup = registerKeyboardNavigation(editor, {
      selectedCardKey: null,
      isEditingCard: false,
      setIsEditingCard: vi.fn(),
    })

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
