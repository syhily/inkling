import { ListItemNode, ListNode } from '@lexical/list'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  createEditor,
  KEY_ARROW_DOWN_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import { SELECT_CARD_COMMAND } from '@/plugins/behaviour/commands'
import { registerKeyboardNavigation } from '@/plugins/behaviour/registerKeyboardNavigation'

// Minimal node set that lets the keyboard plugin's listeners run in jsdom.
const KEYBOARD_TEST_NODES = [ImageNode, ListNode, ListItemNode, CodeBlockNode]

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
  document.body.appendChild(root)
  editor.setRootElement(root)

  // jsdom does not always update document.activeElement on focus; ensure the
  // keyboard handlers see the editor root as the active element.
  const activeElementSpy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(root)

  return {
    root,
    restore: () => {
      activeElementSpy.mockRestore()
      root.remove()
    },
  }
}

describe('registerKeyboardNavigation', () => {
  let editor: LexicalEditor
  let setIsEditingCard: ReturnType<typeof vi.fn>
  let mounted: ReturnType<typeof mountEditor> | null = null

  beforeEach(() => {
    editor = createTestEditor()
    setIsEditingCard = vi.fn()
    document.body.innerHTML = ''
    mounted = null
  })

  afterEach(() => {
    mounted?.restore()
    document.body.innerHTML = ''
  })

  function registerWithCardKey(cardKey: string | null = null) {
    return registerKeyboardNavigation(editor, {
      selectedCardKey: cardKey,
      isEditingCard: false,
      setIsEditingCard,
    })
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
    expect(setIsEditingCard).toHaveBeenCalledWith(true)

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
    const cleanup = registerKeyboardNavigation(editor, {
      selectedCardKey: cardKey,
      isEditingCard: true,
      setIsEditingCard,
    })

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
})
