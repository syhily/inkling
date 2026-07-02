import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { registerPasteHandler } from '@/plugins/behaviour/registerPasteHandler'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerPasteHandler', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  it('registers a paste command listener and returns a cleanup function', () => {
    const cleanup = registerPasteHandler(editor, {})

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
