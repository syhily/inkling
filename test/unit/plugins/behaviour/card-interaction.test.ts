import { $getRoot, CLICK_COMMAND, createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { tick } from '#/utils/test-editor'
import { $createButtonNode, ButtonNode } from '@/nodes/ButtonNode'
import { registerCardInteraction } from '@/plugins/behaviour/card-interaction'
import { createCardSelectionStore, type CardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'
import { registerCardCommands } from '@/plugins/behaviour/registerCardCommands'

// The select→edit choreography as a synchronous table: real editor, real
// card, real container — no browser. Clicks arrive by dispatching
// CLICK_COMMAND with an event whose target is set (dispatched first on the
// target element).

describe('card interaction', () => {
  let editor: LexicalEditor
  let store: CardSelectionStore
  let cardKey: string
  let container: HTMLElement
  let target: HTMLElement

  beforeEach(async () => {
    const rootElement = document.createElement('div')
    document.body.appendChild(rootElement)
    editor = createEditor({
      namespace: 'test',
      nodes: [ButtonNode],
      onError: (error) => {
        throw error
      },
    })
    editor.setRootElement(rootElement)
    store = createCardSelectionStore()
    registerCardCommands(editor, { store })

    cardKey = ''
    editor.update(() => {
      const card = $createButtonNode({ buttonText: 'Go', buttonUrl: 'https://example.com' })
      $getRoot().append(card)
      cardKey = card.getKey()
    })
    await tick()

    container = document.createElement('div')
    target = document.createElement('span')
    container.appendChild(target)
    document.body.appendChild(container)
  })

  function register() {
    return registerCardInteraction(editor, cardKey, { store, getContainer: () => container })
  }

  function clickOn(element: Element): boolean {
    const event = new MouseEvent('click', { bubbles: true })
    element.dispatchEvent(event)
    return editor.dispatchCommand(CLICK_COMMAND, event)
  }

  function mousedownOn(element: Element) {
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  }

  it('selects an unselected card on mousedown and swallows the follow-up click', () => {
    register()

    mousedownOn(target)
    expect(store.getState().selectedCardKey).toBe(cardKey)

    // the swallowed click is consumed but does not enter edit mode
    expect(clickOn(target)).toBe(true)
    expect(store.getState().isEditingCard).toBe(false)
  })

  it('enters edit mode when a selected card is clicked', () => {
    store.setState({ selectedCardKey: cardKey })
    register()

    expect(clickOn(target)).toBe(true)
    expect(store.getState().isEditingCard).toBe(true)
  })

  it('does not re-dispatch when the card is already editing', () => {
    store.setState({ selectedCardKey: cardKey, isEditingCard: true })
    register()

    expect(clickOn(target)).toBe(true)
    // no SELECT/EDIT dispatch: the edit flag simply holds
    expect(store.getState().selectedCardKey).toBe(cardKey)
    expect(store.getState().isEditingCard).toBe(true)
  })

  it('ignores clicks in the click-through zone', () => {
    store.setState({ selectedCardKey: cardKey })
    register()

    const clickthrough = document.createElement('button')
    clickthrough.dataset.inklingAllowClickthrough = 'true'
    container.appendChild(clickthrough)

    clickOn(clickthrough)
    expect(store.getState().isEditingCard).toBe(false)
  })

  it('ignores clicks in the settings panel', () => {
    store.setState({ selectedCardKey: cardKey })
    register()

    const panel = document.createElement('div')
    panel.dataset.inklingSettingsPanel = 'true'
    container.appendChild(panel)

    clickOn(panel)
    expect(store.getState().isEditingCard).toBe(false)
  })

  it('does not consume clicks outside the container', () => {
    register()

    const outside = document.createElement('div')
    document.body.appendChild(outside)

    expect(clickOn(outside)).toBe(false)
    expect(store.getState().selectedCardKey).toBeNull()
  })

  it('selects on a plain click when the mousedown path did not fire', () => {
    register()

    expect(clickOn(target)).toBe(true)
    expect(store.getState().selectedCardKey).toBe(cardKey)
    expect(store.getState().isEditingCard).toBe(false)
  })

  it('lets mousedown move focus into inputs inside the card', () => {
    register()

    const input = document.createElement('input')
    container.appendChild(input)

    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    input.dispatchEvent(event)

    // selected, but default NOT prevented — the input keeps its focus path
    expect(store.getState().selectedCardKey).toBe(cardKey)
    expect(event.defaultPrevented).toBe(false)
  })

  it('stops responding after teardown', () => {
    const destroy = register()
    destroy()

    expect(clickOn(target)).toBe(false)
    expect(store.getState().selectedCardKey).toBeNull()
  })
})
