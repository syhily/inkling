import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { DragDropHandleContext } from '@/context/DragDropHandleContext'
import useCardDragAndDrop from '@/hooks/useCardDragAndDrop'
import { createDragDropHandle } from '@/plugins/behaviour/dragDropHandle'
import { DragDropHandler } from '@/utils/draggable/DragDropHandler'

const mockContainer = {
  enableDrag: vi.fn(),
  disableDrag: vi.fn(),
  refresh: vi.fn(),
  destroy: vi.fn(),
}

const dragDropHandler = new DragDropHandler()
const registerContainer = vi.spyOn(dragDropHandler, 'registerContainer').mockReturnValue(mockContainer)

afterAll(() => {
  dragDropHandler.destroy()
})

function makeWrapper(withHandler: boolean) {
  // a real handle instance; withHandler=false pins the silent no-op when the
  // reorder plugin never publishes a handler
  const dragDropHandle = createDragDropHandle()
  if (withHandler) {
    dragDropHandle.setState({ handler: dragDropHandler })
  }
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(DragDropHandleContext.Provider, { value: dragDropHandle }, children)
}

// stable so the registration effect does not churn between rerenders — the
// enable/disable pair can then be observed on the live container
const stableCanDrop = () => true

function renderDragAndDropHook({ withHandler = true }: { withHandler?: boolean } = {}) {
  return renderHook(
    ({ enabled }) =>
      useCardDragAndDrop({
        enabled,
        canDrop: stableCanDrop,
        draggableSelector: '[data-draggable]',
        droppableSelector: '[data-droppable]',
      }),
    { wrapper: makeWrapper(withHandler), initialProps: { enabled: true } },
  )
}

describe('useCardDragAndDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('never calls registerContainer when the handle has no handler', async () => {
    // the silent no-op when drag reorder is disabled: the plugin that installs
    // the handler never mounts, so the hook does nothing for the editor's
    // lifetime
    const { result } = renderDragAndDropHook({ withHandler: false })

    await act(async () => {
      result.current.setRef(document.createElement('div'))
    })

    expect(registerContainer).not.toHaveBeenCalled()
  })

  it('registers a drag/drop container with the named callbacks when a handler is available', async () => {
    const { result } = renderDragAndDropHook()
    const element = document.createElement('div')

    await act(async () => {
      result.current.setRef(element)
    })

    expect(registerContainer).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        draggable: expect.objectContaining({
          draggableSelector: '[data-draggable]',
          isDragEnabled: true,
          getDraggableInfo: expect.any(Function),
        }),
        droppable: expect.objectContaining({
          droppableSelector: '[data-droppable]',
          getIndicatorPosition: expect.any(Function),
          onDrop: expect.any(Function),
          onDragEnterContainer: expect.any(Function),
          onDragLeaveContainer: expect.any(Function),
        }),
        lifecycle: expect.objectContaining({
          onDragStart: expect.any(Function),
          onDragEnd: expect.any(Function),
          onDropEnd: expect.any(Function),
        }),
      }),
    )
  })

  it('calls enableDrag/disableDrag on the registered container as enabled toggles', async () => {
    const { result, rerender } = renderDragAndDropHook()

    await act(async () => {
      result.current.setRef(document.createElement('div'))
    })

    rerender({ enabled: false })
    expect(mockContainer.disableDrag).toHaveBeenCalledTimes(1)
    expect(mockContainer.enableDrag).not.toHaveBeenCalled()

    rerender({ enabled: true })
    expect(mockContainer.enableDrag).toHaveBeenCalledTimes(1)
    expect(mockContainer.disableDrag).toHaveBeenCalledTimes(1)

    // enabled toggles flow through the enable/disable pair only — the
    // container is never destroyed and re-registered (that was the orphaned-
    // container bug plan 047 removed)
    expect(registerContainer).toHaveBeenCalledTimes(1)
    expect(mockContainer.destroy).not.toHaveBeenCalled()
  })

  it('registers when the handler arrives after the hook mounted', async () => {
    // the mount-order improvement: the reorder plugin can publish the handler
    // after card hooks already mounted, and they register on its arrival
    const dragDropHandle = createDragDropHandle()
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(DragDropHandleContext.Provider, { value: dragDropHandle }, children)
    const { result } = renderHook(
      () =>
        useCardDragAndDrop({
          enabled: true,
          canDrop: stableCanDrop,
          draggableSelector: '[data-draggable]',
          droppableSelector: '[data-droppable]',
        }),
      { wrapper },
    )

    await act(async () => {
      result.current.setRef(document.createElement('div'))
    })
    expect(registerContainer).not.toHaveBeenCalled()

    await act(async () => {
      dragDropHandle.setState({ handler: dragDropHandler })
    })

    expect(registerContainer).toHaveBeenCalledTimes(1)
  })
})
