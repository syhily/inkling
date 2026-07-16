import type { LexicalEditor } from 'lexical'

import { render } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import InklingNestedComposer from '@/components/InklingNestedComposer'
import InklingComposerContext from '@/context/InklingComposerContext'
import WordCountPlugin from '@/plugins/WordCountPlugin'

// The pin is the conditional mount of the nested WordCountPlugin, not
// Lexical's nested composer machinery, so everything below the conditional is
// mocked out.
vi.mock('@lexical/react/LexicalNestedComposer', () => ({
  LexicalNestedComposer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@lexical/react/LexicalCollaborationContext', () => ({
  useCollaborationContext: () => ({ isCollabActive: false }),
}))
vi.mock('@lexical/react/LexicalCollaborationPlugin', () => ({
  CollaborationPlugin: vi.fn(() => null),
}))
vi.mock('@/plugins/WordCountPlugin', () => ({
  WordCountPlugin: vi.fn(() => null),
  default: vi.fn(() => null),
}))
vi.mock('@/plugins/TKPlugin', () => ({
  default: () => null,
}))
vi.mock('@/plugins/ReplacementStringsPlugin', () => ({
  default: () => null,
}))

function createContextValue(onWordCountChangeRef: { current: ((count: number) => void) | null }) {
  return {
    fileUploader: { useFileUpload: () => ({ upload: vi.fn() }) },
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    editorContainerRef: { current: null },
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef,
    onError: vi.fn(),
  }
}

function renderNestedComposer(onWordCountChangeRef: { current: ((count: number) => void) | null }) {
  return render(
    <InklingComposerContext.Provider value={createContextValue(onWordCountChangeRef)}>
      <InklingNestedComposer initialEditor={{} as LexicalEditor}>
        <div />
      </InklingNestedComposer>
    </InklingComposerContext.Provider>,
  )
}

describe('InklingNestedComposer word-count channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts a nested WordCountPlugin when the shared callback ref is set at render time', () => {
    const onChange = vi.fn()
    renderNestedComposer({ current: onChange })

    expect(vi.mocked(WordCountPlugin)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(WordCountPlugin).mock.calls[0][0]).toEqual({ onChange })
  })

  it('does not mount a nested WordCountPlugin when the shared callback ref is empty', () => {
    renderNestedComposer({ current: null })

    expect(vi.mocked(WordCountPlugin)).not.toHaveBeenCalled()
  })
})
