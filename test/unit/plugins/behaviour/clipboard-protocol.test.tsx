import { createLexicalComposerContext, LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { act, renderHook } from '@testing-library/react'
import { createEditor } from 'lexical'
import React, { useMemo } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { getModifierState, isPasteableLinkUrl } from '@/plugins/behaviour/clipboard-protocol'
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
  const contextValue = useMemo<React.ContextType<typeof LexicalComposerContext>>(
    () => [editor, createLexicalComposerContext(null, {})],
    [editor],
  )
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

// Input-side link acceptance: which pasted text becomes a link (moved from
// `describe('isValidUrl')` in `test/unit/utils/isInternalUrl.test.ts` with
// the function's move into the protocol module).
describe('isPasteableLinkUrl', () => {
  it('accepts http and https urls', () => {
    expect(isPasteableLinkUrl('https://example.com')).toBe(true)
    expect(isPasteableLinkUrl('http://example.com')).toBe(true)
    expect(isPasteableLinkUrl('https://example.com/path?query=1#hash')).toBe(true)
  })

  it('accepts mailto, tel, and ftp urls', () => {
    expect(isPasteableLinkUrl('mailto:test@example.com')).toBe(true)
    expect(isPasteableLinkUrl('tel:+1234567890')).toBe(true)
    expect(isPasteableLinkUrl('ftp://example.com/file.txt')).toBe(true)
  })

  it('rejects javascript urls', () => {
    expect(isPasteableLinkUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects malformed urls', () => {
    expect(isPasteableLinkUrl('not a url')).toBe(false)
    expect(isPasteableLinkUrl('')).toBe(false)
    expect(isPasteableLinkUrl('https://')).toBe(false)
  })

  it('rejects relative urls', () => {
    expect(isPasteableLinkUrl('/path')).toBe(false)
    expect(isPasteableLinkUrl('#anchor')).toBe(false)
  })

  it('rejects urls with whitespace', () => {
    expect(isPasteableLinkUrl(' https://example.com')).toBe(false)
    expect(isPasteableLinkUrl('https://example.com ')).toBe(false)
  })
})

describe('input/export url policy divergence', () => {
  it('pins the deliberate scheme divergence across the export seam', () => {
    // Two deliberate policies that do not compose: the input side accepts
    // ftp/mailto/tel as pasteable links (pinned since plan 001), while the
    // export side's navigation policy (`isSafeUrl`, behind the render
    // context's `safeUrl`; plans 001/030/040) keeps only http/https/relative.
    // A pasted ftp/mailto/tel link is live in the editor and blanked on
    // export — documented and pinned here, deliberately not aligned.
    expect(isPasteableLinkUrl('ftp://example.com/file')).toBe(true)
    expect(isSafeUrl('ftp://example.com/file')).toBe(false)
  })
})
