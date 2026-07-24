import { CollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import { describe, expect, it, vi } from 'vitest'

import { createCardSelectionStoreWrapper } from '#/utils/card-selection-store'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import HeaderNodeComponent from '@/nodes/header/HeaderNodeComponent'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
}

function createLexicalComposerContext(editor: LexicalEditor): [LexicalEditor, { getTheme: () => undefined }] {
  return [editor, { getTheme: () => undefined }]
}

function createCollaborationContext() {
  return { color: '#000000', isCollabActive: false, name: 'test', yjsDocMap: new Map() }
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

describe('headerToolbarLabel', () => {
  // The toolbar label is a live e2e selector contract; a copy-paste from
  // SignupNodeComponent once labeled it "signup" on both sides. Pinned
  // against rendered DOM (plan 046 moved the JSX into CardActionToolbar;
  // the attribute contract is unchanged).
  it('labels header card toolbars as "header", not "signup"', () => {
    const editor = createTestEditor()
    const collaborationValue = createCollaborationContext()
    const composerValue = createLexicalComposerContext(editor)
    const inklingComposerValue = createComposerContext({ createSnippet: vi.fn() })
    const { wrapper: CardSelectionStoreProvider } = createCardSelectionStoreWrapper({
      initialState: { selectedCardKey: 'header-1' },
    })

    const { container } = render(
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
                headerTextEditor={createEditor({ namespace: 'header-text', nodes: MINIMAL_NODES, onError: () => {} })}
                isSwapped={false}
                layout="regular"
                nodeKey="header-1"
                subheaderTextEditor={createEditor({
                  namespace: 'subheader-text',
                  nodes: MINIMAL_NODES,
                  onError: () => {},
                })}
                textColor=""
              />
            </CardSelectionStoreProvider>
          </InklingHostIntegrationContext.Provider>
        </LexicalComposerContext.Provider>
      </CollaborationContext.Provider>,
    )

    // the menu toolbar carries the contract value
    expect(container.querySelectorAll('[data-inkling-card-toolbar="header"]')).toHaveLength(1)
    expect(container.querySelector('[data-inkling-card-toolbar="signup"]')).toBeNull()

    // and so does the snippet-creation toolbar that replaces it
    fireEvent.click(screen.getByTestId('create-snippet'))
    const toolbars = container.querySelectorAll('[data-inkling-card-toolbar="header"]')
    expect(toolbars).toHaveLength(1)
    expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    expect(container.querySelector('[data-inkling-card-toolbar="signup"]')).toBeNull()
  })
})
