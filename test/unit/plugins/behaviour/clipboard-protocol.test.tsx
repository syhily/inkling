import { createLexicalComposerContext, LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { act, renderHook } from '@testing-library/react'
import { createEditor } from 'lexical'
import React, { useMemo } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { getModifierState } from '@/plugins/behaviour/clipboard-protocol'
import { MarkdownPastePlugin } from '@/plugins/MarkdownPastePlugin'

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [],
    onError: () => {},
    theme: {},
  })
}

type TestEditor = ReturnType<typeof createTestEditor>

function TestWrapper({ children, editor }: { children: React.ReactNode; editor: TestEditor }) {
  const contextValue = useMemo(() => [editor, createLexicalComposerContext(null, {})] as const, [editor])
  return <LexicalComposerContext.Provider value={contextValue}>{children}</LexicalComposerContext.Provider>
}

describe('getModifierState', () => {
  it('returns the same state object for the same editor', () => {
    const editor = createTestEditor()
    expect(getModifierState(editor)).toBe(getModifierState(editor))
  })

  it('returns distinct state objects across editors', () => {
    const first = createTestEditor()
    const second = createTestEditor()
    expect(getModifierState(first)).not.toBe(getModifierState(second))
  })

  it('starts with no modifier pressed', () => {
    expect(getModifierState(createTestEditor()).current).toBe(false)
  })
})

describe('MarkdownPastePlugin modifier state', () => {
  it('tracks Shift through the shared modifier state without re-registering the paste listener', async () => {
    const editor = createTestEditor()
    const registerSpy = vi.spyOn(editor, 'registerCommand')

    await act(async () => {
      renderHook(() => MarkdownPastePlugin(), {
        wrapper: ({ children }) => <TestWrapper editor={editor}>{children}</TestWrapper>,
      })
    })

    const registrations = registerSpy.mock.calls.length
    expect(registrations).toBeGreaterThan(0)

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
    })
    expect(getModifierState(editor).current).toBe(true)

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }))
    })
    expect(getModifierState(editor).current).toBe(false)

    // the PASTE_MARKDOWN_COMMAND listener stays registered: Shift press/release
    // must not tear it down and re-register it
    expect(registerSpy.mock.calls.length).toBe(registrations)
  })
})
