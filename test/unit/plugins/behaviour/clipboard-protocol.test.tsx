import { createLexicalComposerContext, LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { act, renderHook } from '@testing-library/react'
import { createEditor } from 'lexical'
import React, { useMemo } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { getModifierState } from '@/plugins/behaviour/clipboard-protocol'
import { MarkdownPastePlugin } from '@/plugins/MarkdownPastePlugin'
import { isValidUrl } from '@/utils/isInternalUrl'

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

// Input-side link acceptance: which pasted text becomes a link. The function
// under test still lives in `@/utils/isInternalUrl` as `isValidUrl`; it moves
// into the protocol module under an input-side name in the follow-up commit.
describe('input-side link acceptance', () => {
  it('accepts http and https urls', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://example.com/path?query=1#hash')).toBe(true)
  })

  it('accepts mailto, tel, and ftp urls', () => {
    expect(isValidUrl('mailto:test@example.com')).toBe(true)
    expect(isValidUrl('tel:+1234567890')).toBe(true)
    expect(isValidUrl('ftp://example.com/file.txt')).toBe(true)
  })

  it('rejects javascript urls', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects malformed urls', () => {
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('https://')).toBe(false)
  })

  it('rejects relative urls', () => {
    expect(isValidUrl('/path')).toBe(false)
    expect(isValidUrl('#anchor')).toBe(false)
  })

  it('rejects urls with whitespace', () => {
    expect(isValidUrl(' https://example.com')).toBe(false)
    expect(isValidUrl('https://example.com ')).toBe(false)
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
    expect(isValidUrl('ftp://example.com/file')).toBe(true)
    expect(isSafeUrl('ftp://example.com/file')).toBe(false)
  })
})
