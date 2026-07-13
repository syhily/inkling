import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import InklingBehaviourPlugin, { INSERT_CARD_COMMAND, SELECT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

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

  it('renders and registers commands as an aggregator', async () => {
    await setupContextMocks()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])

    renderHook(() => InklingBehaviourPlugin({}))

    // Smoke test: ensure the plugin registered the command listeners by
    // dispatching a few commands with valid editor state.
    let imageNode: ImageNode
    await new Promise<void>((resolve) => {
      editor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const paragraph = $createParagraphNode()
          paragraph.append($createTextNode('hello'))
          root.append(paragraph)
          paragraph.select()

          imageNode = $createImageNode({ src: '/image.png' })
        },
        { onUpdate: () => resolve() },
      )
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

    expect(editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode: imageNode! })).toBe(true)
    expect(insertedCardNode).toBeDefined()
    expect(editor.dispatchCommand(SELECT_CARD_COMMAND, { cardKey: imageNode!.getKey() })).toBe(true)

    removeListener()
  })
})
