import { act, renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  DecoratorNode,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import InklingComposerContext from '@/context/InklingComposerContext'
import { WordCountPlugin } from '@/plugins/WordCountPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(overrides: { nodes?: Array<typeof DecoratorNode>; parentEditor?: LexicalEditor } = {}) {
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

const contextValue = {
  fileUploader: { useFileUpload: () => ({ upload: vi.fn() }) },
  cardConfig: {},
  darkMode: false,
  enableMultiplayer: false,
  editorContainerRef: { current: null },
  createWebsocketProvider: vi.fn(),
  onWordCountChangeRef: { current: null },
  onError: vi.fn(),
}

class TestDecoratorNode extends DecoratorNode {
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
    useLexicalComposerContext.mockReturnValue([pluginEditor])

    return renderHook(() => WordCountPlugin({ onChange }), {
      wrapper: ({ children }) => (
        <InklingComposerContext.Provider value={contextValue}>{children}</InklingComposerContext.Provider>
      ),
    })
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
      nodes: [TestDecoratorNode as unknown as typeof DecoratorNode],
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
