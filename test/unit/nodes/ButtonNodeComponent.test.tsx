import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockComposerContext } from '#/utils/composer-context'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { ButtonNode } from '@/nodes/ButtonNode'
import { ButtonNodeComponent } from '@/nodes/ButtonNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [ButtonNode], onError: () => {} })
}

function createCardContext(
  overrides: Partial<React.ContextType<typeof CardContext>> = {},
): React.ContextType<typeof CardContext> {
  return {
    isSelected: true,
    isEditing: true,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: 'button-1',
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

function addButtonNode(editor: LexicalEditor) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const buttonNode = new ButtonNode({
          buttonText: 'Subscribe',
          buttonUrl: 'https://example.com',
          alignment: 'center',
        })
        $getRoot().append(buttonNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

describe('ButtonNodeComponent', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    mockComposerContext(editor)
  })

  it('renders with aligned button card props', async () => {
    const nodeKey = await addButtonNode(editor)

    const composerValue = createComposerContext()
    const cardValue = createCardContext()
    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ButtonNodeComponent
            alignment="center"
            buttonText="Subscribe"
            buttonUrl="https://example.com"
            nodeKey={nodeKey}
          />
        </CardContext.Provider>
      </InklingHostIntegrationContext.Provider>,
    )

    expect(screen.getByTestId('button-card')).toBeTruthy()
    expect(screen.getByTestId('button-card-btn').textContent).toBe('Subscribe')
  })

  it('enters edit mode when the toolbar edit button is clicked', async () => {
    const nodeKey = await addButtonNode(editor)
    const setEditing = vi.fn()
    const composerValue = createComposerContext()
    const cardValue = createCardContext({ isSelected: true, isEditing: false, setEditing })

    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ButtonNodeComponent
            alignment="center"
            buttonText="Subscribe"
            buttonUrl="https://example.com"
            nodeKey={nodeKey}
          />
        </CardContext.Provider>
      </InklingHostIntegrationContext.Provider>,
    )

    fireEvent.click(screen.getByTestId('edit-button-card'))
    expect(setEditing).toHaveBeenCalledWith(true)
  })

  describe('action toolbar', () => {
    function renderWithToolbar(cardValue: ReturnType<typeof createCardContext>, cardConfig = {}) {
      const composerValue = createComposerContext(cardConfig)
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardContext.Provider value={cardValue}>
            <ButtonNodeComponent
              alignment="center"
              buttonText="Subscribe"
              buttonUrl="https://example.com"
              nodeKey="button-1"
            />
          </CardContext.Provider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="button"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar(createCardContext({ isSelected: false, isEditing: false }))

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderWithToolbar(createCardContext({ isSelected: true, isEditing: true }))

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, separator, and snippet items when selected', () => {
      const { container } = renderWithToolbar(createCardContext({ isSelected: true, isEditing: false }), {
        createSnippet: vi.fn(),
      })

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)

      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      // every item renders an icon
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(2)
      expect(screen.getByTestId('edit-button-card')).toBeTruthy()
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderWithToolbar(createCardContext({ isSelected: true, isEditing: false }))

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.getByTestId('edit-button-card')).toBeTruthy()
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderWithToolbar(createCardContext({ isSelected: true, isEditing: false }), {
        createSnippet: vi.fn(),
      })

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
