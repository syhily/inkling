import { $getNodeByKey, $getRoot, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { HtmlNode } from '@/nodes/HtmlNode'
import { createCardSelectionStore, type CardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import {
  EDIT_CARD_COMMAND,
  HIDE_CARD_VISIBILITY_SETTINGS_COMMAND,
  SHOW_CARD_VISIBILITY_SETTINGS_COMMAND,
} from '@/plugins/behaviour/commands'
import { registerCardCommands } from '@/plugins/behaviour/registerCardCommands'
import { registerVisibilityHandler } from '@/plugins/behaviour/registerVisibilityHandler'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [HtmlNode, CodeBlockNode],
    onError: () => {},
  })
}

describe('registerVisibilityHandler', () => {
  let editor: LexicalEditor
  let store: CardSelectionStore

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
    store = createCardSelectionStore()
    // the store only moves through the real command registrations, exactly as
    // CardSelectionPlugin wires them in production
    registerCardCommands(editor, { store })
    registerVisibilityHandler(editor, { store })
  })

  function appendHtmlCard(html = '<p>hi</p>'): string {
    let cardKey = ''
    editor.update(() => {
      const node = new HtmlNode({ html })
      $getRoot().append(node)
      cardKey = node.getKey()
    })
    return cardKey
  }

  function appendCodeBlockCard(code = 'const a = 1'): string {
    let cardKey = ''
    editor.update(() => {
      const node = new CodeBlockNode({ code, language: 'javascript' })
      $getRoot().append(node)
      cardKey = node.getKey()
    })
    return cardKey
  }

  it('registers visibility command listeners and returns a cleanup function', () => {
    const cleanup = registerVisibilityHandler(createTestEditor(), { store: createCardSelectionStore() })

    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  it('shows the settings panel and selects the card for an unselected html card', () => {
    const cardKey = appendHtmlCard()

    editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey })

    // html cards show the panel in selected mode instead of entering edit mode
    expect(store.getState()).toEqual({ selectedCardKey: cardKey, isEditingCard: false, showVisibilitySettings: true })
  })

  it('shows the settings panel and enters edit mode for a selected-mode card with an edit mode', () => {
    const cardKey = appendCodeBlockCard()

    editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey })

    expect(store.getState()).toEqual({ selectedCardKey: cardKey, isEditingCard: true, showVisibilitySettings: true })
  })

  it('deselects instead of showing the panel when the card is already being edited', () => {
    const cardKey = appendCodeBlockCard('')
    editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey })
    expect(store.getState().isEditingCard).toBe(true)

    editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey })

    // $deselectCard removes an empty card; the panel flag is never set
    const nodeExists = editor.getEditorState().read(() => $getNodeByKey(cardKey) !== null)
    expect(nodeExists).toBe(false)
    expect(store.getState().showVisibilitySettings).toBe(false)
  })

  it('hides the settings panel and deselects the card on HIDE', () => {
    const cardKey = appendCodeBlockCard()
    editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey })
    expect(store.getState().showVisibilitySettings).toBe(true)

    editor.dispatchCommand(HIDE_CARD_VISIBILITY_SETTINGS_COMMAND, { cardKey })

    expect(store.getState()).toEqual({ selectedCardKey: null, isEditingCard: false, showVisibilitySettings: false })
  })
})
