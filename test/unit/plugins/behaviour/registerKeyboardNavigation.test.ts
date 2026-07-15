import { $createLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  createEditor,
  DELETE_LINE_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import { createCardSelectionStore, type CardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import { DELETE_CARD_COMMAND, SELECT_CARD_COMMAND } from '@/plugins/behaviour/commands'
import { registerKeyboardNavigation } from '@/plugins/behaviour/registerKeyboardNavigation'

// Minimal node set that lets the keyboard plugin's listeners run in jsdom.
const KEYBOARD_TEST_NODES = [ImageNode, ListNode, ListItemNode, CodeBlockNode, LinkNode]

function createTestEditor(nodes: unknown[] = KEYBOARD_TEST_NODES) {
  return createEditor({
    namespace: 'test',
    nodes: nodes as [],
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

function dispatchAndCommit<T>(editor: LexicalEditor, command: LexicalCommand<T>, payload?: T): Promise<boolean> {
  return new Promise((resolve) => {
    let result = false
    editor.update(
      () => {
        result = editor.dispatchCommand(command, payload)
      },
      { onUpdate: () => resolve(result) },
    )
  })
}

function mountEditor(editor: LexicalEditor) {
  const root = document.createElement('div')
  root.contentEditable = 'true'
  root.setAttribute('data-lexical-editor', 'true')
  document.body.appendChild(root)
  editor.setRootElement(root)

  // jsdom does not always update document.activeElement on focus; ensure the
  // keyboard handlers see the editor root as the active element.
  const activeElementSpy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(root)

  // jsdom has no layout engine; provide a default rect so Lexical can sync
  // the DOM selection after updates without throwing.
  const boundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  const originalRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect
  Range.prototype.getBoundingClientRect = () =>
    ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect

  return {
    root,
    restore: () => {
      activeElementSpy.mockRestore()
      boundingClientRectSpy.mockRestore()
      Range.prototype.getBoundingClientRect = originalRangeGetBoundingClientRect
      root.remove()
    },
  }
}

/**
 * Build a fake native Selection whose single range reports the requested top.
 * Used to drive $isAtTopOfNode in jsdom where real layout rects are all zero.
 */
function createNativeSelectionMock(opts: { anchorNode: Node; rangeTop: number }): Selection {
  const { anchorNode, rangeTop } = opts
  const rect: DOMRect = {
    bottom: rangeTop,
    height: 0,
    left: 0,
    right: 0,
    top: rangeTop,
    width: 0,
    x: 0,
    y: rangeTop,
    toJSON: () => ({}),
  }
  const range = {
    cloneRange: () => range,
    getClientRects: () => [rect],
    getBoundingClientRect: () => rect,
  }
  return {
    anchorNode,
    getRangeAt: () => range,
    setBaseAndExtent: () => {},
  } as unknown as Selection
}

/**
 * Place a collapsed Lexical selection at the requested offset inside a text node
 * and attach a native selection double that reports the requested visual line.
 */
async function setSelectionAt(
  editor: LexicalEditor,
  root: HTMLElement,
  textNodeKey: string,
  offset: number,
  rangeTop: number,
) {
  await updateEditor(editor, () => {
    $getNodeByKey(textNodeKey)?.select(offset, offset)
  })

  const paragraphElement = root.querySelector('p')
  if (paragraphElement) {
    paragraphElement.getBoundingClientRect = () =>
      ({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
  }

  const domElement = editor.getElementByKey(textNodeKey)
  const domNode = domElement?.firstChild
  if (domNode) {
    vi.spyOn(window, 'getSelection').mockReturnValue(createNativeSelectionMock({ anchorNode: domNode, rangeTop }))
  }
}

describe('registerKeyboardNavigation', () => {
  let editor: LexicalEditor
  let store: CardSelectionStore
  let mounted: ReturnType<typeof mountEditor> | null = null

  beforeEach(() => {
    editor = createTestEditor()
    store = createCardSelectionStore()
    document.body.innerHTML = ''
    mounted = null
  })

  afterEach(() => {
    mounted?.restore()
    document.body.innerHTML = ''
  })

  function registerWithCardKey(cardKey: string | null = null) {
    store.setState({ selectedCardKey: cardKey })
    return registerKeyboardNavigation(editor, { store })
  }

  it('registers keyboard command listeners and returns a cleanup function', () => {
    const cleanup = registerWithCardKey()
    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  it('cleans up registered command listeners', () => {
    const command = KEY_ENTER_COMMAND
    const beforeSize = (editor as unknown as { _commands: Map<unknown, unknown[]> })._commands.get(command)?.length ?? 0

    const cleanup = registerWithCardKey()

    const duringSize = (editor as unknown as { _commands: Map<unknown, unknown[]> })._commands.get(command)?.length ?? 0
    expect(duringSize).toBeGreaterThan(beforeSize)

    cleanup()

    const afterSize = (editor as unknown as { _commands: Map<unknown, unknown[]> })._commands.get(command)?.length ?? 0
    expect(afterSize).toBe(beforeSize)
  })

  it('inserts a new paragraph after a selected card on enter', async () => {
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const image = $createImageNode({ src: '/image.png' })
      root.append(image)
      cardKey = image.getKey()
    })

    mounted = mountEditor(editor)
    const cleanup = registerWithCardKey(cardKey)

    const result = await dispatchAndCommit(editor, KEY_ENTER_COMMAND, new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(result).toBe(true)

    editor.getEditorState().read(() => {
      const root = $getRoot()
      expect(root.getChildrenSize()).toBe(2)
      const inserted = root.getChildAtIndex(1)
      expect($isParagraphNode(inserted)).toBe(true)
      const selection = $getSelection()
      expect($isRangeSelection(selection)).toBe(true)
      expect(selection?.anchor.getNode().is(inserted)).toBe(true)
    })

    cleanup()
  })

  it('toggles card edit mode on meta+enter when a card is selected', async () => {
    const { $createCodeBlockNode } = await import('@/nodes/CodeBlockNode')
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const codeBlock = $createCodeBlockNode({ language: 'javascript' })
      root.append(codeBlock)
      cardKey = codeBlock.getKey()
    })

    mounted = mountEditor(editor)
    const cleanup = registerWithCardKey(cardKey)

    const result = await dispatchAndCommit(
      editor,
      KEY_ENTER_COMMAND,
      new KeyboardEvent('keydown', { key: 'Enter', metaKey: true }),
    )
    expect(result).toBe(true)
    expect(store.getState().isEditingCard).toBe(true)

    cleanup()
  })

  it('selects the previous card when backspacing an empty paragraph after a card', async () => {
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const image = $createImageNode({ src: '/image.png' })
      root.append(image)
      const paragraph = $createParagraphNode()
      root.append(paragraph)
      cardKey = image.getKey()
    })

    mounted = mountEditor(editor)
    const cleanup = registerWithCardKey(null)

    await updateEditor(editor, () => {
      const paragraph = $getRoot().getChildAtIndex(1)
      if ($isParagraphNode(paragraph)) {
        paragraph.selectStart()
      }
    })

    const result = await dispatchAndCommit(
      editor,
      KEY_BACKSPACE_COMMAND,
      new KeyboardEvent('keydown', { key: 'Backspace' }),
    )
    expect(result).toBe(true)

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isNodeSelection(selection)).toBe(true)
      const selectedNode = selection?.getNodes()[0]
      expect(selectedNode?.getKey()).toBe(cardKey)
    })

    cleanup()
  })

  it('selects the next card on arrow down from an empty paragraph', async () => {
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const paragraph = $createParagraphNode()
      root.append(paragraph)
      const image = $createImageNode({ src: '/image.png' })
      root.append(image)
      cardKey = image.getKey()
    })

    mounted = mountEditor(editor)
    const cleanup = registerWithCardKey(null)

    await updateEditor(editor, () => {
      const paragraph = $getRoot().getChildAtIndex(0)
      if ($isParagraphNode(paragraph)) {
        paragraph.selectStart()
      }
    })

    const result = await dispatchAndCommit(
      editor,
      KEY_ARROW_DOWN_COMMAND,
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    )
    expect(result).toBe(true)

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isNodeSelection(selection)).toBe(true)
      const selectedNode = selection?.getNodes()[0]
      expect(selectedNode?.getKey()).toBe(cardKey)
    })

    cleanup()
  })

  it('dispatches SELECT_CARD_COMMAND on escape when editing a card', async () => {
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const image = $createImageNode({ src: '/image.png' })
      root.append(image)
      cardKey = image.getKey()
    })

    mounted = mountEditor(editor)
    const selectCardListener = vi.fn()
    const unregister = editor.registerCommand(SELECT_CARD_COMMAND, selectCardListener, 0)
    store.setState({ selectedCardKey: cardKey, isEditingCard: true })
    const cleanup = registerKeyboardNavigation(editor, { store })

    const result = await dispatchAndCommit(editor, KEY_ESCAPE_COMMAND, new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(result).toBe(true)
    expect(selectCardListener.mock.calls[0]?.[0]).toMatchObject({ cardKey })

    cleanup()
    unregister()
  })

  it('prevents tab from leaving the editor', async () => {
    await updateEditor(editor, () => {
      const root = $getRoot()
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('hello'))
      root.append(paragraph)
      paragraph.selectEnd()
    })

    mounted = mountEditor(editor)
    const cleanup = registerWithCardKey(null)

    const result = await dispatchAndCommit(editor, KEY_TAB_COMMAND, new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(result).toBe(true)

    cleanup()
  })

  describe('DELETE_LINE_COMMAND', () => {
    it('removes a one-line paragraph after a card and selects the card when caret is on the first visual line', async () => {
      let cardKey = ''
      let textNodeKey = ''
      let textNodeSize = 0
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        cardKey = image.getKey()
        textNodeKey = textNode.getKey()
        textNodeSize = textNode.getTextContentSize()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, textNodeSize, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(1)
        expect($isDecoratorNode(root.getFirstChild())).toBe(true)
        const selection = $getSelection()
        expect($isNodeSelection(selection)).toBe(true)
        expect(selection?.getNodes()[0]?.getKey()).toBe(cardKey)
      })

      cleanup()
    })

    it('preserves text after the caret when deleting a one-line paragraph backward', async () => {
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 5, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        const paragraph = root.getChildAtIndex(1)
        expect($isParagraphNode(paragraph)).toBe(true)
        expect(paragraph?.getChildrenSize()).toBe(1)
        const remainingText = paragraph?.getFirstChild()
        expect($isTextNode(remainingText)).toBe(true)
        expect(remainingText?.getTextContent()).toBe('content')
        const selection = $getSelection()
        expect($isRangeSelection(selection)).toBe(true)
      })

      cleanup()
    })

    it('preserves a multi-line paragraph after a card when deleting the first visual line backward', async () => {
      let textNodeKey = ''
      let textNodeSize = 0
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('first line')
        paragraph.append(textNode)
        paragraph.append($createLineBreakNode())
        paragraph.append($createTextNode('later line'))
        root.append(image)
        root.append(paragraph)
        textNodeKey = textNode.getKey()
        textNodeSize = textNode.getTextContentSize()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, textNodeSize, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        const paragraph = root.getChildAtIndex(1)
        expect($isParagraphNode(paragraph)).toBe(true)
        expect(paragraph?.getChildrenSize()).toBe(2)
        expect($isLineBreakNode(paragraph?.getChildAtIndex(0))).toBe(true)
        const remainingText = paragraph?.getChildAtIndex(1)
        expect($isTextNode(remainingText)).toBe(true)
        expect(remainingText?.getTextContent()).toBe('later line')
        const selection = $getSelection()
        expect($isRangeSelection(selection)).toBe(true)
      })

      cleanup()
    })

    it('preserves text after the caret when deleting the first visual line backward', async () => {
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('first line')
        paragraph.append(textNode)
        paragraph.append($createLineBreakNode())
        paragraph.append($createTextNode('later line'))
        root.append(image)
        root.append(paragraph)
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 5, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        const paragraph = root.getChildAtIndex(1)
        expect($isParagraphNode(paragraph)).toBe(true)
        expect(paragraph?.getChildrenSize()).toBe(3)
        const firstChild = paragraph?.getFirstChild()
        expect($isTextNode(firstChild)).toBe(true)
        expect(firstChild?.getTextContent()).toBe(' line')
        expect($isLineBreakNode(paragraph?.getChildAtIndex(1))).toBe(true)
        const laterText = paragraph?.getChildAtIndex(2)
        expect($isTextNode(laterText)).toBe(true)
        expect(laterText?.getTextContent()).toBe('later line')
        const selection = $getSelection()
        expect($isRangeSelection(selection)).toBe(true)
      })

      cleanup()
    })

    it('preserves remaining content when the first visual line ends inside a link node', async () => {
      let linkTextNodeKey = ''
      let linkTextNodeSize = 0
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const link = $createLinkNode('https://example.com')
        const linkTextNode = $createTextNode('first line')
        link.append(linkTextNode)
        paragraph.append(link)
        paragraph.append($createLineBreakNode())
        paragraph.append($createTextNode('later line'))
        root.append(image)
        root.append(paragraph)
        linkTextNodeKey = linkTextNode.getKey()
        linkTextNodeSize = linkTextNode.getTextContentSize()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, linkTextNodeKey, linkTextNodeSize, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        const paragraph = root.getChildAtIndex(1)
        expect($isParagraphNode(paragraph)).toBe(true)
        const remaining = paragraph?.getChildren().map((child) => child.getType())
        expect(remaining).toEqual(['linebreak', 'text'])
        const laterText = paragraph?.getChildAtIndex(1)
        expect($isTextNode(laterText)).toBe(true)
        expect(laterText?.getTextContent()).toBe('later line')
      })

      cleanup()
    })

    it('does not handle DELETE_LINE_COMMAND when caret is not on the first visual line', async () => {
      let textNodeKey = ''
      let textNodeSize = 0
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('first line'))
        paragraph.append($createLineBreakNode())
        const textNode = $createTextNode('later line')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        textNodeKey = textNode.getKey()
        textNodeSize = textNode.getTextContentSize()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, textNodeSize, 100)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(false)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        expect($isDecoratorNode(root.getFirstChild())).toBe(true)
        expect($isParagraphNode(root.getChildAtIndex(1))).toBe(true)
      })

      cleanup()
    })

    it('removes a one-line paragraph before a card and selects the card on forward DELETE_LINE_COMMAND', async () => {
      let cardKey = ''
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        cardKey = image.getKey()
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 0, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, false)
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(1)
        expect($isDecoratorNode(root.getFirstChild())).toBe(true)
        const selection = $getSelection()
        expect($isNodeSelection(selection)).toBe(true)
        expect(selection?.getNodes()[0]?.getKey()).toBe(cardKey)
      })

      cleanup()
    })

    it('does not handle DELETE_LINE_COMMAND for a paragraph that is not adjacent to a card', async () => {
      let textNodeKey = ''
      let textNodeSize = 0
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(paragraph)
        textNodeKey = textNode.getKey()
        textNodeSize = textNode.getTextContentSize()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, textNodeSize, 0)

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(false)

      cleanup()
    })

    it('deletes a selected card via DELETE_CARD_COMMAND on DELETE_LINE_COMMAND', async () => {
      let cardKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        root.append(image)
        cardKey = image.getKey()
      })

      mounted = mountEditor(editor)
      const deleteCardListener = vi.fn()
      const unregister = editor.registerCommand(DELETE_CARD_COMMAND, deleteCardListener, 0)
      store.setState({ selectedCardKey: cardKey })
      const cleanup = registerKeyboardNavigation(editor, { store })

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(true)
      expect(deleteCardListener.mock.calls[0]?.[0]).toEqual({ cardKey, direction: 'backward' })

      cleanup()
      unregister()
    })

    it('does not delete a selected card in a nested editor on DELETE_LINE_COMMAND', async () => {
      let cardKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        root.append(image)
        cardKey = image.getKey()
      })

      mounted = mountEditor(editor)
      const deleteCardListener = vi.fn()
      const unregister = editor.registerCommand(DELETE_CARD_COMMAND, deleteCardListener, 0)
      store.setState({ selectedCardKey: cardKey })
      const cleanup = registerKeyboardNavigation(editor, { store, isNested: true })

      const result = await dispatchAndCommit(editor, DELETE_LINE_COMMAND, true)
      expect(result).toBe(false)
      expect(deleteCardListener).not.toHaveBeenCalled()

      cleanup()
      unregister()
    })
  })

  describe('card adjacency characterization', () => {
    it('removes a following card on forward delete from the end of a populated paragraph', async () => {
      let textNodeSize = 0
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        textNodeSize = textNode.getTextContentSize()
        textNode.select(textNodeSize, textNodeSize)
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)

      const result = await dispatchAndCommit(
        editor,
        KEY_DELETE_COMMAND,
        new KeyboardEvent('keydown', { key: 'Delete' }),
      )
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(1)
        const paragraph = root.getFirstChild()
        expect($isParagraphNode(paragraph)).toBe(true)
        expect(paragraph?.getTextContent()).toBe('Some content')
        const selection = $getSelection()
        expect($isRangeSelection(selection)).toBe(true)
        expect(selection?.anchor.offset).toBe(textNodeSize)
      })

      cleanup()
    })

    it('removes a previous card on backspace at the start of a populated paragraph', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        textNode.select(0, 0)
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)

      const result = await dispatchAndCommit(
        editor,
        KEY_BACKSPACE_COMMAND,
        new KeyboardEvent('keydown', { key: 'Backspace' }),
      )
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(1)
        const paragraph = root.getFirstChild()
        expect($isParagraphNode(paragraph)).toBe(true)
        expect(paragraph?.getTextContent()).toBe('Some content')
        const selection = $getSelection()
        expect($isRangeSelection(selection)).toBe(true)
        expect(selection?.anchor.offset).toBe(0)
      })

      cleanup()
    })

    it('selects the last card on meta+arrow down when the document ends with a card', async () => {
      let cardKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Some content'))
        root.append(paragraph)
        const image = $createImageNode({ src: '/image.png' })
        root.append(image)
        cardKey = image.getKey()
        paragraph.selectEnd()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)

      const result = await dispatchAndCommit(
        editor,
        KEY_MODIFIER_COMMAND,
        new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true }),
      )
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const selection = $getSelection()
        expect($isNodeSelection(selection)).toBe(true)
        expect(selection?.getNodes()[0]?.getKey()).toBe(cardKey)
      })

      cleanup()
    })

    it('selects the first card on meta+arrow up when the document starts with a card', async () => {
      let cardKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        root.append(image)
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Some content'))
        root.append(paragraph)
        cardKey = image.getKey()
        paragraph.selectStart()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)

      const result = await dispatchAndCommit(
        editor,
        KEY_MODIFIER_COMMAND,
        new KeyboardEvent('keydown', { key: 'ArrowUp', metaKey: true }),
      )
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const selection = $getSelection()
        expect($isNodeSelection(selection)).toBe(true)
        expect(selection?.getNodes()[0]?.getKey()).toBe(cardKey)
      })

      cleanup()
    })

    it('selects a previous card on arrow up from the first visual line of a populated paragraph', async () => {
      let cardKey = ''
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        cardKey = image.getKey()
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 5, 0)

      const result = await dispatchAndCommit(
        editor,
        KEY_ARROW_UP_COMMAND,
        new KeyboardEvent('keydown', { key: 'ArrowUp' }),
      )
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const selection = $getSelection()
        expect($isNodeSelection(selection)).toBe(true)
        expect(selection?.getNodes()[0]?.getKey()).toBe(cardKey)
      })

      cleanup()
    })

    it('does not handle arrow up below the first visual line of a populated paragraph', async () => {
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 5, 100)

      const result = await dispatchAndCommit(
        editor,
        KEY_ARROW_UP_COMMAND,
        new KeyboardEvent('keydown', { key: 'ArrowUp' }),
      )
      expect(result).toBe(false)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        expect($isDecoratorNode(root.getFirstChild())).toBe(true)
        expect($isRangeSelection($getSelection())).toBe(true)
      })

      cleanup()
    })

    it('selects a following card on arrow down from the last visual line of a populated paragraph', async () => {
      let cardKey = ''
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        cardKey = image.getKey()
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 5, 0)

      const result = await dispatchAndCommit(
        editor,
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent('keydown', { key: 'ArrowDown' }),
      )
      expect(result).toBe(true)

      editor.getEditorState().read(() => {
        const selection = $getSelection()
        expect($isNodeSelection(selection)).toBe(true)
        expect(selection?.getNodes()[0]?.getKey()).toBe(cardKey)
      })

      cleanup()
    })

    it('does not handle arrow down above the last visual line of a populated paragraph', async () => {
      let textNodeKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        textNodeKey = textNode.getKey()
      })

      mounted = mountEditor(editor)
      const cleanup = registerWithCardKey(null)
      await setSelectionAt(editor, mounted.root, textNodeKey, 5, 100)

      const result = await dispatchAndCommit(
        editor,
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent('keydown', { key: 'ArrowDown' }),
      )
      expect(result).toBe(false)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        expect(root.getChildrenSize()).toBe(2)
        expect($isDecoratorNode(root.getLastChild())).toBe(true)
        expect($isRangeSelection($getSelection())).toBe(true)
      })

      cleanup()
    })
  })
})
