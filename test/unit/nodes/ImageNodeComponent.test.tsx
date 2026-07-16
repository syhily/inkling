import { render, screen, waitFor } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { ImageNodeComponent } from '@/nodes/ImageNodeComponent'
import { getImageDimensions } from '@/utils/getImageDimensions'
import { openFileSelection } from '@/utils/openFileSelection'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('@/utils/openFileSelection', () => ({
  openFileSelection: vi.fn(),
}))

vi.mock('@/utils/getImageDimensions', () => ({
  getImageDimensions: vi.fn(),
}))

vi.mock('../../../src/components/ui/CardCaptionEditor', () => ({
  CardCaptionEditor: () => null,
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
}

function flushMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'img-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext(
  fileTypes: Record<string, { mimeTypes: string[] }> = {},
  upload: ReturnType<typeof vi.fn> = vi.fn(() => Promise.resolve(undefined)),
) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload,
        progress: 0,
        errors: [],
      }),
      fileTypes,
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

describe('ImageNodeComponent', () => {
  let editor: LexicalEditor
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
    vi.mocked(getImageDimensions).mockResolvedValue({ width: 100, height: 200 })
    createObjectURLSpy = vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:image-preview')
    revokeObjectURLSpy = vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with typed refs when fileTypes is empty', () => {
    const composerValue = createComposerContext({})
    const cardValue = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ImageNodeComponent nodeKey="img-1" src="/image.png" />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    expect(screen.getByTestId('image-card-populated')).toBeTruthy()
  })

  it('renders when image mimeTypes are provided', () => {
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png', 'image/jpeg'] } })
    const cardValue = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ImageNodeComponent nodeKey="img-1" src="/image.png" altText="Alt text" />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    expect(screen.getByTestId('image-card-populated')).toBeTruthy()
  })

  it('opens the file dialog once when triggerFileDialog is true', async () => {
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } })
    const cardValue = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ImageNodeComponent nodeKey="img-1" src="/image.png" triggerFileDialog />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    await waitFor(() => expect(openFileSelection).toHaveBeenCalledTimes(1))
  })

  it('uploads the initial file when the card has no src', async () => {
    const upload = vi.fn(() => Promise.resolve(undefined))
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } }, upload)
    const cardValue = createCardContext()
    const file = new File(['image'], 'photo.png', { type: 'image/png' })

    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ImageNodeComponent nodeKey="img-1" src="" initialFile={file} />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    await waitFor(() => expect(upload).toHaveBeenCalledWith([file]))

    // the preview object URL is leased, then released when the flow ends
    expect(createObjectURLSpy).toHaveBeenCalledExactlyOnceWith(file)
    expect(revokeObjectURLSpy).toHaveBeenCalledExactlyOnceWith('blob:image-preview')
  })

  it('does not upload the initial file when the card already has a src', async () => {
    const upload = vi.fn(() => Promise.resolve(undefined))
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } }, upload)
    const cardValue = createCardContext()
    const file = new File(['image'], 'photo.png', { type: 'image/png' })

    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ImageNodeComponent nodeKey="img-1" src="/image.png" initialFile={file} />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    // the mount effect runs synchronously; give any async work a chance to fire
    await flushMacrotask()
    expect(upload).not.toHaveBeenCalled()
  })
})
