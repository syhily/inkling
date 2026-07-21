import { LexicalComposerContext, createLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { renderHook } from '@testing-library/react'
import { KEY_DOWN_COMMAND, createEditor } from 'lexical'
import React, { useMemo } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'

const emojiMartMocks = vi.hoisted(() => ({
  init: vi.fn(),
}))

vi.mock('emoji-mart', () => ({
  init: emojiMartMocks.init,
  SearchIndex: { search: vi.fn(() => Promise.resolve([])) },
}))

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [],
    onError: () => {},
    theme: {},
  })
}

function TestWrapper({ children, editor }: { children: React.ReactNode; editor: ReturnType<typeof createTestEditor> }) {
  const contextValue = useMemo<React.ContextType<typeof LexicalComposerContext>>(
    () => [editor, createLexicalComposerContext(null, {})],
    [editor],
  )
  return <LexicalComposerContext.Provider value={contextValue}>{children}</LexicalComposerContext.Provider>
}

function mountPlugin(editor: ReturnType<typeof createTestEditor>) {
  return renderHook(() => EmojiPickerPlugin(), {
    wrapper: ({ children }: { children: React.ReactNode }) => <TestWrapper editor={editor}>{children}</TestWrapper>,
  })
}

describe('EmojiPickerPlugin', () => {
  // this test must run before any other mount in this file: the init guard is
  // module-scoped, so only the first mount initializes emoji-mart
  it('initializes emoji-mart data once, not per mount', () => {
    const editor = createTestEditor()
    mountPlugin(editor).unmount()
    mountPlugin(editor).unmount()
    expect(emojiMartMocks.init).toHaveBeenCalledTimes(1)
  })

  it('registers the KEY_DOWN_COMMAND listener once and does not re-register on re-render', () => {
    const editor = createTestEditor()
    const registerSpy = vi.spyOn(editor, 'registerCommand')
    const { rerender, unmount } = mountPlugin(editor)
    rerender()
    rerender()
    const keyDownRegistrations = registerSpy.mock.calls.filter(([command]) => command === KEY_DOWN_COMMAND)
    expect(keyDownRegistrations).toHaveLength(1)
    unmount()
    registerSpy.mockRestore()
  })

  it('adds the document keydown listener once and removes it on unmount', () => {
    const editor = createTestEditor()
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = mountPlugin(editor)
    expect(addSpy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1)
    unmount()
    expect(removeSpy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1)
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
