import React from 'react'

import type { DraggableInfo, IndicatorPosition } from '@/utils/draggable/DragDropContainer'
import type { DraggableContainerHandle } from '@/utils/draggable/DragDropHandler'

import { useDragDropState } from '@/hooks/useDragDropState'

export interface UseCardDragAndDropOptions {
  enabled?: boolean
  canDrop: (draggableInfo: DraggableInfo) => boolean
  onDrop?: (draggableInfo: DraggableInfo) => boolean | undefined
  onDropEnd?: (draggableInfo: DraggableInfo, success: boolean) => void
  getDraggableInfo?: (draggableElement: HTMLElement | null) => DraggableInfo | false | undefined
  getIndicatorPosition?: (draggableInfo: DraggableInfo) => IndicatorPosition | false
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
  const dragDropContainer = React.useRef<DraggableContainerHandle | null>(null)

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
    (draggableInfo: DraggableInfo): IndicatorPosition | false => {
      return getIndicatorPosition?.(draggableInfo) ?? false
    },
    [getIndicatorPosition],
  )

  const _getDraggableInfo = React.useCallback(
    (draggableElement: HTMLElement | null): DraggableInfo | false => {
      return getDraggableInfo?.(draggableElement) ?? false
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
