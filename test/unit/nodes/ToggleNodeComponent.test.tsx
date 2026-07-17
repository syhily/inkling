import { CollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { ToggleNodeComponent } from '@/nodes/ToggleNodeComponent'
import { EDIT_CARD_COMMAND } from '@/plugins/behaviour/commands'

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
}

function createLexicalComposerContext(editor: LexicalEditor): [LexicalEditor, { getTheme: () => undefined }] {
  return [editor, { getTheme: () => undefined }]
}

function createCollaborationContext() {
  return { color: '#000000', isCollabActive: false, name: 'test', yjsDocMap: new Map() }
}

function createCardContext(
  overrides: Partial<React.ContextType<typeof CardContext>> = {},
): React.ContextType<typeof CardContext> {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: 'toggle-1',
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
  return container.querySelectorAll('[data-inkling-card-toolbar="toggle"]')
}

describe('ToggleNodeComponent', () => {
  let editor: LexicalEditor
  let headingEditor: LexicalEditor
  let contentEditor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
    headingEditor = createEditor({ namespace: 'toggle-heading', nodes: MINIMAL_NODES, onError: () => {} })
    contentEditor = createEditor({ namespace: 'toggle-content', nodes: MINIMAL_NODES, onError: () => {} })
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
              <ToggleNodeComponent contentEditor={contentEditor} headingEditor={headingEditor} nodeKey="toggle-1" />
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
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderComponent(createCardContext({ isSelected: true, isEditing: false }))

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('dispatches EDIT_CARD_COMMAND for the card when the edit item is clicked', () => {
      // the harness mirrors InklingCardWrapper: the context's setEditing(true)
      // dispatches EDIT_CARD_COMMAND; toggle currently dispatches the command
      // directly instead — both land on the same handler, which reads only
      // `cardKey` (`focusEditor` is read by no handler)
      const dispatchSpy = vi.spyOn(editor, 'dispatchCommand')
      const cardValue = createCardContext({
        isSelected: true,
        isEditing: false,
        setEditing: (shouldEdit: boolean) => {
          if (shouldEdit) {
            editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey: 'toggle-1' })
          }
        },
      })
      renderComponent(cardValue)

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(dispatchSpy).toHaveBeenCalledWith(EDIT_CARD_COMMAND, expect.objectContaining({ cardKey: 'toggle-1' }))
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
