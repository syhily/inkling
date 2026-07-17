import { act, renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $nodesOfType,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ESCAPE_COMMAND,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $createAtLinkNode,
  $createAtLinkSearchNode,
  $createZWNJNode,
  AtLinkNode,
  AtLinkSearchNode,
  ZWNJNode,
} from '@/nodes/base'
import { InklingAtLinkPlugin } from '@/plugins/AtLinkPlugin'

// Characterization pins for the at-link node lifecycle, driven black-box
// through the mounted InklingAtLinkPlugin so the same file keeps passing
// across the node/session split (plan 053).
//
// Harness notes:
// - The root element is attached before mounting so the plugin's native
//   'input' fallback listener attaches (it only attaches when a root element
//   exists at effect time).
// - The editor is set non-editable: in jsdom the DOM-selection round-trip
//   normalizes a caret at the start of the (empty) search node onto the
//   preceding ZWNJ text node, while the plugin's update listener normalizes
//   it back — the two fight forever until Lexical's cascade guard trips.
//   Editability only gates Lexical's DOM-selection writes; the editor-state
//   transitions pinned here are identical either way.
// - Paste-into-search-node is not unit-pinned: jsdom has no ClipboardEvent
//   implementation, so the guard's `instanceof ClipboardEvent` branch cannot
//   be reached. Coverage stays with e2e (test/e2e/linking.test.ts "can paste
//   into at-link node").

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

// jsdom's Selection lacks the (non-standard) modify() API, which
// RangeSelection.deleteCharacter routes through on the native fallback's
// delete-the-'@' step. Polyfill the collapsed-text character cases the
// fallback relies on; other shapes are left as no-ops.
if (!Selection.prototype.modify) {
  const adjacentTextNode = (node: Node, direction: 'previous' | 'next'): Text | null => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    let current = walker.nextNode()
    while (current) {
      if (current.textContent !== '') {
        textNodes.push(current as Text)
      }
      current = walker.nextNode()
    }
    const index = textNodes.indexOf(node as Text)
    if (index === -1) {
      return null
    }
    return textNodes[direction === 'previous' ? index - 1 : index + 1] ?? null
  }
  Selection.prototype.modify = function (alter?: string, direction?: string, granularity?: string) {
    if (this.rangeCount === 0 || granularity !== 'character') {
      return
    }
    const range = this.getRangeAt(0)
    let node: Node = range.startContainer
    let offset = range.startOffset
    if (!range.collapsed || node.nodeType !== Node.TEXT_NODE) {
      return
    }
    const text = node.textContent ?? ''
    if (direction === 'backward') {
      if (offset === 0) {
        const prev = adjacentTextNode(node, 'previous')
        if (!prev) {
          return
        }
        node = prev
        offset = prev.length
      }
      this.setBaseAndExtent(node, offset, node, offset - 1)
    } else {
      if (offset === text.length) {
        const next = adjacentTextNode(node, 'next')
        if (!next) {
          return
        }
        node = next
        offset = 0
      }
      this.setBaseAndExtent(node, offset, node, offset + 1)
    }
  }
}

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [AtLinkNode, AtLinkSearchNode, ZWNJNode],
    theme: { atLink: 'at-link', atLinkIcon: 'at-link-icon', atLinkSearch: 'at-link-search' },
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

async function actUpdate(editor: LexicalEditor, updateFn: () => void) {
  await act(async () => {
    await updateEditor(editor, updateFn)
  })
}

async function actDispatch(editor: LexicalEditor, ...args: Parameters<LexicalEditor['dispatchCommand']>) {
  let result = false
  await act(async () => {
    result = editor.dispatchCommand(...args)
  })
  return result
}

// --- editor-state JSON builders -------------------------------------------

const textNodeJSON = (text: string, format = 0) => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})

const zwnjNodeJSON = () => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: '',
  type: 'zwnj',
  version: 1,
})

const searchNodeJSON = (text: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text,
  type: 'at-link-search',
  version: 1,
  placeholder: null,
})

const atLinkNodeJSON = (linkFormat: number | null, searchText = '') => ({
  children: [zwnjNodeJSON(), searchNodeJSON(searchText)],
  direction: null,
  format: '',
  indent: 0,
  linkFormat,
  type: 'at-link',
  version: 1,
})

const paragraphJSON = (children: unknown[], textFormat = 0) => ({
  children,
  direction: null,
  format: '',
  indent: 0,
  textFormat,
  textStyle: '',
  type: 'paragraph',
  version: 1,
})

const editorStateJSON = (...paragraphs: unknown[]) => ({
  root: {
    children: paragraphs,
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

// --- state builders --------------------------------------------------------

interface TextSegment {
  text: string
  format?: number
}

// Builds a single paragraph from text segments with a collapsed caret at
// [segment, offset], or an element-point caret when caret is 'element'.
async function buildSingleParagraph(
  editor: LexicalEditor,
  segments: TextSegment[],
  caret: { segment: number; anchorOffset: number; focusOffset?: number } | 'element',
) {
  await actUpdate(editor, () => {
    const root = $getRoot()
    root.clear()
    const paragraph = $createParagraphNode()
    const textNodes = segments.map(({ text, format }) => {
      const node = $createTextNode(text)
      if (format !== undefined) {
        node.setFormat(format)
      }
      return node
    })
    paragraph.append(...textNodes)
    root.append(paragraph)
    if (caret === 'element') {
      paragraph.select(0, 0)
    } else {
      textNodes[caret.segment].select(caret.anchorOffset, caret.focusOffset ?? caret.anchorOffset)
    }
  })
}

function readCollapsedPoint(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      return null
    }
    const node = selection.anchor.getNode()
    return { nodeType: node.getType(), offset: selection.anchor.offset, text: node.getTextContent() }
  })
}

describe('at-link node lifecycle (through the mounted plugin)', () => {
  let editor: LexicalEditor
  let rootElement: HTMLDivElement

  async function mountPlugin(target: LexicalEditor = editor) {
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    vi.mocked(useLexicalComposerContext).mockReturnValue([target, { getTheme: () => undefined }])
    const searchLinks = vi.fn().mockResolvedValue([])
    await act(async () => {
      renderHook(() => InklingAtLinkPlugin({ searchLinks }))
    })
  }

  async function dispatchNativeAt() {
    await act(async () => {
      // Mirror the Lexical caret into the DOM selection first — in a real
      // browser the DOM caret is already there when the input event fires,
      // and the fallback's deleteCharacter step extends it via
      // Selection.modify (polyfilled above).
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection) && selection.isCollapsed() && selection.anchor.type === 'text') {
          const element = editor.getElementByKey(selection.anchor.key)
          const textDOM = element?.firstChild
          if (textDOM) {
            window.getSelection()?.setBaseAndExtent(textDOM, selection.anchor.offset, textDOM, selection.anchor.offset)
          }
        }
      })
      rootElement.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: '@' }))
      // Clear the DOM selection before the commit microtask runs so later
      // update cycles don't read a stale DOM selection back (see harness
      // notes above).
      window.getSelection()?.removeAllRanges()
    })
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    rootElement = document.createElement('div')
    document.body.appendChild(rootElement)
    await act(async () => {
      editor.setRootElement(rootElement)
      editor.setEditable(false)
    })
    await mountPlugin()
    return () => {
      rootElement.remove()
    }
  })

  describe('controlled insertion path', () => {
    it('(a) converts an empty paragraph (element anchor)', async () => {
      await buildSingleParagraph(editor, [], 'element')

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([atLinkNodeJSON(0)])))
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it("(b) converts after 'hello ' with the caret at the end", async () => {
      await buildSingleParagraph(editor, [{ text: 'hello ' }], { segment: 0, anchorOffset: 6 })

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello '), atLinkNodeJSON(0)])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it("(c) does not convert after 'hello' (no whitespace before the caret)", async () => {
      await buildSingleParagraph(editor, [{ text: 'hello' }], { segment: 0, anchorOffset: 5 })
      const before = editor.getEditorState().toJSON()

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(false)

      expect(editor.getEditorState().toJSON()).toEqual(before)
    })

    it("(d) converts with the caret immediately before a '.' text sibling", async () => {
      await buildSingleParagraph(editor, [{ text: 'hello ' }, { text: '.world' }], { segment: 0, anchorOffset: 6 })

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello '), atLinkNodeJSON(0), textNodeJSON('.world')])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it('(e) converts at offset 0 of a text node whose previous sibling ends in whitespace', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello ' }, { text: ' world' }], { segment: 1, anchorOffset: 0 })

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello '), atLinkNodeJSON(0), textNodeJSON(' world')])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it('(f) carries the bold format of the anchor text into the at-link', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello ', format: 1 }], { segment: 0, anchorOffset: 6 })

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello ', 1), atLinkNodeJSON(1)], 1)),
      )
    })

    it('(g) is a no-op for a non-collapsed selection', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello world' }], { segment: 0, anchorOffset: 0, focusOffset: 5 })
      const before = editor.getEditorState().toJSON()

      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(false)

      expect(editor.getEditorState().toJSON()).toEqual(before)
    })
  })

  describe('native input fallback path', () => {
    it('(a) converts a "@" typed into an empty paragraph, matching the controlled path', async () => {
      // what the browser produces after typing '@' into an empty paragraph
      await buildSingleParagraph(editor, [{ text: '@' }], { segment: 0, anchorOffset: 1 })

      await dispatchNativeAt()

      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([atLinkNodeJSON(0)])))
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it('(b) converts a trailing "@" after whitespace, matching the controlled path', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello @' }], { segment: 0, anchorOffset: 7 })

      await dispatchNativeAt()

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello '), atLinkNodeJSON(0)])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it('(c) does not convert a trailing "@" without preceding whitespace', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello@' }], { segment: 0, anchorOffset: 6 })
      const before = editor.getEditorState().toJSON()

      await dispatchNativeAt()

      expect(editor.getEditorState().toJSON()).toEqual(before)
    })

    it('(d) converts a trailing "@" before a "." sibling, matching the controlled path', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello @' }, { text: '.world' }], { segment: 0, anchorOffset: 7 })

      await dispatchNativeAt()

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello '), atLinkNodeJSON(0), textNodeJSON('.world')])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })

    it('(e) converts a trailing "@" carried by the previous sibling, matching the controlled path', async () => {
      await buildSingleParagraph(editor, [{ text: 'hello @' }, { text: ' world' }], { segment: 1, anchorOffset: 0 })

      await dispatchNativeAt()

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello '), atLinkNodeJSON(0), textNodeJSON(' world')])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
    })
  })

  describe('removal and guards', () => {
    async function convertAndSetQuery(query: string, format?: number) {
      if (format === undefined) {
        await buildSingleParagraph(editor, [], 'element')
      } else {
        await buildSingleParagraph(editor, [{ text: 'hello ', format }], { segment: 0, anchorOffset: 6 })
      }
      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)
      await actUpdate(editor, () => {
        const atLinkNode = $nodesOfType(AtLinkNode)[0]
        const searchNode = atLinkNode.getChildAtIndex(1)
        if (searchNode instanceof AtLinkSearchNode) {
          searchNode.setTextContent(query)
          searchNode.select(0, 0)
        }
      })
    }

    it('escape reverts to "@" + query text carrying the original format, caret at its end', async () => {
      await convertAndSetQuery('abc', 1)

      expect(await actDispatch(editor, KEY_ESCAPE_COMMAND, new KeyboardEvent('keydown'))).toBe(true)

      // the reverted text merges with the preceding bold text node (same format)
      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello @abc', 1)], 1)),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'text', offset: 10, text: 'hello @abc' })
    })

    it('backspace at search-node offset 0 reverts to "@"', async () => {
      await convertAndSetQuery('')

      expect(await actDispatch(editor, DELETE_CHARACTER_COMMAND, true)).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([textNodeJSON('@')])))
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'text', offset: 1, text: '@' })
    })

    it('swallows FORMAT_TEXT_COMMAND while the search node is focused', async () => {
      await convertAndSetQuery('abc')
      const before = editor.getEditorState().toJSON()

      expect(await actDispatch(editor, FORMAT_TEXT_COMMAND, 'bold')).toBe(true)

      expect(editor.getEditorState().toJSON()).toEqual(before)
    })
  })

  describe('at-link shape transform', () => {
    it('inserts a missing ZWNJ first child', async () => {
      await actUpdate(editor, () => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        const atLinkNode = $createAtLinkNode()
        atLinkNode.append($createAtLinkSearchNode('abc'))
        paragraph.append(atLinkNode)
        root.append(paragraph)
        atLinkNode.select(1, 1)
      })

      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([atLinkNodeJSON(null, 'abc')])))
    })

    it('replaces a non-search child carrying text with a search node and consolidates', async () => {
      await actUpdate(editor, () => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        const atLinkNode = $createAtLinkNode()
        atLinkNode.append($createZWNJNode())
        atLinkNode.append($createAtLinkSearchNode(''))
        atLinkNode.append($createTextNode('hello'))
        paragraph.append(atLinkNode)
        root.append(paragraph)
        atLinkNode.select(1, 1)
      })

      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([atLinkNodeJSON(null, 'hello')])))
    })

    it('consolidates multiple search nodes into one with concatenated text', async () => {
      await actUpdate(editor, () => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        const atLinkNode = $createAtLinkNode()
        atLinkNode.append($createZWNJNode())
        atLinkNode.append($createAtLinkSearchNode('foo'))
        atLinkNode.append($createAtLinkSearchNode('bar'))
        paragraph.append(atLinkNode)
        root.append(paragraph)
        atLinkNode.select(1, 1)
      })

      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([atLinkNodeJSON(null, 'foobar')])))
    })
  })

  describe('search session', () => {
    it('removes the at-link when the selection moves outside it', async () => {
      await actUpdate(editor, () => {
        const root = $getRoot()
        root.clear()
        const first = $createParagraphNode()
        first.append($createTextNode('hello'))
        const second = $createParagraphNode()
        root.append(first, second)
        second.select(0, 0)
      })
      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      await actUpdate(editor, () => {
        const first = $getRoot().getFirstChild()
        if ($isElementNode(first)) {
          const text = first.getFirstChild()
          if ($isTextNode(text)) {
            text.select(0, 0)
          }
        }
      })

      expect(editor.getEditorState().toJSON()).toEqual(
        editorStateJSON(paragraphJSON([textNodeJSON('hello')]), paragraphJSON([textNodeJSON('@')])),
      )
      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'text', offset: 0, text: 'hello' })
    })

    it('normalizes a ZWNJ-anchored selection back into the search node', async () => {
      await buildSingleParagraph(editor, [], 'element')
      expect(await actDispatch(editor, CONTROLLED_TEXT_INSERTION_COMMAND, '@')).toBe(true)

      // The listener gates on the DOM selection's anchorOffset being 0; place
      // it outside the editor so jsdom's selection round-trip cannot fight
      // the normalization (see harness notes above).
      window.getSelection()?.setBaseAndExtent(document.body, 0, document.body, 0)

      await actUpdate(editor, () => {
        const atLinkNode = $nodesOfType(AtLinkNode)[0]
        const zwnjNode = atLinkNode.getFirstChild()
        if (zwnjNode instanceof ZWNJNode) {
          zwnjNode.select(0, 0)
        }
      })

      expect(readCollapsedPoint(editor)).toEqual({ nodeType: 'at-link-search', offset: 0, text: '' })
      expect(editor.getEditorState().toJSON()).toEqual(editorStateJSON(paragraphJSON([atLinkNodeJSON(0)])))
    })
  })
})
