import { LinkNode } from '@lexical/link'
import { render, waitFor } from '@testing-library/react'
import { $isParagraphNode, createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { BookmarkNode, $createBookmarkNode } from '@/nodes/BookmarkNode'
import { BookmarkNodeComponent } from '@/nodes/BookmarkNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  const editor = createEditor({ namespace: 'test', nodes: [BookmarkNode, LinkNode], onError: () => {} })
  const rootElement = document.createElement('div')
  editor.setRootElement(rootElement)
  return editor
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'bookmark-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext(
  overrides: Partial<React.ContextType<typeof InklingComposerContext>['cardConfig']> = {},
) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: { image: { mimeTypes: ['image/png'] } },
    },
    cardConfig: {
      ...overrides,
    },
    darkMode: false,
    enableMultiplayer: false,
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
    onError: vi.fn(),
  }
}

function addBookmarkNode(editor: LexicalEditor, url: string) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const bookmarkNode = $createBookmarkNode({ url })
        $getRoot().append(bookmarkNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

describe('BookmarkNodeComponent', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('pastes as link when async metadata fetch fails on init', async () => {
    const fetchEmbed = vi.fn().mockRejectedValue(new Error('Network error'))
    const nodeKey = await addBookmarkNode(editor, 'https://example.com')

    const composerValue = createComposerContext({ fetchEmbed })
    const cardValue = createCardContext({ nodeKey })

    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <BookmarkNodeComponent
            captionEditor={null}
            captionEditorInitialState={undefined}
            createdWithUrl={true}
            nodeKey={nodeKey}
            url="https://example.com"
          />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    await waitFor(() => {
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const paragraph = root.getFirstChild()
        expect($isParagraphNode(paragraph)).toBe(true)
        const link = paragraph?.getFirstChild()
        expect(link?.getType()).toBe('link')
        expect(link?.getTextContent()).toBe('https://example.com')
      })
    })
  })
})
