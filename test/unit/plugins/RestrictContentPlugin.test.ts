import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RestrictContentPlugin } from '@/plugins/RestrictContentPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('RestrictContentPlugin', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  it('imports ListItemNode from @lexical/list and truncates to specified paragraphs', async () => {
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])

    renderHook(() => RestrictContentPlugin({ paragraphs: 2 }))

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('one')))
      root.append($createParagraphNode().append($createTextNode('two')))
      root.append($createParagraphNode().append($createTextNode('three')))
      root.selectEnd()
    })

    editor.getEditorState().read(() => {
      expect($getRoot().getChildrenSize()).toBe(2)
    })
  })
})
