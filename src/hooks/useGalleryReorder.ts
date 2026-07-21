import React from 'react'

import type { GalleryImage } from '@/types/gallery'
import type { DraggableInfo, DroppablePosition, IndicatorPosition } from '@/utils/draggable/DragDropContainer'

import { pick } from '@/utils'
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
    let insertIndex: number = draggableInfo.insertIndex ?? 0
    const droppables = Array.from(containerRef?.querySelectorAll<HTMLElement>('[data-image]') ?? [])
    const draggableIndex = draggableInfo.element ? droppables.indexOf(draggableInfo.element) : -1

    if (!updatedImages.length) {
      insertIndex = 0
    }

    if (isDropAllowed(draggableIndex, insertIndex)) {
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
        const accountForRemoval = draggableIndex < insertIndex && insertIndex ? -1 : 0
        const filtered = updatedImages.filter((i) => i !== draggedImage)
        filtered.splice(insertIndex + accountForRemoval, 0, draggedImage)
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

    return false
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

    const row = droppableElem.closest('[data-row]')
    const droppables = Array.from(containerRef?.querySelectorAll<HTMLElement>('[data-image]') ?? [])
    const draggableIndex = draggableInfo.element ? droppables.indexOf(draggableInfo.element) : -1
    const droppableIndex = droppables.indexOf(droppableElem)

    if (row && isDropAllowed(draggableIndex, droppableIndex, position)) {
      let insertIndex = droppableIndex

      if (position.match(/right/)) {
        insertIndex += 1
      }

      return { insertIndex }
    } else {
      return false
    }
  }

  // we don't allow an image to be dropped where it would end up in the
  // same position within the gallery
  const isDropAllowed = (draggableIndex: number, droppableIndex: number, position = ''): boolean => {
    // external images can always be dropped
    if (draggableIndex === -1) {
      return true
    }

    // can't drop on itself or when droppableIndex doesn't exist
    if (draggableIndex === droppableIndex) {
      return false
    }

    // account for dropping at beginning or end of a row
    let adjustedDroppableIndex = droppableIndex
    if (position.match(/left/)) {
      adjustedDroppableIndex -= 1
    }

    if (position.match(/right/)) {
      adjustedDroppableIndex += 1
    }

    return adjustedDroppableIndex !== draggableIndex
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
