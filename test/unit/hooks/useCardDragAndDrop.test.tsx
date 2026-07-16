import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DragDropHandleContext } from '@/context/DragDropHandleContext'
import useCardDragAndDrop from '@/hooks/useCardDragAndDrop'
import { createDragDropHandle } from '@/plugins/behaviour/dragDropHandle'

const mockContainer = {
  enableDrag: vi.fn(),
  disableDrag: vi.fn(),
  refresh: vi.fn(),
  destroy: vi.fn(),
}

const mockDragDropHandler = {
  registerContainer: vi.fn(() => mockContainer),
}

function makeWrapper(withHandler: boolean) {
  // a real handle instance; withHandler=false pins the silent no-op when the
  // reorder plugin never publishes a handler
  const dragDropHandle = createDragDropHandle()
  if (withHandler) {
    dragDropHandle.setState({ handler: mockDragDropHandler as never })
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

    expect(mockDragDropHandler.registerContainer).not.toHaveBeenCalled()
  })

  it('registers a drag/drop container with the named callbacks when a handler is available', async () => {
    const { result } = renderDragAndDropHook()
    const element = document.createElement('div')

    await act(async () => {
      result.current.setRef(element)
    })

    expect(mockDragDropHandler.registerContainer).toHaveBeenCalledWith(
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
  })
})
