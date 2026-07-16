import { LinkNode } from '@lexical/link'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { $isParagraphNode, createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { BookmarkNode, $createBookmarkNode } from '@/nodes/BookmarkNode'
import { BookmarkNodeComponent } from '@/nodes/BookmarkNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lexical/react/LexicalComposerContext')>()
  return {
    ...actual,
    useLexicalComposerContext: vi.fn(),
  }
})

vi.mock('../../../src/components/ui/CardCaptionEditor', () => ({
  CardCaptionEditor: () => null,
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
  overrides: Partial<React.ContextType<typeof InklingHostIntegrationContext>['cardConfig']> = {},
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
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <BookmarkNodeComponent
            captionEditor={null}
            captionEditorInitialState={undefined}
            createdWithUrl={true}
            nodeKey={nodeKey}
            url="https://example.com"
          />
        </CardContext.Provider>
      </InklingHostIntegrationContext.Provider>,
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

  describe('action toolbar', () => {
    function renderWithToolbar(
      cardOverrides: Record<string, unknown> = {},
      { title = 'Example title', cardConfig = {} }: { title?: string; cardConfig?: Record<string, unknown> } = {},
    ) {
      const composerValue = createComposerContext(cardConfig)
      const cardValue = createCardContext(cardOverrides)
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardContext.Provider value={cardValue}>
            <BookmarkNodeComponent
              captionEditor={null}
              captionEditorInitialState={undefined}
              nodeKey="bookmark-1"
              title={title}
              url="https://example.com"
            />
          </CardContext.Provider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="bookmark"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ isSelected: false }, { cardConfig: { createSnippet: vi.fn() } })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('keeps the toolbar visible while the card is editing', () => {
      // bookmark's menu toolbar has no !isEditing factor
      const { container } = renderWithToolbar(
        { isSelected: true, isEditing: true },
        { cardConfig: { createSnippet: vi.fn() } },
      )

      expect(getToolbars(container)).toHaveLength(1)
    })

    it('hides the toolbar until the card has a title', () => {
      const { container } = renderWithToolbar(
        { isSelected: true },
        { title: '', cardConfig: { createSnippet: vi.fn() } },
      )

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar when createSnippet is not configured, even with a title', () => {
      // bookmark is the one card whose toolbar visibility itself gates on
      // createSnippet — it exists solely to offer snippet creation
      const { container } = renderWithToolbar({ isSelected: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders only the snippet item when selected with a title', () => {
      const { container } = renderWithToolbar({ isSelected: true }, { cardConfig: { createSnippet: vi.fn() } })

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)

      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(1)
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderWithToolbar({ isSelected: true }, { cardConfig: { createSnippet: vi.fn() } })

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
