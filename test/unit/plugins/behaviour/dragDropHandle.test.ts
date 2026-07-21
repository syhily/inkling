import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DragDropHandleContext, useDragDropHandle } from '@/context/DragDropHandleContext'
import { useDragDropState } from '@/hooks/useDragDropState'
import { createDragDropHandle, type DragDropHandle } from '@/plugins/behaviour/dragDropHandle'
import { DragDropHandler } from '@/utils/draggable/DragDropHandler'

const handlers = new Set<DragDropHandler>()

function createHandler() {
  const handler = new DragDropHandler()
  handlers.add(handler)
  return handler
}

afterEach(() => {
  handlers.forEach((handler) => handler.destroy())
  handlers.clear()
})

function handleWrapper(handle: DragDropHandle) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(DragDropHandleContext.Provider, { value: handle }, children)
  }
}

describe('createDragDropHandle', () => {
  it('starts with no container element and no handler', () => {
    const handle = createDragDropHandle()

    expect(handle.getState()).toEqual({ containerElement: null, handler: null, isDragging: false })
  })

  it('merges partial updates into the state', () => {
    const handle = createDragDropHandle()
    const element = document.createElement('div')
    const handler = createHandler()

    handle.setState({ containerElement: element })
    expect(handle.getState()).toEqual({ containerElement: element, handler: null, isDragging: false })

    handle.setState({ handler })
    expect(handle.getState()).toEqual({ containerElement: element, handler, isDragging: false })

    handle.setState({ containerElement: null, handler: null })
    expect(handle.getState()).toEqual({ containerElement: null, handler: null, isDragging: false })
  })

  it('tracks the isDragging flag as an independent slice', () => {
    const handle = createDragDropHandle()
    const listener = vi.fn()
    handle.subscribe(listener)

    handle.setState({ isDragging: true })
    expect(handle.getState().isDragging).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    // an identical flag is swallowed by the change guard
    handle.setState({ isDragging: true })
    expect(listener).toHaveBeenCalledTimes(1)

    handle.setState({ isDragging: false })
    expect(handle.getState().isDragging).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('notifies listeners with the new state when a value changes', () => {
    const handle = createDragDropHandle()
    const listener = vi.fn()
    handle.subscribe(listener)

    const handler = createHandler()
    handle.setState({ handler })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ containerElement: null, handler, isDragging: false })
  })

  it('does not notify when the update keeps every value identical', () => {
    const handle = createDragDropHandle()
    const element = document.createElement('div')
    const listener = vi.fn()

    handle.setState({ containerElement: element, handler: null })
    handle.subscribe(listener)

    handle.setState({ containerElement: element })
    handle.setState({ handler: null })
    handle.setState({})

    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies every subscriber and stops after unsubscribe', () => {
    const handle = createDragDropHandle()
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = handle.subscribe(first)
    handle.subscribe(second)

    const handler = createHandler()
    handle.setState({ handler })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    handle.setState({ handler: null })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })
})

describe('useDragDropState', () => {
  it('returns the selected slice', () => {
    const handle = createDragDropHandle()
    const element = document.createElement('div')
    const handler = createHandler()
    handle.setState({ containerElement: element, handler })

    const containerElement = renderHook(() => useDragDropState((state) => state.containerElement), {
      wrapper: handleWrapper(handle),
    })
    const boundHandler = renderHook(() => useDragDropState((state) => state.handler), {
      wrapper: handleWrapper(handle),
    })

    expect(containerElement.result.current).toBe(element)
    expect(boundHandler.result.current).toBe(handler)
  })

  it('re-renders only when the selected slice changes', () => {
    const handle = createDragDropHandle()
    let renderCount = 0
    const { result } = renderHook(
      () => {
        renderCount += 1
        return useDragDropState((state) => state.handler)
      },
      { wrapper: handleWrapper(handle) },
    )

    expect(result.current).toBeNull()
    expect(renderCount).toBe(1)

    // an unrelated slice changing must not re-render this subscriber
    act(() => handle.setState({ containerElement: document.createElement('div') }))
    expect(renderCount).toBe(1)
    expect(result.current).toBeNull()

    const handler = createHandler()
    act(() => handle.setState({ handler }))
    expect(renderCount).toBe(2)
    expect(result.current).toBe(handler)
  })

  it('stops re-rendering after unmount', () => {
    const handle = createDragDropHandle()
    let renderCount = 0
    const { unmount } = renderHook(
      () => {
        renderCount += 1
        return useDragDropState((state) => state.handler)
      },
      { wrapper: handleWrapper(handle) },
    )

    unmount()
    act(() => handle.setState({ handler: createHandler() }))

    expect(renderCount).toBe(1)
  })
})

describe('DragDropHandleContext', () => {
  it('falls back to a default handle outside any provider', () => {
    const { result } = renderHook(() => useDragDropHandle())

    expect(result.current.getState()).toEqual({ containerElement: null, handler: null, isDragging: false })
  })
})
