import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { createCardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
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

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  it('registers visibility command listeners and returns a cleanup function', () => {
    const cleanup = registerVisibilityHandler(editor, {
      store: createCardSelectionStore(),
    })

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
