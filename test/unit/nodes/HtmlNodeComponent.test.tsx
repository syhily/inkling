import { render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { HtmlNode } from '@/nodes/HtmlNode'
import { HtmlNodeComponent } from '@/nodes/HtmlNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [HtmlNode], onError: () => {} })
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'html-1',
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
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('renders html and guards against a null node', async () => {
    const nodeKey = await addHtmlNode(editor)

    const composerValue = createComposerContext()
    const cardValue = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue}>
        <InklingSelectedCardContext>
          <CardContext.Provider value={cardValue}>
            <HtmlNodeComponent html="<p>Hello</p>" nodeKey={nodeKey} />
          </CardContext.Provider>
        </InklingSelectedCardContext>
      </InklingComposerContext.Provider>,
    )

    expect(screen.getByText('Hello')).toBeTruthy()
  })
})
