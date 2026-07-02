import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { ImageNode } from '@/nodes/ImageNode'
import { registerClickAndCut } from '@/plugins/behaviour/registerClickAndCut'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('registerClickAndCut', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  it('registers click and cut command listeners and returns a cleanup function', () => {
    const cleanup = registerClickAndCut(editor)

    expect(typeof cleanup).toBe('function')
    cleanup()
  })
})
