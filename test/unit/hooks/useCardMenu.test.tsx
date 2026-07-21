import { act, renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createCommand,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createHostIntegrationValue } from '#/utils/host-integration-context'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardMenu } from '@/hooks/useCardMenu'
import DEFAULT_NODES from '@/nodes/DefaultNodes'

const INSERT_TEST_COMMAND = createCommand('INSERT_TEST_COMMAND')

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: 'test',
    nodes: DEFAULT_NODES,
    onError: () => {},
    theme: {},
  })
}

function createWrapper(cardConfig = {}) {
  const value = createHostIntegrationValue({ cardConfig })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <InklingHostIntegrationContext.Provider value={value}>{children}</InklingHostIntegrationContext.Provider>
  }
}

describe('useCardMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('builds the card menu from the registered card nodes as a flat list', () => {
    const editor = createTestEditor()
    const { result } = renderHook(() => useCardMenu(editor), { wrapper: createWrapper() })

    expect(result.current.cardMenu.items.length).toBeGreaterThan(0)
    expect(result.current.cardMenu.maxItemIndex).toBe(result.current.cardMenu.items.length - 1)
    expect(result.current.cardMenu.items.map((item) => item.label)).toContain('HTML')
  })

  it('filters the flat list by query', () => {
    const editor = createTestEditor()
    const { result } = renderHook(() => useCardMenu(editor, 'html'), { wrapper: createWrapper() })

    expect(result.current.cardMenu.items.map((item) => item.label)).toEqual(['HTML'])
  })

  it('dispatches the insert command with the resolved insertParams as dataset', () => {
    const editor = createTestEditor()
    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')
    const { result } = renderHook(() => useCardMenu(editor), { wrapper: createWrapper() })

    act(() => {
      result.current.insert(INSERT_TEST_COMMAND, { insertParams: { html: '<p>x</p>' } })
    })

    expect(dispatchCommandSpy).toHaveBeenCalledWith(INSERT_TEST_COMMAND, { html: '<p>x</p>' })
  })

  it('merges typed command params into the dataset under the item queryParams keys', () => {
    const editor = createTestEditor()
    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')
    const { result } = renderHook(() => useCardMenu(editor, 'image Nature', { commandParams: ['Nature'] }), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.insert(INSERT_TEST_COMMAND, { insertParams: { src: 'a.png' }, queryParams: ['tag'] })
    })

    expect(dispatchCommandSpy).toHaveBeenCalledWith(INSERT_TEST_COMMAND, { src: 'a.png', tag: 'Nature' })
  })

  it('replaces the trigger paragraph before dispatching when replaceTriggerParagraph is set', async () => {
    const editor = createTestEditor()
    const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')

    // discrete so the state is committed synchronously in a root-less editor
    editor.update(
      () => {
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('/html'))
        $getRoot().append(paragraph)
        paragraph.select()
      },
      { discrete: true },
    )

    const { result } = renderHook(() => useCardMenu(editor, 'html', { replaceTriggerParagraph: true }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.insert(INSERT_TEST_COMMAND, { insertParams: { html: '<p>x</p>' } })
      // the insert's own update is not discrete; let its commit land
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
    })

    expect(dispatchCommandSpy).toHaveBeenCalledWith(INSERT_TEST_COMMAND, { html: '<p>x</p>' })

    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild()
      // the "/html" trigger text is gone; a fresh empty paragraph holds the caret
      expect(paragraph?.getTextContent()).toBe('')
    })
  })
})
