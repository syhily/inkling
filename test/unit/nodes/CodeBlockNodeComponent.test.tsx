import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { CodeBlockNode } from '@/nodes/CodeBlockNode'
import { CodeBlockNodeComponent } from '@/nodes/CodeBlockNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('../../../src/components/ui/CardCaptionEditor', () => ({
  CardCaptionEditor: () => <div data-testid="card-caption-editor" />,
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [CodeBlockNode], onError: () => {} })
}

function createCardContext(setEditing: () => void, overrides: Record<string, unknown> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: 'code-1',
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing,
    ...overrides,
  }
}

function createComposerContext(darkMode: boolean, cardConfig: Record<string, unknown> = {}) {
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
    darkMode,
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
    onError: vi.fn(),
  }
}

function addCodeBlockNode(editor: LexicalEditor): Promise<NodeKey> {
  return new Promise((resolve) => {
    editor.update(
      () => {
        const node = new CodeBlockNode({ code: 'const a = 1', language: 'javascript' })
        $getRoot().append(node)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

function renderComponent(nodeKey: NodeKey, setEditing: () => void, darkMode: boolean) {
  const composerValue = createComposerContext(darkMode)
  const cardValue = createCardContext(setEditing, { nodeKey })
  return render(
    <InklingHostIntegrationContext.Provider value={composerValue}>
      <InklingUiPrefsContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <CodeBlockNodeComponent code="const a = 1" language="javascript" nodeKey={nodeKey} />
        </CardContext.Provider>
      </InklingUiPrefsContext.Provider>
    </InklingHostIntegrationContext.Provider>,
  )
}

describe('CodeBlockNodeComponent', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('enters edit mode when the toolbar Edit button is clicked', async () => {
    const nodeKey = await addCodeBlockNode(editor)
    const setEditing = vi.fn()

    renderComponent(nodeKey, setEditing, false)

    fireEvent.click(screen.getByTestId('edit-code-block-card'))

    expect(setEditing).toHaveBeenCalledTimes(1)
    expect(setEditing).toHaveBeenCalledWith(true)
  })

  it('renders a dark preview when darkMode is enabled', async () => {
    const nodeKey = await addCodeBlockNode(editor)

    const { container } = renderComponent(nodeKey, vi.fn(), true)

    expect(container.querySelector('pre')).toHaveClass('bg-grey-950')
  })

  it('renders a light preview when darkMode is disabled', async () => {
    const nodeKey = await addCodeBlockNode(editor)

    const { container } = renderComponent(nodeKey, vi.fn(), false)

    expect(container.querySelector('pre')).toHaveClass('bg-grey-100')
  })

  describe('action toolbar', () => {
    function renderWithToolbar(cardOverrides: Record<string, unknown> = {}, cardConfig = {}) {
      const composerValue = createComposerContext(false, cardConfig)
      const cardValue = createCardContext(vi.fn(), cardOverrides)
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <InklingUiPrefsContext.Provider value={composerValue}>
            <CardContext.Provider value={cardValue}>
              <CodeBlockNodeComponent code="const a = 1" language="javascript" nodeKey="code-1" />
            </CardContext.Provider>
          </InklingUiPrefsContext.Provider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="code-block"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ isSelected: false, isEditing: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, separator, and snippet items when selected', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false }, { createSnippet: vi.fn() })

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)

      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(2)
      expect(screen.getByTestId('edit-code-block-card')).toBeTruthy()
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.getByTestId('edit-code-block-card')).toBeTruthy()
      expect(screen.queryByTestId('create-snippet')).toBeNull()
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
