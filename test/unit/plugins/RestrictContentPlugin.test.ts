import { renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  PASTE_COMMAND,
  type LexicalEditor,
} from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MIME_TEXT_HTML, MIME_TEXT_PLAIN } from '@/plugins/behaviour/clipboard-protocol'
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

  it('calls preventDefault on the plain-text markdown paste path', async () => {
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])

    renderHook(() => RestrictContentPlugin({ paragraphs: 2 }))

    const preventDefault = vi.fn()
    const clipboardData = {
      getData: (mime: string) => (mime === MIME_TEXT_PLAIN ? 'hello world' : mime === MIME_TEXT_HTML ? '' : ''),
    } as DataTransfer

    const handled = editor.dispatchCommand(PASTE_COMMAND, {
      clipboardData,
      preventDefault,
    } as unknown as ClipboardEvent)

    expect(handled).toBe(true)
    expect(preventDefault).toHaveBeenCalled()
  })
})
