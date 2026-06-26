import { render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { GalleryNode } from '@/nodes/GalleryNode'
import { GalleryNodeComponent } from '@/nodes/GalleryNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
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

function createComposerContext() {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
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

  beforeEach(async () => {
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('renders with the unified GalleryImage type', async () => {
    const nodeKey = await addGalleryNode(editor)

    const composerValue = createComposerContext()
    const cardValue = createCardContext()
    render(
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

    expect(screen.getAllByTestId('gallery-image')).toHaveLength(2)
  })

  it('adapts onChange to the file input', async () => {
    const nodeKey = await addGalleryNode(editor)

    const composerValue2 = createComposerContext()
    const cardValue2 = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue2}>
        <CardContext.Provider value={cardValue2}>
          <GalleryNodeComponent
            captionEditor={createTestEditor()}
            captionEditorInitialState={undefined}
            nodeKey={nodeKey}
          />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    expect(document.querySelector('input[type="file"]')).not.toBeNull()
  })
})
