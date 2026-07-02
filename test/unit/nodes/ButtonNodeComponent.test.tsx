import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
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

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: true,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'button-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext() {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: {},
    },
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
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
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('renders with aligned button card props', async () => {
    const nodeKey = await addButtonNode(editor)

    const composerValue = createComposerContext()
    const cardValue = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ButtonNodeComponent
            alignment="center"
            buttonText="Subscribe"
            buttonUrl="https://example.com"
            nodeKey={nodeKey}
          />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
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
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <ButtonNodeComponent
            alignment="center"
            buttonText="Subscribe"
            buttonUrl="https://example.com"
            nodeKey={nodeKey}
          />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    fireEvent.click(screen.getByTestId('edit-button-card'))
    expect(setEditing).toHaveBeenCalledWith(true)
  })
})
