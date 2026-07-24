import { LinkNode } from '@lexical/link'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { $isParagraphNode, createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCardSelectionStoreWrapper } from '#/utils/card-selection-store'
import { mockComposerContext } from '#/utils/composer-context'
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

// the store equivalent of the old per-test CardContext factory: the card is
// selected and not editing unless a test says otherwise
function createSelection(
  nodeKey: NodeKey | string = 'bookmark-1',
  { selected = true, editing = false }: { selected?: boolean; editing?: boolean } = {},
) {
  return createCardSelectionStoreWrapper({
    initialState: { selectedCardKey: selected ? nodeKey : null, isEditingCard: editing },
  })
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
    createWebsocketProvider: vi.fn(),
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
    mockComposerContext(editor)
  })

  it('pastes as link when async metadata fetch fails on init', async () => {
    const fetchEmbed = vi.fn().mockRejectedValue(new Error('Network error'))
    const nodeKey = await addBookmarkNode(editor, 'https://example.com')

    const composerValue = createComposerContext({ fetchEmbed })
    const { wrapper: CardSelectionStoreProvider } = createSelection(nodeKey)

    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <BookmarkNodeComponent
            captionEditor={null}
            captionEditorInitialState={undefined}
            createdWithUrl={true}
            nodeKey={nodeKey}
            url="https://example.com"
          />
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    await waitFor(() => {
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const paragraph = root.getFirstChild()
        expect($isParagraphNode(paragraph)).toBe(true)
        const link = $isParagraphNode(paragraph) ? paragraph.getFirstChild() : null
        expect(link?.getType()).toBe('link')
        expect(link?.getTextContent()).toBe('https://example.com')
      })
    })
  })

  describe('action toolbar', () => {
    function renderWithToolbar(
      selection: { selected?: boolean; editing?: boolean } = {},
      { title = 'Example title', cardConfig = {} }: { title?: string; cardConfig?: Record<string, unknown> } = {},
    ) {
      const composerValue = createComposerContext(cardConfig)
      const { wrapper: CardSelectionStoreProvider } = createSelection('bookmark-1', selection)
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardSelectionStoreProvider>
            <BookmarkNodeComponent
              captionEditor={null}
              captionEditorInitialState={undefined}
              nodeKey="bookmark-1"
              title={title}
              url="https://example.com"
            />
          </CardSelectionStoreProvider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="bookmark"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ selected: false }, { cardConfig: { createSnippet: vi.fn() } })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('keeps the toolbar visible while the card is editing', () => {
      // bookmark's menu toolbar has no !isEditing factor
      const { container } = renderWithToolbar(
        { selected: true, editing: true },
        { cardConfig: { createSnippet: vi.fn() } },
      )

      expect(getToolbars(container)).toHaveLength(1)
    })

    it('hides the toolbar until the card has a title', () => {
      const { container } = renderWithToolbar({ selected: true }, { title: '', cardConfig: { createSnippet: vi.fn() } })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar when createSnippet is not configured, even with a title', () => {
      // bookmark is the one card whose toolbar visibility itself gates on
      // createSnippet — it exists solely to offer snippet creation
      const { container } = renderWithToolbar({ selected: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders only the snippet item when selected with a title', () => {
      const { container } = renderWithToolbar({ selected: true }, { cardConfig: { createSnippet: vi.fn() } })

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
      const { container } = renderWithToolbar({ selected: true }, { cardConfig: { createSnippet: vi.fn() } })

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
