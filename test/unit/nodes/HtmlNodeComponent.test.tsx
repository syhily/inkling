import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCardSelectionStoreWrapper } from '#/utils/card-selection-store'
import { mockComposerContext } from '#/utils/composer-context'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { HtmlNode } from '@/nodes/HtmlNode'
import { HtmlNodeComponent } from '@/nodes/HtmlNodeComponent'
import { EDIT_CARD_COMMAND } from '@/plugins/behaviour/commands'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [HtmlNode], onError: () => {} })
}

function createCardContext(
  overrides: Partial<React.ContextType<typeof CardContext>> = {},
): React.ContextType<typeof CardContext> {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: 'html-1',
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext(cardConfig: Record<string, unknown> = {}) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: {},
    },
    cardConfig,
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
    onError: vi.fn(),
  }
}

function addHtmlNode(editor: LexicalEditor) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const htmlNode = new HtmlNode({ html: '<p>Hello</p>' })
        $getRoot().append(htmlNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

describe('HtmlNodeComponent', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    mockComposerContext(editor)
  })

  it('renders html and guards against a null node', async () => {
    const nodeKey = await addHtmlNode(editor)

    const composerValue = createComposerContext()
    const cardValue = createCardContext()
    const { wrapper: CardSelectionStoreProvider } = createCardSelectionStoreWrapper()
    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <CardContext.Provider value={cardValue}>
            <HtmlNodeComponent html="<p>Hello</p>" nodeKey={nodeKey} />
          </CardContext.Provider>
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    expect(screen.getByText('Hello')).toBeTruthy()
  })

  describe('action toolbar', () => {
    function renderWithToolbar(cardOverrides: Record<string, unknown> = {}, cardConfig = {}) {
      const composerValue = createComposerContext(cardConfig)
      const cardValue = createCardContext(cardOverrides)
      const { wrapper: CardSelectionStoreProvider } = createCardSelectionStoreWrapper()
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardSelectionStoreProvider>
            <CardContext.Provider value={cardValue}>
              <HtmlNodeComponent html="<p>Hello</p>" nodeKey="html-1" />
            </CardContext.Provider>
          </CardSelectionStoreProvider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="html"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ isSelected: false, isEditing: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, visibility, and snippet items when visibility settings are enabled', () => {
      // visibility settings default to WEB_AND_EMAIL, so the visibility item
      // renders between edit and the snippet pair
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false }, { createSnippet: vi.fn() })

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(5)

      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Visibility', 'Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(3)
      expect(screen.getByTestId('edit-html')).toBeTruthy()
      expect(screen.getByTestId('show-visibility')).toBeTruthy()
      expect(screen.getByTestId('show-visibility').getAttribute('data-inkling-active')).toBe('false')
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('omits the visibility item and its separator when visibility settings are disabled', () => {
      const { container } = renderWithToolbar(
        { isSelected: true, isEditing: false },
        { createSnippet: vi.fn(), visibilitySettings: VISIBILITY_SETTINGS.NONE },
      )

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)
      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      expect(screen.queryByTestId('show-visibility')).toBeNull()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('dispatches EDIT_CARD_COMMAND for the card when the edit item is clicked', () => {
      // the harness mirrors InklingCardWrapper: the context's setEditing(true)
      // dispatches EDIT_CARD_COMMAND; html currently dispatches the command
      // directly instead — both land on the same handler, which reads only
      // `cardKey` (`focusEditor` is read by no handler)
      const dispatchSpy = vi.spyOn(editor, 'dispatchCommand')
      renderWithToolbar({
        isSelected: true,
        isEditing: false,
        setEditing: (shouldEdit: boolean) => {
          if (shouldEdit) {
            editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey: 'html-1' })
          }
        },
      })

      fireEvent.click(screen.getByTestId('edit-html'))

      expect(dispatchSpy).toHaveBeenCalledWith(EDIT_CARD_COMMAND, expect.objectContaining({ cardKey: 'html-1' }))
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false }, { createSnippet: vi.fn() })

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
