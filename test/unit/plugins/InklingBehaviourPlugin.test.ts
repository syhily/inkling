import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import InklingBehaviourPlugin, { INSERT_CARD_COMMAND, SELECT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(nodes: Array<unknown> = []) {
  return createEditor({
    namespace: 'test',
    nodes: [ImageNode, HorizontalRuleNode, ...(nodes as [])],
    onError: () => {},
  })
}

// Mount the plugin under the real InklingSelectedCardContext provider: it
// creates the per-composer card selection store and the drag/visibility
// context the plugin consumes (plan 038 — no whole-context mock).
function renderPlugin() {
  return renderHook(() => InklingBehaviourPlugin({}), { wrapper: InklingSelectedCardContext })
}

describe('InklingBehaviourPlugin', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('renders and registers commands as an aggregator', async () => {
    renderPlugin()

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

  it('registers its command listeners once per mount, not per render', () => {
    const registerCommandSpy = vi.spyOn(editor, 'registerCommand')

    const { rerender, unmount } = renderPlugin()
    const registrationsAfterMount = registerCommandSpy.mock.calls.length
    expect(registrationsAfterMount).toBeGreaterThan(0)

    rerender()
    rerender()
    rerender()

    // Handlers read card selection synchronously from the store, so forced
    // re-renders must not tear down and re-register the listeners (plan 038
    // step 5).
    expect(registerCommandSpy.mock.calls.length).toBe(registrationsAfterMount)

    unmount()
  })
})
