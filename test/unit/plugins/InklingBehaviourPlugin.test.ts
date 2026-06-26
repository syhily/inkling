import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import InklingBehaviourPlugin, {
  DELETE_CARD_COMMAND,
  INSERT_CARD_COMMAND,
  SELECT_CARD_COMMAND,
} from '@/plugins/InklingBehaviourPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('../../../src/context/InklingSelectedCardContext', () => ({
  useInklingSelectedCardContext: vi.fn(),
}))

function createTestEditor(nodes: Array<unknown> = []) {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode, HorizontalRuleNode, ...(nodes as [])],
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

async function setupContextMocks() {
  const { useInklingSelectedCardContext } = await import('@/context/InklingSelectedCardContext')
  useInklingSelectedCardContext.mockReturnValue({
    selectedCardKey: null,
    setSelectedCardKey: vi.fn(),
    isEditingCard: false,
    setIsEditingCard: vi.fn(),
    isDragging: false,
    setIsDragging: vi.fn(),
    showVisibilitySettings: false,
    setShowVisibilitySettings: vi.fn(),
  })
}

describe('InklingBehaviourPlugin', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  it('registers command listeners with typed payloads', async () => {
    await setupContextMocks()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])

    renderHook(() => InklingBehaviourPlugin({}))

    let imageNode: ImageNode
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('hello'))
      root.append(paragraph)
      paragraph.select()

      imageNode = $createImageNode({ src: '/image.png' })
    })

    let insertedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        insertedCardNode = payload.cardNode
        return true
      },
      0,
    )

    const dispatched = editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode: imageNode })
    expect(dispatched).toBe(true)
    expect(insertedCardNode).toBeDefined()

    removeListener()
  })

  it('DELETE_CARD_COMMAND removes a card and preserves a paragraph', async () => {
    await setupContextMocks()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])

    renderHook(() => InklingBehaviourPlugin({}))

    let cardKey: string
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      const imageNode = $createImageNode({ src: '/image.png' })
      root.append(imageNode)
      cardKey = imageNode.getKey()
    })

    const dispatched = editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey: cardKey! })
    expect(dispatched).toBe(true)

    editor.getEditorState().read(() => {
      expect($getRoot().getChildrenSize()).toBeGreaterThan(0)
    })
  })

  it('SELECT_CARD_COMMAND selects a card by key', async () => {
    await setupContextMocks()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])

    renderHook(() => InklingBehaviourPlugin({}))

    let cardKey: string
    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      const imageNode = $createImageNode({ src: '/image.png' })
      root.append(imageNode)
      cardKey = imageNode.getKey()
    })

    const dispatched = editor.dispatchCommand(SELECT_CARD_COMMAND, { cardKey: cardKey! })
    expect(dispatched).toBe(true)
  })
})
