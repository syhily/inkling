import type { LexicalEditor } from 'lexical'

import { render } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import InklingNestedComposer from '@/components/InklingNestedComposer'
import InklingCollaborationContext from '@/context/InklingCollaborationContext'
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

function createCollaborationValue() {
  return {
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
  }
}

function createLegacyValue(onWordCountChangeRef: { current: ((count: number) => void) | null }) {
  return {
    editorContainerRef: { current: null },
    onWordCountChangeRef,
  }
}

function renderNestedComposer(onWordCountChangeRef: { current: ((count: number) => void) | null }) {
  const collaborationValue = createCollaborationValue()
  const legacyValue = createLegacyValue(onWordCountChangeRef)

  return render(
    <InklingCollaborationContext.Provider value={collaborationValue}>
      <InklingComposerContext.Provider value={legacyValue}>
        <InklingNestedComposer initialEditor={{} as LexicalEditor}>
          <div />
        </InklingNestedComposer>
      </InklingComposerContext.Provider>
    </InklingCollaborationContext.Provider>,
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
