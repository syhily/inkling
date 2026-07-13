import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DraggableInfo } from '@/utils/draggable/DragDropContainer'

import InklingComposerContext from '@/context/InklingComposerContext'
import useGalleryReorder, { type GalleryImage } from '@/hooks/useGalleryReorder'

const mockContainer = {
  enableDrag: vi.fn(),
  disableDrag: vi.fn(),
  refresh: vi.fn(),
  destroy: vi.fn(),
}

const mockDragDropHandler = {
  registerContainer: vi.fn(() => mockContainer),
}

const contextValue = { dragDropHandler: mockDragDropHandler }

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    InklingComposerContext.Provider,
    { value: contextValue as React.ContextType<typeof InklingComposerContext> },
    children,
  )

function createImageContainer(images: GalleryImage[]) {
  const container = document.createElement('div')
  images.forEach((image, index) => {
    const imgContainer = document.createElement('div')
    imgContainer.dataset.image = String(index)
    const img = document.createElement('img')
    img.src = image.src
    imgContainer.append(img)
    container.append(imgContainer)
  })
  return container
}

async function renderGalleryHook(images: GalleryImage[]) {
  const updateImages = vi.fn()
  const { result } = renderHook(() => useGalleryReorder({ images, updateImages }), { wrapper })
  return { result, updateImages }
}

async function getRegisteredOptions(images: GalleryImage[] = []) {
  const { result, updateImages } = await renderGalleryHook(images)
  const container = createImageContainer(images)
  await act(async () => {
    result.current.setContainerRef(container)
  })
  const [, options] = mockDragDropHandler.registerContainer.mock.calls[0]
  return { options, container, result, updateImages }
}

describe('useGalleryReorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a drag/drop container when a gallery element is available', async () => {
    const { result, updateImages } = await renderGalleryHook([])
    const container = document.createElement('div')

    await act(async () => {
      result.current.setContainerRef(container)
    })

    expect(mockDragDropHandler.registerContainer).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        onDrop: expect.any(Function),
        onDropEnd: expect.any(Function),
        getDraggableInfo: expect.any(Function),
        getIndicatorPosition: expect.any(Function),
      }),
    )
    expect(updateImages).not.toHaveBeenCalled()
  })

  it('adds an external image on drop', async () => {
    const { options, updateImages } = await getRegisteredOptions([])

    const draggableInfo: DraggableInfo = {
      type: 'image',
      element: null,
      target: null,
      source: null,
      mousePosition: { x: 0, y: 0 },
      insertIndex: 0,
      dataset: {
        src: 'https://example.com/image.jpg',
        width: 100,
        height: 200,
      },
    }

    const success = options.onDrop(draggableInfo)

    expect(success).toBe(true)
    expect(updateImages).toHaveBeenCalledWith([
      expect.objectContaining({
        src: 'https://example.com/image.jpg',
        width: 100,
        height: 200,
      }),
    ])
  })

  it('adds an external image on drop when the src contains selector-special characters', async () => {
    const src = 'https://example.com/weird"].jpg?sig=a"b'
    const { options, updateImages } = await getRegisteredOptions([])

    const element = document.createElement('div')
    const img = document.createElement('img')
    img.src = src
    element.append(img)

    const draggableInfo: DraggableInfo = {
      type: 'image',
      element,
      target: null,
      source: null,
      mousePosition: { x: 0, y: 0 },
      insertIndex: 0,
      dataset: { src },
    }

    const success = options.onDrop(draggableInfo)

    expect(success).toBe(true)
    expect(updateImages).toHaveBeenCalledWith([expect.objectContaining({ src })])
  })

  it('reorders images when dropping an internal image', async () => {
    const images: GalleryImage[] = [
      { src: 'https://example.com/one.jpg' },
      { src: 'https://example.com/two.jpg' },
      { src: 'https://example.com/three.jpg' },
    ]
    const { options, container, updateImages } = await getRegisteredOptions(images)

    const draggableElement = container.children[0]
    const droppableElement = container.children[2]

    const draggableInfo: DraggableInfo = {
      type: 'image',
      element: draggableElement as HTMLElement,
      target: null,
      source: null,
      mousePosition: { x: 0, y: 0 },
      insertIndex: 3,
      dataset: { src: 'https://example.com/one.jpg' },
    }

    const success = options.onDrop(draggableInfo, droppableElement as HTMLElement, 'top-right')

    expect(success).toBe(true)
    expect(updateImages).toHaveBeenCalledWith([
      { src: 'https://example.com/two.jpg' },
      { src: 'https://example.com/three.jpg' },
      { src: 'https://example.com/one.jpg' },
    ])
  })

  it('skips onDropEnd after a successful internal reorder', async () => {
    const images: GalleryImage[] = [{ src: 'https://example.com/one.jpg' }, { src: 'https://example.com/two.jpg' }]
    const { options, container, updateImages } = await getRegisteredOptions(images)

    const draggableElement = container.children[0]
    const droppableElement = container.children[1]

    const draggableInfo: DraggableInfo = {
      type: 'image',
      element: draggableElement as HTMLElement,
      target: null,
      source: null,
      mousePosition: { x: 0, y: 0 },
      insertIndex: 1,
      dataset: { src: 'https://example.com/one.jpg' },
    }

    options.onDrop(draggableInfo, droppableElement as HTMLElement, 'top-right')
    options.onDropEnd(draggableInfo, true)

    expect(updateImages).toHaveBeenCalledTimes(1)
  })

  it('removes an image when it is dropped outside the gallery', async () => {
    const images: GalleryImage[] = [{ src: 'https://example.com/one.jpg' }, { src: 'https://example.com/two.jpg' }]
    const { options, updateImages } = await getRegisteredOptions(images)

    const draggableInfo: DraggableInfo = {
      type: 'image',
      element: null,
      target: null,
      source: null,
      mousePosition: { x: 0, y: 0 },
      dataset: { src: 'https://example.com/one.jpg' },
    }

    options.onDropEnd(draggableInfo, true)

    expect(updateImages).toHaveBeenCalledWith([{ src: 'https://example.com/two.jpg' }])
  })

  it('does not allow dropping non-image draggables', async () => {
    const { options, updateImages } = await getRegisteredOptions([])

    const draggableInfo: DraggableInfo = {
      type: 'file',
      element: null,
      target: null,
      source: null,
      mousePosition: { x: 0, y: 0 },
      dataset: {},
    }

    const success = options.onDrop(draggableInfo)

    expect(success).toBe(false)
    expect(updateImages).not.toHaveBeenCalled()
  })

  it('returns draggable info for a gallery image', async () => {
    const images: GalleryImage[] = [{ src: 'https://example.com/one.jpg', fileName: 'one.jpg' }]
    const { options, container } = await getRegisteredOptions(images)

    const imgContainer = container.children[0]
    const draggableInfo = options.getDraggableInfo(imgContainer as HTMLElement)

    expect(draggableInfo).toEqual(
      expect.objectContaining({
        type: 'image',
        dataset: expect.objectContaining({ src: 'https://example.com/one.jpg', fileName: 'one.jpg' }),
      }),
    )
  })

  it('returns false from getDraggableInfo when the element is not a gallery image', async () => {
    const { options } = await getRegisteredOptions([])

    const draggableInfo = options.getDraggableInfo(null)

    expect(draggableInfo).toBe(false)
  })
})
