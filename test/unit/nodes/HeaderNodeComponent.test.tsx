import { CollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCardSelectionStoreWrapper } from '#/utils/card-selection-store'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import HeaderNodeComponent from '@/nodes/header/HeaderNodeComponent'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
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

// the store equivalent of the old per-test CardContext factory: the card is
// selected and not editing unless a test says otherwise
function createSelection({ selected = true, editing = false }: { selected?: boolean; editing?: boolean } = {}) {
  return createCardSelectionStoreWrapper({
    initialState: { selectedCardKey: selected ? 'header-1' : null, isEditingCard: editing },
  })
}

function createComposerContext(cardConfig: Record<string, unknown> = {}) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: { image: { mimeTypes: ['image/png'] } },
    },
    cardConfig,
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
    onError: vi.fn(),
  }
}

function getToolbars(container: HTMLElement) {
  return container.querySelectorAll('[data-inkling-card-toolbar="header"]')
}

describe('HeaderNodeComponent', () => {
  let editor: LexicalEditor
  let headerTextEditor: LexicalEditor
  let subheaderTextEditor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
    headerTextEditor = createEditor({ namespace: 'header-text', nodes: MINIMAL_NODES, onError: () => {} })
    subheaderTextEditor = createEditor({ namespace: 'subheader-text', nodes: MINIMAL_NODES, onError: () => {} })
  })

  function renderComponent(
    selection: { selected?: boolean; editing?: boolean } = {},
    cardConfig: Record<string, unknown> = {},
  ) {
    const collaborationValue = createCollaborationContext()
    const composerValue = createLexicalComposerContext(editor)
    const inklingComposerValue = createComposerContext(cardConfig)
    const { wrapper: CardSelectionStoreProvider } = createSelection(selection)
    return render(
      <CollaborationContext.Provider value={collaborationValue}>
        <LexicalComposerContext.Provider value={composerValue}>
          <InklingHostIntegrationContext.Provider value={inklingComposerValue}>
            <CardSelectionStoreProvider>
              <HeaderNodeComponent
                alignment="left"
                backgroundColor="transparent"
                backgroundImageHeight={null}
                backgroundImageSrc=""
                backgroundImageWidth={null}
                backgroundSize=""
                buttonColor=""
                buttonEnabled={false}
                buttonText=""
                buttonTextColor=""
                buttonUrl=""
                headerTextEditor={headerTextEditor}
                isSwapped={false}
                layout="regular"
                nodeKey="header-1"
                subheaderTextEditor={subheaderTextEditor}
                textColor=""
              />
            </CardSelectionStoreProvider>
          </InklingHostIntegrationContext.Provider>
        </LexicalComposerContext.Provider>
      </CollaborationContext.Provider>,
    )
  }

  describe('action toolbar', () => {
    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderComponent({ selected: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderComponent({ selected: true, editing: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, separator, and snippet items when selected', () => {
      const { container } = renderComponent({ selected: true }, { createSnippet: vi.fn() })

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
      const { container } = renderComponent({ selected: true })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('dispatches EDIT_CARD_COMMAND for the card when the edit item is clicked', () => {
      const dispatchSpy = vi.spyOn(editor, 'dispatchCommand')
      renderComponent({ selected: true })

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(dispatchSpy).toHaveBeenCalledWith(EDIT_CARD_COMMAND, { cardKey: 'header-1' })
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderComponent({ selected: true }, { createSnippet: vi.fn() })

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
