import React from 'react'

import type { DraggableInfo, IndicatorPosition } from '@/utils/draggable/DragDropContainer'

import { useDragDropState } from '@/hooks/useDragDropState'

export interface UseCardDragAndDropOptions {
  enabled?: boolean
  canDrop: (draggableInfo: DraggableInfo) => boolean
  onDrop?: (draggableInfo: DraggableInfo) => boolean | undefined
  onDropEnd?: (draggableInfo: DraggableInfo, success: boolean) => void
  getDraggableInfo?: (draggableElement: HTMLElement | null) => DraggableInfo | Record<string, never>
  getIndicatorPosition?: (draggableInfo: DraggableInfo) => IndicatorPosition | false | undefined
  draggableSelector: string
  droppableSelector: string
}

export interface UseCardDragAndDropResult {
  setRef: React.Dispatch<React.SetStateAction<HTMLElement | null>>
  isDraggedOver: boolean
}

export default function useCardDragAndDrop({
  enabled = true,
  canDrop,
  onDrop,
  onDropEnd,
  getDraggableInfo,
  getIndicatorPosition,
  draggableSelector,
  droppableSelector,
}: UseCardDragAndDropOptions): UseCardDragAndDropResult {
  const handler = useDragDropState((state) => state.handler)

  const [containerRef, setContainerRef] = React.useState<HTMLElement | null>(null)
  const [isDraggedOver, setIsDraggedOver] = React.useState<boolean>(false)
  const dragDropContainer = React.useRef<{
    enableDrag: () => void
    disableDrag: () => void
    destroy: () => void
  } | null>(null)

  const onDragStart = React.useCallback(
    (draggableInfo: DraggableInfo) => {
      if (canDrop(draggableInfo)) {
        dragDropContainer.current?.enableDrag()
      } else {
        dragDropContainer.current?.disableDrag()
      }
    },
    [canDrop],
  )

  const onDragEnd = React.useCallback(() => {
    setIsDraggedOver(false)
  }, [setIsDraggedOver])

  const onDragEnterContainer = React.useCallback(
    (draggableInfo: DraggableInfo) => {
      setIsDraggedOver(canDrop(draggableInfo))
    },
    [setIsDraggedOver, canDrop],
  )

  const onDragLeaveContainer = React.useCallback(() => {
    setIsDraggedOver(false)
  }, [setIsDraggedOver])

  const _onDrop = React.useCallback(
    (draggableInfo: DraggableInfo) => {
      return onDrop?.(draggableInfo) || false
    },
    [onDrop],
  )

  const _onDropEnd = React.useCallback(
    (draggableInfo: DraggableInfo, success: boolean) => {
      onDropEnd?.(draggableInfo, success)
    },
    [onDropEnd],
  )

  const _getIndicatorPosition = React.useCallback(
    (draggableInfo: DraggableInfo) => {
      return getIndicatorPosition?.(draggableInfo) || false
    },
    [getIndicatorPosition],
  )

  const _getDraggableInfo = React.useCallback(
    (draggableElement: HTMLElement | null): DraggableInfo | false => {
      const result = getDraggableInfo?.(draggableElement)
      if (!result || Object.keys(result).length === 0) {
        return false
      }
      return result as DraggableInfo
    },
    [getDraggableInfo],
  )

  React.useEffect(() => {
    if (enabled) {
      dragDropContainer.current?.enableDrag()
    } else {
      dragDropContainer.current?.disableDrag()
    }
  }, [enabled, containerRef])

  React.useEffect(() => {
    if (!containerRef || !handler) {
      return
    }

    const container = handler.registerContainer(containerRef, {
      draggable: {
        draggableSelector,
        isDragEnabled: enabled,
        getDraggableInfo: _getDraggableInfo,
      },
      droppable: {
        droppableSelector,
        getIndicatorPosition: _getIndicatorPosition,
        onDrop: _onDrop,
        onDragEnterContainer,
        onDragLeaveContainer,
      },
      lifecycle: {
        onDragStart,
        onDragEnd,
        onDropEnd: _onDropEnd,
      },
    })
    dragDropContainer.current = container

    // unregister on handler swap/unmount; calling destroy() after the handler
    // itself was destroyed is harmless (DragDropHandler disables and filters)
    return () => {
      container.destroy()
      dragDropContainer.current = null
    }
    // `enabled` is intentionally excluded from the deps: toggles flow through
    // the enable/disable effect pair above (mirroring useGalleryReorder), and
    // a re-registration always reads the latest enabled from the render
    // closure
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _getDraggableInfo,
    _getIndicatorPosition,
    _onDrop,
    _onDropEnd,
    containerRef,
    draggableSelector,
    droppableSelector,
    handler,
    onDragEnd,
    onDragEnterContainer,
    onDragLeaveContainer,
    onDragStart,
  ])

  return { setRef: setContainerRef, isDraggedOver }
}
