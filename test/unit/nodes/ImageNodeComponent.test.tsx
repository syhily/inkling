import { render, screen, waitFor } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { ImageNodeComponent } from '@/nodes/ImageNodeComponent'
import { openFileSelection } from '@/utils/openFileSelection'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('@/utils/openFileSelection', () => ({
  openFileSelection: vi.fn(),
}))

vi.mock('../../../src/components/ui/CardCaptionEditor', () => ({
  CardCaptionEditor: () => null,
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
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

function createComposerContext(fileTypes: Record<string, { mimeTypes: string[] }> = {}) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
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

  beforeEach(async () => {
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
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
})
