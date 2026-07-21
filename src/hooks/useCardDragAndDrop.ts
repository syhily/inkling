import React from 'react'

import type { DraggableInfo, DropResult, IndicatorPosition } from '@/utils/draggable/DragDropContainer'

import { useDragDropContainer } from '@/utils/draggable/useDragDropContainer'

export interface UseCardDragAndDropOptions {
  enabled?: boolean
  canDrop: (draggableInfo: DraggableInfo) => boolean
  onDrop?: (draggableInfo: DraggableInfo) => DropResult | undefined
  onDropEnd?: (draggableInfo: DraggableInfo, success: boolean, sourceHandled: boolean) => void
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
  const [containerRef, setContainerRef] = React.useState<HTMLElement | null>(null)
  const [isDraggedOver, setIsDraggedOver] = React.useState<boolean>(false)

  const container = useDragDropContainer({
    element: containerRef,
    enabled,
    draggable: {
      draggableSelector,
      isDragEnabled: enabled,
      getDraggableInfo: (draggableElement) => getDraggableInfo?.(draggableElement) ?? false,
    },
    droppable: {
      droppableSelector,
      getIndicatorPosition: (draggableInfo) => getIndicatorPosition?.(draggableInfo) ?? false,
      onDrop: (draggableInfo) => onDrop?.(draggableInfo) ?? false,
      onDragEnterContainer: (draggableInfo) => {
        setIsDraggedOver(canDrop(draggableInfo))
      },
      onDragLeaveContainer: () => {
        setIsDraggedOver(false)
      },
    },
    lifecycle: {
      onDragStart: (draggableInfo) => {
        if (canDrop(draggableInfo)) {
          container.enableDrag()
        } else {
          container.disableDrag()
        }
      },
      onDragEnd: () => {
        setIsDraggedOver(false)
      },
      onDropEnd: (draggableInfo, success, sourceHandled) => {
        onDropEnd?.(draggableInfo, success, sourceHandled)
      },
    },
  })

  return { setRef: setContainerRef, isDraggedOver }
}
