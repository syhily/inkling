import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CardSelectionStoreContext, useCardSelectionStore } from '@/context/CardSelectionStoreContext'
import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import {
  createCardSelectionStore,
  type CardSelectionState,
  type CardSelectionStore,
} from '@/plugins/behaviour/cardSelectionStore'

function storeWrapper(store: CardSelectionStore) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(CardSelectionStoreContext.Provider, { value: store }, children)
  }
}

describe('createCardSelectionStore', () => {
  it('starts with no selection and no editing card', () => {
    const store = createCardSelectionStore()

    expect(store.getState()).toEqual({ selectedCardKey: null, isEditingCard: false })
  })

  it('merges partial updates into the state', () => {
    const store = createCardSelectionStore()

    store.setState({ selectedCardKey: 'card-1' })
    expect(store.getState()).toEqual({ selectedCardKey: 'card-1', isEditingCard: false })

    store.setState({ isEditingCard: true })
    expect(store.getState()).toEqual({ selectedCardKey: 'card-1', isEditingCard: true })

    store.setState({ selectedCardKey: null, isEditingCard: false })
    expect(store.getState()).toEqual({ selectedCardKey: null, isEditingCard: false })
  })

  it('notifies listeners with the new state when a value changes', () => {
    const store = createCardSelectionStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState({ selectedCardKey: 'card-1' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ selectedCardKey: 'card-1', isEditingCard: false })
  })

  it('does not notify when the update keeps every value identical', () => {
    const store = createCardSelectionStore()
    const listener = vi.fn()

    store.setState({ selectedCardKey: 'card-1', isEditingCard: true })
    store.subscribe(listener)

    store.setState({ selectedCardKey: 'card-1' })
    store.setState({ isEditingCard: true })
    store.setState({})

    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies every subscriber and stops after unsubscribe', () => {
    const store = createCardSelectionStore()
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = store.subscribe(first)
    store.subscribe(second)

    store.setState({ selectedCardKey: 'card-1' })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    store.setState({ selectedCardKey: 'card-2' })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })
})

describe('useCardSelection', () => {
  it('returns the selected slice', () => {
    const store = createCardSelectionStore()
    store.setState({ selectedCardKey: 'card-1', isEditingCard: true })

    const selectedKey = renderHook(() => useCardSelection((state) => state.selectedCardKey), {
      wrapper: storeWrapper(store),
    })
    const editing = renderHook(() => useCardSelection((state) => state.isEditingCard), {
      wrapper: storeWrapper(store),
    })

    expect(selectedKey.result.current).toBe('card-1')
    expect(editing.result.current).toBe(true)
  })

  it('re-renders only when the selected slice changes', () => {
    const store = createCardSelectionStore()
    let renderCount = 0
    const { result } = renderHook(
      () => {
        renderCount += 1
        return useCardSelection((state: CardSelectionState) => state.selectedCardKey)
      },
      { wrapper: storeWrapper(store) },
    )

    expect(result.current).toBeNull()
    expect(renderCount).toBe(1)

    // an unrelated slice changing must not re-render this subscriber
    act(() => store.setState({ isEditingCard: true }))
    expect(renderCount).toBe(1)
    expect(result.current).toBeNull()

    act(() => store.setState({ selectedCardKey: 'card-1' }))
    expect(renderCount).toBe(2)
    expect(result.current).toBe('card-1')
  })

  it('tracks the isEditingCard slice independently of selection changes', () => {
    const store = createCardSelectionStore()
    let renderCount = 0
    const { result } = renderHook(
      () => {
        renderCount += 1
        return useCardSelection((state: CardSelectionState) => state.isEditingCard)
      },
      { wrapper: storeWrapper(store) },
    )

    act(() => store.setState({ selectedCardKey: 'card-1' }))
    expect(renderCount).toBe(1)
    expect(result.current).toBe(false)

    act(() => store.setState({ isEditingCard: true }))
    expect(renderCount).toBe(2)
    expect(result.current).toBe(true)
  })

  it('stops re-rendering after unmount', () => {
    const store = createCardSelectionStore()
    let renderCount = 0
    const { unmount } = renderHook(
      () => {
        renderCount += 1
        return useCardSelection((state: CardSelectionState) => state.selectedCardKey)
      },
      { wrapper: storeWrapper(store) },
    )

    unmount()
    act(() => store.setState({ selectedCardKey: 'card-1' }))

    expect(renderCount).toBe(1)
  })
})

describe('CardSelectionStoreContext', () => {
  it('provides a stable per-provider store instance', () => {
    const { result, rerender } = renderHook(() => useCardSelectionStore(), {
      wrapper: InklingSelectedCardContext,
    })
    const store = result.current

    rerender()

    expect(result.current).toBe(store)
    expect(store.getState()).toEqual({ selectedCardKey: null, isEditingCard: false })
  })

  it('creates a separate store per composer provider', () => {
    const first = renderHook(() => useCardSelectionStore(), { wrapper: InklingSelectedCardContext })
    const second = renderHook(() => useCardSelectionStore(), { wrapper: InklingSelectedCardContext })

    expect(first.result.current).not.toBe(second.result.current)

    act(() => first.result.current.setState({ selectedCardKey: 'card-1' }))
    expect(second.result.current.getState().selectedCardKey).toBeNull()
  })

  it('falls back to a default store outside any provider', () => {
    const { result } = renderHook(() => useCardSelectionStore())

    expect(result.current.getState()).toEqual({ selectedCardKey: null, isEditingCard: false })
  })
})
