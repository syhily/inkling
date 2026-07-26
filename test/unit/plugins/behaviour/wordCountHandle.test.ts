import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useWordCountHandle } from '@/context/WordCountHandleContext'
import { createWordCountHandle } from '@/plugins/behaviour/wordCountHandle'

// Thin per-instance suite: the generic handle semantics (partial setState,
// change guard, subscribe/unsubscribe, fallback) live in
// composer-handle.test.ts. What remains here is the word-count channel's own
// state shape and its context wiring.

describe('createWordCountHandle', () => {
  it('starts with no callback and no language', () => {
    const handle = createWordCountHandle()

    expect(handle.getState()).toEqual({ onChange: null, language: null })
  })
})

describe('WordCountHandleContext', () => {
  it('falls back to a default handle outside any provider', () => {
    const { result } = renderHook(() => useWordCountHandle())

    expect(result.current.getState()).toEqual({ onChange: null, language: null })
  })
})
