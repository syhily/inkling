import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { $getNodeByKey, $getRoot, createEditor, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GalleryImage } from '@/types/gallery'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { GalleryNode } from '@/nodes/GalleryNode'
import { GalleryNodeComponent } from '@/nodes/GalleryNodeComponent'
import { getImageDimensions } from '@/utils/getImageDimensions'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('@/utils/getImageDimensions', () => ({
  getImageDimensions: vi.fn(),
}))

vi.mock('../../../src/components/ui/CardCaptionEditor', () => ({
  CardCaptionEditor: () => null,
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [GalleryNode], onError: () => {} })
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'gallery-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext(upload: ReturnType<typeof vi.fn> = vi.fn(() => Promise.resolve(undefined))) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload,
        errors: [],
      }),
      fileTypes: { image: { mimeTypes: ['image/png'] } },
    },
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
    onError: vi.fn(),
  }
}

function addGalleryNode(editor: LexicalEditor) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const galleryNode = new GalleryNode({
          images: [
            { src: '/one.png', fileName: 'one.png', width: 100, height: 100 },
            { src: '/two.png', fileName: 'two.png', width: 100, height: 100 },
          ],
        })
        $getRoot().append(galleryNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

describe('GalleryNodeComponent', () => {
  let editor: LexicalEditor
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let previewCount: number

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
    vi.mocked(getImageDimensions).mockResolvedValue({ width: 100, height: 100 })
    previewCount = 0
    vi.spyOn(globalThis.URL, 'createObjectURL').mockImplementation(() => {
      previewCount += 1
      return `blob:gallery-preview-${previewCount}`
    })
    revokeObjectURLSpy = vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderComponent(nodeKey: NodeKey, upload?: ReturnType<typeof vi.fn>) {
    const composerValue = createComposerContext(upload)
    const cardValue = createCardContext()
    return render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <GalleryNodeComponent
            captionEditor={createTestEditor()}
            captionEditorInitialState={undefined}
            nodeKey={nodeKey}
          />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )
  }

  function readNodeImages(nodeKey: NodeKey): GalleryImage[] {
    return editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey) as GalleryNode | null
      return node ? (node.images as GalleryImage[]) : []
    })
  }

  function changeFileInput(files: File[]) {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files } })
  }

  it('renders with the unified GalleryImage type', async () => {
    const nodeKey = await addGalleryNode(editor)

    renderComponent(nodeKey)

    expect(screen.getAllByTestId('gallery-image')).toHaveLength(2)
  })

  it('adapts onChange to the file input', async () => {
    const nodeKey = await addGalleryNode(editor)

    renderComponent(nodeKey)

    expect(document.querySelector('input[type="file"]')).not.toBeNull()
  })

  it('caps uploads at 9 images and shows the limit message', async () => {
    const nodeKey = await addGalleryNode(editor)
    const upload = vi.fn().mockResolvedValue([])
    renderComponent(nodeKey, upload)

    const files = Array.from({ length: 8 }, (_, i) => new File(['x'], `extra-${i}.png`, { type: 'image/png' }))
    changeFileInput(files)

    await waitFor(() => {
      expect(screen.getByTestId('gallery-error')).toHaveTextContent('Galleries are limited to 9 images')
    })

    // only the 7 files that fit under the cap are uploaded
    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.calls[0][0]).toHaveLength(7)
  })

  it('matches upload results to previews by fileName and revokes the previews on success', async () => {
    const nodeKey = await addGalleryNode(editor)
    const upload = vi.fn().mockResolvedValue([
      { url: 'https://cdn.example.com/b.png', fileName: 'b.png' },
      { url: 'https://cdn.example.com/a.png', fileName: 'a.png' },
    ])
    renderComponent(nodeKey, upload)

    changeFileInput([new File(['x'], 'a.png', { type: 'image/png' }), new File(['x'], 'b.png', { type: 'image/png' })])

    await waitFor(() => {
      expect(readNodeImages(nodeKey)).toHaveLength(4)
    })

    const images = readNodeImages(nodeKey)
    expect(images[2]).toMatchObject({ fileName: 'a.png', src: 'https://cdn.example.com/a.png' })
    expect(images[3]).toMatchObject({ fileName: 'b.png', src: 'https://cdn.example.com/b.png' })
    expect(images[2].previewSrc).toBeUndefined()
    expect(images[3].previewSrc).toBeUndefined()

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:gallery-preview-1')
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:gallery-preview-2')
  })

  it('strips and revokes the previews, writes the cleaned images, and shows the error on upload failure', async () => {
    const nodeKey = await addGalleryNode(editor)
    const upload = vi.fn().mockResolvedValue(undefined)
    renderComponent(nodeKey, upload)

    changeFileInput([new File(['x'], 'a.png', { type: 'image/png' }), new File(['x'], 'b.png', { type: 'image/png' })])

    await waitFor(() => {
      expect(screen.getByTestId('gallery-error')).toHaveTextContent(
        'Something went wrong while uploading images. Please refresh the page and try again',
      )
    })

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:gallery-preview-1')
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:gallery-preview-2')

    // the node is written with the new images kept but their previews stripped
    const images = readNodeImages(nodeKey)
    expect(images).toHaveLength(4)
    expect(images[2]).toMatchObject({ fileName: 'a.png', width: 100, height: 100 })
    expect(images[2].src).toBeUndefined()
    expect(images[2].previewSrc).toBeUndefined()
    expect(images[3].fileName).toBe('b.png')
  })

  it('revokes all tracked previews on unmount', async () => {
    const nodeKey = await addGalleryNode(editor)
    // an upload that never resolves leaves the previews tracked at unmount time
    const upload = vi.fn(() => new Promise<undefined>(() => {}))
    const { unmount } = renderComponent(nodeKey, upload)

    changeFileInput([new File(['x'], 'a.png', { type: 'image/png' }), new File(['x'], 'b.png', { type: 'image/png' })])

    await waitFor(() => {
      expect(screen.getAllByTestId('gallery-image')).toHaveLength(4)
    })
    expect(revokeObjectURLSpy).not.toHaveBeenCalled()

    unmount()

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:gallery-preview-1')
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:gallery-preview-2')
  })
})
