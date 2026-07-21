import React from 'react'

import type { GalleryImage } from '@/types/gallery'
import type { DraggableInfo, DroppablePosition, IndicatorPosition } from '@/utils/draggable/DragDropContainer'

import { pick } from '@/utils'
import {
  adjustInsertIndexForRemoval,
  createReorderGeometry,
  resolveDrop,
  resolveReorder,
} from '@/utils/draggable/reorder-rules'
import { useDragDropContainer } from '@/utils/draggable/useDragDropContainer'
import { getImageFilenameFromSrc } from '@/utils/getImageFilenameFromSrc'

export type { GalleryImage }

interface UseGalleryReorderOptions {
  images: GalleryImage[]
  updateImages: (images: GalleryImage[]) => void
  isSelected?: boolean
  maxImages?: number
  disabled?: boolean
}

export interface UseGalleryReorderResult {
  setContainerRef: React.Dispatch<React.SetStateAction<HTMLElement | null>>
  isDraggedOver: boolean
}

export default function useGalleryReorder({
  images,
  updateImages,
  isSelected = false,
  maxImages = 9,
  disabled = false,
}: UseGalleryReorderOptions): UseGalleryReorderResult {
  const [containerRef, setContainerRef] = React.useState<HTMLElement | null>(null)
  const [isDraggedOver, setIsDraggedOver] = React.useState<boolean>(false)

  const onDrop = (draggableInfo: DraggableInfo) => {
    // do not allow dropping of non-images
    if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
      return false
    }

    const updatedImages: GalleryImage[] = [...images]
    // insertIndex was derived by getIndicatorPosition (resolveReorder) and
    // ferried here by the handler; an empty gallery has no droppables to
    // derive one from, so the first image lands at slot 0
    let insertIndex: number = draggableInfo.insertIndex ?? 0
    if (!updatedImages.length) {
      insertIndex = 0
    }

    const resolution = resolveDrop(
      createReorderGeometry(containerRef, '[data-image]'),
      draggableInfo.element,
      insertIndex,
    )
    if (!resolution) {
      return false
    }
    const { draggableIndex } = resolution

    if (draggableIndex === -1) {
      // external image being added
      const { dataset } = draggableInfo
      const src = dataset.src
      if (typeof src !== 'string') {
        return false
      }

      const img = draggableInfo.element?.querySelector<HTMLImageElement>('img')

      // image card datasets may not have all of the details we need but we can fill them in
      const width = typeof dataset.width === 'number' ? dataset.width : img?.naturalWidth
      const height = typeof dataset.height === 'number' ? dataset.height : img?.naturalHeight
      const fileName =
        typeof dataset.fileName === 'string' && dataset.fileName ? dataset.fileName : getImageFilenameFromSrc(src)

      const newImage: GalleryImage = {
        src,
        fileName,
        row: typeof dataset.row === 'number' ? dataset.row : undefined,
        width,
        height,
        caption: typeof dataset.caption === 'string' ? dataset.caption : undefined,
      }

      updatedImages.splice(insertIndex, 0, newImage)
    } else {
      // internal image being re-ordered
      const draggedImage = updatedImages.find((i) => i.src === draggableInfo.dataset.src)
      if (!draggedImage) {
        return false
      }
      const filtered = updatedImages.filter((i) => i !== draggedImage)
      filtered.splice(adjustInsertIndexForRemoval(draggableIndex, insertIndex), 0, draggedImage)
      updateImages(filtered)
      container.refresh()

      // this gallery consumed the drop itself — onDropEnd must not remove it
      return { success: true, sourceHandled: true }
    }

    updateImages(updatedImages)
    container.refresh()

    // this gallery consumed the drop itself — onDropEnd must not remove it
    return { success: true, sourceHandled: true }
  }

  // if an image is dragged out of a gallery we need to remove it
  const onDropEnd = (draggableInfo: DraggableInfo, success: boolean, sourceHandled: boolean) => {
    if (sourceHandled || !success) {
      return
    }

    const image = images.find((i) => i.src === draggableInfo.dataset.src)
    if (image) {
      const updatedImages = images.filter((i) => i !== image)
      updateImages(updatedImages)
      container.refresh()
    }
  }

  const getDraggableInfo = (draggableElement: HTMLElement | null): DraggableInfo | false => {
    const src = draggableElement?.querySelector('img')?.getAttribute('src')
    const image = images.find((i) => i.src === src) || images.find((i) => i.previewSrc === src)

    if (image) {
      return {
        type: 'image',
        element: draggableElement,
        target: null,
        mousePosition: { x: 0, y: 0 },
        dataset: pick(image, ['fileName', 'src', 'row', 'width', 'height', 'caption']),
      }
    }

    return false
  }

  const getIndicatorPosition = (
    draggableInfo: DraggableInfo,
    droppableElem: HTMLElement,
    position: DroppablePosition,
  ): IndicatorPosition | false => {
    // do not allow dropping of non-images
    if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
      return false
    }

    if (!droppableElem.closest('[data-row]')) {
      return false
    }

    // the single insertIndex derivation of this drag — the handler ferries it
    // to onDrop on draggableInfo.insertIndex
    const resolution = resolveReorder(
      createReorderGeometry(containerRef, '[data-image]'),
      draggableInfo.element,
      droppableElem,
      position,
      'horizontal',
    )

    return resolution ? { insertIndex: resolution.insertIndex } : false
  }

  const container = useDragDropContainer({
    element: containerRef,
    enabled: isSelected,
    // re-register when the image set changes so the container re-scans the
    // gallery's draggable/droppable markers (callbacks are ref-forwarded and
    // would see fresh images either way)
    reRegisterKey: images,
    draggable: {
      draggableSelector: '[data-image]',
      isDragEnabled: !disabled && images.length > 0,
      getDraggableInfo,
    },
    droppable: {
      droppableSelector: '[data-image]',
      getIndicatorPosition,
      onDrop,
      onDragEnterContainer: () => {
        setIsDraggedOver(true)
      },
      onDragLeaveContainer: () => {
        setIsDraggedOver(false)
      },
    },
    lifecycle: {
      onDragStart: (draggableInfo) => {
        // enable dropping when an image is dragged in from outside of this card
        const isImageDrag = draggableInfo.type === 'image' || draggableInfo.cardName === 'image'
        if (isImageDrag && draggableInfo.dataset.src && images.length !== maxImages) {
          container.enableDrag()
        }
      },
      onDragEnd: () => {
        setIsDraggedOver(false)
      },
      onDropEnd,
    },
  })

  return { setContainerRef, isDraggedOver }
}
