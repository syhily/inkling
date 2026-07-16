import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import InklingComposerContext from '@/context/InklingComposerContext'
import useCardDragAndDrop from '@/hooks/useCardDragAndDrop'

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
  const contextValue = withHandler ? { dragDropHandler: mockDragDropHandler } : {}
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      InklingComposerContext.Provider,
      { value: contextValue as React.ContextType<typeof InklingComposerContext> },
      children,
    )
}

function renderDragAndDropHook({ withHandler = true }: { withHandler?: boolean } = {}) {
  return renderHook(
    ({ enabled }) =>
      useCardDragAndDrop({
        enabled,
        canDrop: () => true,
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

  it('never calls registerContainer when the context has no dragDropHandler', async () => {
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
        draggableSelector: '[data-draggable]',
        droppableSelector: '[data-droppable]',
        isDragEnabled: true,
        onDragStart: expect.any(Function),
        onDragEnd: expect.any(Function),
        onDragEnterContainer: expect.any(Function),
        onDragLeaveContainer: expect.any(Function),
        onDragEnterDroppable: expect.any(Function),
        onDragOverDroppable: expect.any(Function),
        onDragLeaveDroppable: expect.any(Function),
        getDraggableInfo: expect.any(Function),
        getIndicatorPosition: expect.any(Function),
        onDrop: expect.any(Function),
        onDropEnd: expect.any(Function),
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
