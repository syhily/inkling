import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useWordCountHandle, WordCountHandleContext } from '@/context/WordCountHandleContext'
import { useWordCountCallback } from '@/hooks/useWordCountCallback'
import { createWordCountHandle, type WordCountHandle } from '@/plugins/behaviour/wordCountHandle'

function handleWrapper(handle: WordCountHandle) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(WordCountHandleContext.Provider, { value: handle }, children)
  }
}

describe('createWordCountHandle', () => {
  it('starts with no callback', () => {
    const handle = createWordCountHandle()

    expect(handle.getState()).toEqual({ onChange: null })
  })

  it('publishes and clears the callback', () => {
    const handle = createWordCountHandle()
    const onChange = vi.fn()

    handle.setState({ onChange })
    expect(handle.getState()).toEqual({ onChange })

    handle.setState({ onChange: null })
    expect(handle.getState()).toEqual({ onChange: null })
  })

  it('notifies listeners with the new state when the callback changes', () => {
    const handle = createWordCountHandle()
    const listener = vi.fn()
    handle.subscribe(listener)

    const onChange = vi.fn()
    handle.setState({ onChange })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ onChange })
  })

  it('does not notify when the update keeps the same callback identity', () => {
    const handle = createWordCountHandle()
    const onChange = vi.fn()
    const listener = vi.fn()

    handle.setState({ onChange })
    handle.subscribe(listener)

    handle.setState({ onChange })
    handle.setState({})

    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies every subscriber and stops after unsubscribe', () => {
    const handle = createWordCountHandle()
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = handle.subscribe(first)
    handle.subscribe(second)

    const onChange = vi.fn()
    handle.setState({ onChange })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    handle.setState({ onChange: null })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })
})

describe('useWordCountCallback', () => {
  it('returns the published callback', () => {
    const handle = createWordCountHandle()
    const onChange = vi.fn()
    handle.setState({ onChange })

    const { result } = renderHook(() => useWordCountCallback(), { wrapper: handleWrapper(handle) })

    expect(result.current).toBe(onChange)
  })

  it('re-renders when the callback lands and when it is cleared', () => {
    const handle = createWordCountHandle()
    let renderCount = 0
    const { result } = renderHook(
      () => {
        renderCount += 1
        return useWordCountCallback()
      },
      { wrapper: handleWrapper(handle) },
    )

    expect(result.current).toBeNull()
    expect(renderCount).toBe(1)

    const onChange = vi.fn()
    act(() => handle.setState({ onChange }))
    expect(renderCount).toBe(2)
    expect(result.current).toBe(onChange)

    act(() => handle.setState({ onChange: null }))
    expect(renderCount).toBe(3)
    expect(result.current).toBeNull()
  })

  it('stops re-rendering after unmount', () => {
    const handle = createWordCountHandle()
    let renderCount = 0
    const { unmount } = renderHook(
      () => {
        renderCount += 1
        return useWordCountCallback()
      },
      { wrapper: handleWrapper(handle) },
    )

    unmount()
    act(() => handle.setState({ onChange: vi.fn() }))

    expect(renderCount).toBe(1)
  })
})

describe('WordCountHandleContext', () => {
  it('falls back to a default handle outside any provider', () => {
    const { result } = renderHook(() => useWordCountHandle())

    expect(result.current.getState()).toEqual({ onChange: null })
  })
})
