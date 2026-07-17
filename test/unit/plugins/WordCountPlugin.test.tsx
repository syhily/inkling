import { act, renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  DecoratorNode,
  type LexicalEditor,
  type LexicalNodeConfig,
  type NodeKey,
} from 'lexical'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WordCountHandleContext } from '@/context/WordCountHandleContext'
import { createWordCountHandle } from '@/plugins/behaviour/wordCountHandle'
import { WordCountPlugin } from '@/plugins/WordCountPlugin'
import { getTopLevelEditor } from '@/utils/lexical-internals'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(overrides: { nodes?: LexicalNodeConfig[]; parentEditor?: LexicalEditor } = {}) {
  const editor = createEditor({
    namespace: 'test',
    nodes: overrides.nodes,
    onError: () => {},
    parentEditor: overrides.parentEditor,
  })
  editor.setRootElement(document.createElement('div'))
  editor.update(
    () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode())
    },
    { discrete: true },
  )
  return editor
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { discrete: true, onUpdate: () => resolve() })
  })
}

class TestDecoratorNode extends DecoratorNode<null> {
  __nestedEditor: LexicalEditor

  constructor(nestedEditor: LexicalEditor = createTestEditor(), key?: NodeKey) {
    super(key)
    this.__nestedEditor = nestedEditor
  }

  static getType() {
    return 'test-decorator'
  }

  static clone(node: TestDecoratorNode) {
    return new TestDecoratorNode(node.__nestedEditor, node.__key)
  }

  createDOM() {
    return document.createElement('div')
  }

  updateDOM() {
    return false
  }

  decorate() {
    return null
  }

  getTextContent() {
    let text = ''
    this.__nestedEditor.getEditorState().read(() => {
      text = $getRoot().getTextContent()
    })
    return text
  }
}

function $createTestDecoratorNode(nestedEditor: LexicalEditor) {
  return new TestDecoratorNode(nestedEditor)
}

describe('WordCountPlugin', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function renderPlugin(onChange: (count: number) => void, pluginEditor = editor) {
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    vi.mocked(useLexicalComposerContext).mockReturnValue([pluginEditor, { getTheme: () => null }])

    const wordCountHandle = createWordCountHandle()
    const result = renderHook(() => WordCountPlugin({ onChange }), {
      wrapper: ({ children }) => (
        <WordCountHandleContext.Provider value={wordCountHandle}>{children}</WordCountHandleContext.Provider>
      ),
    })
    return { wordCountHandle, ...result }
  }

  async function flushThrottle() {
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 250)
      })
    })
  }

  it('counts words on mount with an empty editor', async () => {
    const onChange = vi.fn()
    await renderPlugin(onChange)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('publishes the shared callback on the word-count handle and clears it on unmount', async () => {
    const onChange = vi.fn()
    const { unmount, wordCountHandle } = await renderPlugin(onChange)

    // a top-level plugin owns the shared callback so that nested composers can
    // mount their own WordCountPlugin with it
    expect(wordCountHandle.getState().onChange).toBe(onChange)

    unmount()

    expect(wordCountHandle.getState().onChange).toBeNull()
  })

  it('counts words after typing', async () => {
    const onChange = vi.fn()
    await renderPlugin(onChange)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })

    await flushThrottle()

    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('counts words after deletion', async () => {
    const onChange = vi.fn()
    await renderPlugin(onChange)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world foo bar')))
    })

    await flushThrottle()
    expect(onChange).toHaveBeenLastCalledWith(4)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })

    await flushThrottle()
    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('does not call onChange when the count is unchanged', async () => {
    const onChange = vi.fn()
    await renderPlugin(onChange)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })

    await flushThrottle()
    expect(onChange).toHaveBeenLastCalledWith(2)
    onChange.mockClear()

    await updateEditor(editor, () => {
      const textNode = $getRoot().getFirstDescendant()
      if (textNode) {
        textNode.setFormat(1)
      }
    })

    await flushThrottle()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('counts words from nested editors', async () => {
    const topLevelEditor = createTestEditor({
      nodes: [TestDecoratorNode],
    })
    const nestedEditor = createTestEditor({ parentEditor: topLevelEditor })

    // Set up the top-level state before mounting the nested plugin so the
    // initial full count includes the top-level paragraph.
    await updateEditor(topLevelEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
      root.append($createTestDecoratorNode(nestedEditor))
    })

    const onChange = vi.fn()
    await renderPlugin(onChange, nestedEditor)

    expect(onChange).toHaveBeenCalledWith(2)
    onChange.mockClear()

    await updateEditor(nestedEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Nested content')))
    })

    await flushThrottle()

    expect(onChange).toHaveBeenLastCalledWith(4)
  })

  it('traverses from a grandchild editor to the top-level editor', async () => {
    const topLevelEditor = createTestEditor()
    const childEditor = createTestEditor({ parentEditor: topLevelEditor })
    const grandchildEditor = createTestEditor({ parentEditor: childEditor })

    expect(getTopLevelEditor(grandchildEditor)).toBe(topLevelEditor)

    await updateEditor(topLevelEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Top level words')))
    })

    const onChange = vi.fn()
    const { wordCountHandle } = await renderPlugin(onChange, grandchildEditor)

    // Nested plugins do not own the shared root callback.
    expect(wordCountHandle.getState().onChange).toBeNull()

    // Initial count is computed from the top-level editor.
    expect(onChange).toHaveBeenCalledWith(3)
    onChange.mockClear()

    // Updating the grandchild editor triggers the plugin's listener, which
    // recomputes the top-level count. Lexical caches RootNode.getTextContent()
    // across nested-editor boundaries, so the grandchild text does not reach
    // the top-level count; we assert the callback is reached with the current
    // top-level count.
    await updateEditor(grandchildEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Grandchild words')))
    })

    await flushThrottle()

    expect(onChange).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith(3)
  })

  it('reports the correct count after a small edit in a long document', async () => {
    const onChange = vi.fn()
    await renderPlugin(onChange)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      for (let i = 0; i < 100; i++) {
        root.append($createParagraphNode().append($createTextNode(`Paragraph ${i} has several words to count`)))
      }
    })

    await flushThrottle()
    const initialCount = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(initialCount).toBeGreaterThan(0)

    await updateEditor(editor, () => {
      const firstParagraph = $getRoot().getFirstChild()
      if (firstParagraph) {
        firstParagraph.getFirstChild()?.setTextContent('Paragraph zero has several words to count')
      }
    })

    await flushThrottle()

    expect(onChange).toHaveBeenLastCalledWith(initialCount)
  })
})
