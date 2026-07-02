import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { registerLinkMatching } from '@/plugins/behaviour/registerLinkMatching'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerLinkMatching', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  it('registers a paste-link command listener and returns a cleanup function', () => {
    const isShiftPressed = { current: false }
    const cleanup = registerLinkMatching(editor, { isShiftPressed })

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
