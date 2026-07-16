import { CollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { CalloutNodeComponent } from '@/nodes/CalloutNodeComponent'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
}

function createLexicalComposerContext(editor: LexicalEditor): [LexicalEditor, { getTheme: () => undefined }] {
  return [editor, { getTheme: () => undefined }]
}

function createCollaborationContext() {
  return { isCollabActive: false, yjsDocMap: new Map() }
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'callout-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
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

function getToolbars(container: HTMLElement) {
  return container.querySelectorAll('[data-inkling-card-toolbar="callout"]')
}

describe('CalloutNodeComponent', () => {
  let editor: LexicalEditor
  let textEditor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
    textEditor = createEditor({ namespace: 'callout-text', nodes: MINIMAL_NODES, onError: () => {} })
  })

  function renderComponent(cardValue: ReturnType<typeof createCardContext>, cardConfig = {}) {
    const collaborationValue = createCollaborationContext()
    const composerValue = createLexicalComposerContext(editor)
    const inklingComposerValue = createComposerContext(cardConfig)
    return render(
      <CollaborationContext.Provider value={collaborationValue}>
        <LexicalComposerContext.Provider value={composerValue}>
          <InklingHostIntegrationContext.Provider value={inklingComposerValue}>
            <CardContext.Provider value={cardValue}>
              <CalloutNodeComponent
                backgroundColor="blue"
                calloutEmoji="💡"
                calloutTextEditor={textEditor}
                nodeKey="callout-1"
              />
            </CardContext.Provider>
          </InklingHostIntegrationContext.Provider>
        </LexicalComposerContext.Provider>
      </CollaborationContext.Provider>,
    )
  }

  describe('action toolbar', () => {
    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderComponent(createCardContext({ isSelected: false, isEditing: false }))

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderComponent(createCardContext({ isSelected: true, isEditing: true }))

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, separator, and snippet items when selected', () => {
      const { container } = renderComponent(createCardContext({ isSelected: true, isEditing: false }), {
        createSnippet: vi.fn(),
      })

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)

      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(2)
      expect(screen.getByTestId('edit-callout-card')).toBeTruthy()
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderComponent(createCardContext({ isSelected: true, isEditing: false }))

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.getByTestId('edit-callout-card')).toBeTruthy()
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('enters edit mode through the card context when the edit item is clicked', () => {
      const setEditing = vi.fn()
      renderComponent(createCardContext({ isSelected: true, isEditing: false, setEditing }))

      fireEvent.click(screen.getByTestId('edit-callout-card'))

      expect(setEditing).toHaveBeenCalledWith(true)
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderComponent(createCardContext({ isSelected: true, isEditing: false }), {
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
