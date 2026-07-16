import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { act, renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageNode, INSERT_IMAGE_COMMAND } from '@/nodes/ImageNode'
import { INSERT_MEDIA_COMMAND } from '@/plugins/behaviour/clipboard-protocol'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode],
    onError: () => {},
  })
}

describe('Image insert commands (CardInsertPlugin)', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
    ;(useLexicalComposerContext as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue([editor])
  })

  it('returns null', () => {
    const { result } = renderHook(() => CardInsertPlugin())
    expect(result.current).toBeNull()
  })

  it('registers INSERT_IMAGE_COMMAND and dispatches INSERT_CARD_COMMAND', async () => {
    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')

    renderHook(() => CardInsertPlugin())

    await act(async () => {
      editor.update(() => {
        $getRoot().append($createParagraphNode().append($createTextNode('')))
      })
    })

    await act(async () => {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: 'https://example.com/image.png' })
    })

    expect(dispatchCommandSpy).toHaveBeenCalledWith(
      INSERT_CARD_COMMAND,
      expect.objectContaining({
        cardNode: expect.any(Object),
      }),
    )
  })

  it('registers INSERT_MEDIA_COMMAND for image type', async () => {
    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')

    renderHook(() => CardInsertPlugin())

    await act(async () => {
      editor.dispatchCommand(INSERT_MEDIA_COMMAND, {
        type: 'image',
        file: new File([], 'test.png', { type: 'image/png' }),
      })
    })

    expect(dispatchCommandSpy).toHaveBeenCalledWith(INSERT_IMAGE_COMMAND, { initialFile: expect.any(File) })
  })

  it('does nothing for non-image INSERT_MEDIA_COMMAND', async () => {
    renderHook(() => CardInsertPlugin())

    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')

    await act(async () => {
      editor.dispatchCommand(INSERT_MEDIA_COMMAND, {
        type: 'video',
        file: new File([], 'test.mp4', { type: 'video/mp4' }),
      })
    })

    // Only the original INSERT_MEDIA_COMMAND should have been dispatched
    expect(dispatchCommandSpy).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch INSERT_CARD_COMMAND for invalid dataset', async () => {
    renderHook(() => CardInsertPlugin())

    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')

    await act(async () => {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, 'not-an-object')
    })

    // Only the original INSERT_IMAGE_COMMAND should have been dispatched
    expect(dispatchCommandSpy).toHaveBeenCalledTimes(1)
  })
})
