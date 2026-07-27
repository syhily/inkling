import React from 'react'

import type { GalleryImage } from '@/types/gallery'
import type { DraggableInfo, DroppablePosition, DropResolution } from '@/utils/draggable/DragDropContainer'

import useDropTarget from '@/hooks/useDropTarget'
import { pick } from '@/utils'
import {
  adjustInsertIndexForRemoval,
  createReorderGeometry,
  resolveDrop,
  resolveReorder,
} from '@/utils/draggable/reorder-rules'
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
  const onDrop = (draggableInfo: DraggableInfo, dropResolution: DropResolution | null) => {
    // do not allow dropping of non-images
    if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
      return false
    }

    const updatedImages: GalleryImage[] = [...images]
    // insertIndex was derived by getIndicatorPosition (resolveReorder) and
    // arrives as the resolution argument; an empty gallery has no droppables
    // to derive one from (the drop is container-level, resolution null), so
    // the first image deliberately lands at slot 0
    let insertIndex: number = dropResolution?.insertIndex ?? 0
    if (!updatedImages.length) {
      insertIndex = 0
    }

    const resolution = resolveDrop(
      createReorderGeometry(containerElement, '[data-image]'),
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
  ): DropResolution | false => {
    // do not allow dropping of non-images
    if (draggableInfo.type !== 'image' && draggableInfo.cardName !== 'image') {
      return false
    }

    if (!droppableElem.closest('[data-row]')) {
      return false
    }

    // the single insertIndex derivation of this drag — the handler hands it
    // back to onDrop above as the resolution argument
    const resolution = resolveReorder(
      createReorderGeometry(containerElement, '[data-image]'),
      draggableInfo.element,
      droppableElem,
      position,
      'horizontal',
    )

    return resolution ? { insertIndex: resolution.insertIndex } : false
  }

  const dropTarget = useDropTarget({
    enabled: isSelected,
    isDragEnabled: !disabled && images.length > 0,
    // re-register when the image set changes so the container re-scans the
    // gallery's draggable/droppable markers (callbacks are ref-forwarded and
    // would see fresh images either way)
    reRegisterKey: images,
    draggableSelector: '[data-image]',
    droppableSelector: '[data-image]',
    getDraggableInfo,
    getIndicatorPosition,
    onDrop,
    onDropEnd,
    // hover policy: any drag entering the gallery lights it up
    canDrop: () => true,
    // enablement policy: enable dropping when an image is dragged in from
    // outside of this card — other drags leave enablement untouched
    adjustEnableOnDragStart: (draggableInfo) => {
      const isImageDrag = draggableInfo.type === 'image' || draggableInfo.cardName === 'image'
      return isImageDrag && draggableInfo.dataset.src && images.length !== maxImages ? true : undefined
    },
  })
  const container = dropTarget.container
  const containerElement = dropTarget.containerElement

  return { setContainerRef: dropTarget.setRef, isDraggedOver: dropTarget.isDraggedOver }
}
