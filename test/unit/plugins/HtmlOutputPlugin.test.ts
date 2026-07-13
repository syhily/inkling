import { act, renderHook } from '@testing-library/react'
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HtmlOutputPlugin } from '@/plugins/HtmlOutputPlugin'

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

describe('HtmlOutputPlugin', () => {
  let editor: LexicalEditor
  let setHtml: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    setHtml = vi.fn()

    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('calls setHtml with the generated HTML when the editor has text', async () => {
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('hello')))
    })

    const { result } = renderHook(() => HtmlOutputPlugin({ setHtml }))

    await act(async () => {
      ;(result.current as { props: { onChange: () => void } }).props.onChange()
    })

    expect(setHtml).toHaveBeenCalledWith(expect.stringContaining('hello'))
    expect(setHtml).not.toHaveBeenCalledWith('')
  })

  it('calls setHtml with an empty string when the editor is empty', async () => {
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('remove me')))
    })

    const { result } = renderHook(() => HtmlOutputPlugin({ setHtml }))

    await updateEditor(editor, () => {
      $getRoot().clear()
    })

    await act(async () => {
      ;(result.current as { props: { onChange: () => void } }).props.onChange()
    })

    expect(setHtml).toHaveBeenLastCalledWith('')
  })

  it('calls setHtml with an empty string when the editor only contains an empty paragraph', async () => {
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('remove me')))
    })

    const { result } = renderHook(() => HtmlOutputPlugin({ setHtml }))

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createLineBreakNode()))
    })

    await act(async () => {
      ;(result.current as { props: { onChange: () => void } }).props.onChange()
    })

    expect(setHtml).toHaveBeenLastCalledWith('')
  })

  it('debounces rapid changes into a single setHtml call when debounceMs is set', async () => {
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('hello')))
    })

    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => HtmlOutputPlugin({ setHtml, debounceMs: 100 }))
      const onChange = () => (result.current as { props: { onChange: () => void } }).props.onChange()

      act(() => {
        onChange()
        onChange()
        onChange()
      })

      expect(setHtml).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(setHtml).toHaveBeenCalledTimes(1)
      expect(setHtml).toHaveBeenCalledWith(expect.stringContaining('hello'))
    } finally {
      vi.useRealTimers()
    }
  })
})
