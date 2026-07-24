import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  createEditor,
  DecoratorNode,
  type LexicalEditor,
  type LexicalNodeConfig,
  type NodeKey,
} from 'lexical'
import { describe, expect, it, vi } from 'vitest'

import { createWordCounter, type WordCounterThrottle } from '@/plugins/behaviour/word-counter'
import { countWords } from '@/utils'
import { getTopLevelEditor } from '@/utils/lexical-internals'

vi.mock('@/utils', async (importActual) => {
  const actual = await importActual<typeof import('@/utils')>()
  return { ...actual, countWords: vi.fn(actual.countWords) }
})

// Deterministic harness for the headless word counter
// (src/plugins/behaviour/word-counter.ts): the throttle port is a synchronous
// passthrough, so flushes run inside the update that triggered them — no
// wall-clock sleeps. The React adapter (handle publish/clear) is covered by
// test/unit/plugins/WordCountPlugin.test.tsx.

const synchronousThrottle: WordCounterThrottle = (fn) => Object.assign(() => fn(), { cancel: () => {} })

function attachCounter(editor: LexicalEditor, onChange: (count: number) => void) {
  const counter = createWordCounter({ editor, onChange, throttleFn: synchronousThrottle })
  counter.attach()
  return counter
}

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

describe('createWordCounter', () => {
  it('emits the initial count on attach', () => {
    const editor = createTestEditor()
    const onChange = vi.fn()

    const counter = attachCounter(editor, onChange)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(0)
    counter.detach()
  })

  it('counts pre-existing content on attach', async () => {
    const editor = createTestEditor()
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world foo')))
    })

    const onChange = vi.fn()
    const counter = attachCounter(editor, onChange)

    expect(onChange).toHaveBeenCalledWith(3)
    counter.detach()
  })

  it('recounts incrementally after edits', async () => {
    const editor = createTestEditor()
    const onChange = vi.fn()
    const counter = attachCounter(editor, onChange)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })
    expect(onChange).toHaveBeenLastCalledWith(2)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello')))
    })
    expect(onChange).toHaveBeenLastCalledWith(1)
    counter.detach()
  })

  it('does not emit when the count is unchanged', async () => {
    const editor = createTestEditor()
    const onChange = vi.fn()
    const counter = attachCounter(editor, onChange)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })
    expect(onChange).toHaveBeenLastCalledWith(2)
    onChange.mockClear()
    vi.mocked(countWords).mockClear()

    await updateEditor(editor, () => {
      const textNode = $getRoot().getFirstDescendant()
      if (!$isTextNode(textNode)) {
        throw new Error('Expected the word-count fixture to contain a text node')
      }
      textNode.setFormat(1)
    })

    // the flush ran (one block recomputed) but the count did not change
    expect(vi.mocked(countWords)).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    counter.detach()
  })

  it('remaps dirty keys to their root children for a small edit in a long document', async () => {
    const editor = createTestEditor()
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      for (let i = 0; i < 100; i++) {
        root.append($createParagraphNode().append($createTextNode(`Paragraph ${i} has several words to count`)))
      }
    })

    const onChange = vi.fn()
    const counter = attachCounter(editor, onChange)
    expect(onChange).toHaveBeenLastCalledWith(700)
    vi.mocked(countWords).mockClear()

    await updateEditor(editor, () => {
      const firstParagraph = $getRoot().getFirstChild()
      if (!$isElementNode(firstParagraph)) {
        throw new Error('Expected the long-document fixture to start with a paragraph')
      }
      const firstText = firstParagraph.getFirstChild()
      if (!$isTextNode(firstText)) {
        throw new Error('Expected the first paragraph to contain a text node')
      }
      firstText.setTextContent('Paragraph zero has words')
    })

    // the dirty text node remaps to its root child, so only that one block is
    // recounted — a full recompute would call countWords once per block
    expect(vi.mocked(countWords)).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(697)
    counter.detach()
  })

  it('drops removed blocks from the count', async () => {
    const editor = createTestEditor()
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
      root.append($createParagraphNode().append($createTextNode('foo bar')))
    })

    const onChange = vi.fn()
    const counter = attachCounter(editor, onChange)
    expect(onChange).toHaveBeenLastCalledWith(4)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })

    expect(onChange).toHaveBeenLastCalledWith(2)
    counter.detach()
  })

  it('falls back to a full recompute for nested-editor updates', async () => {
    const topLevelEditor = createTestEditor({ nodes: [TestDecoratorNode] })
    const nestedEditor = createTestEditor({ parentEditor: topLevelEditor })

    // Set up the top-level state before attaching so the initial full count
    // includes the top-level paragraph.
    await updateEditor(topLevelEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
      root.append($createTestDecoratorNode(nestedEditor))
    })

    const onChange = vi.fn()
    const counter = attachCounter(nestedEditor, onChange)

    expect(onChange).toHaveBeenCalledWith(2)
    onChange.mockClear()

    await updateEditor(nestedEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Nested content')))
    })

    expect(onChange).toHaveBeenLastCalledWith(4)
    counter.detach()
  })

  it('resolves the top-level editor from a grandchild editor', async () => {
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
    const counter = attachCounter(grandchildEditor, onChange)

    // Initial count is computed from the top-level editor.
    expect(onChange).toHaveBeenCalledWith(3)
    onChange.mockClear()

    // A grandchild update triggers the full-recompute fallback, which emits
    // unconditionally. Lexical caches RootNode.getTextContent() across
    // nested-editor boundaries, so the grandchild text does not reach the
    // top-level count; we assert the callback is reached with the current
    // top-level count.
    await updateEditor(grandchildEditor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Grandchild words')))
    })

    expect(onChange).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith(3)
    counter.detach()
  })

  it('stops emitting and cancels pending flushes on detach', async () => {
    const cancel = vi.fn()
    const recordingThrottle: WordCounterThrottle = (fn) => Object.assign(() => fn(), { cancel })

    const editor = createTestEditor()
    const onChange = vi.fn()
    const counter = createWordCounter({ editor, onChange, throttleFn: recordingThrottle })
    counter.attach()
    expect(onChange).toHaveBeenCalledWith(0)

    counter.detach()

    expect(cancel).toHaveBeenCalledTimes(2)
    onChange.mockClear()

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Hello world')))
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})
