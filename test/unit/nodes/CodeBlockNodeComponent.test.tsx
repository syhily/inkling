import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
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
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'code-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing,
    ...overrides,
  }
}

function createComposerContext(darkMode: boolean) {
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
    darkMode,
    enableMultiplayer: false,
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
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
    <InklingComposerContext.Provider value={composerValue}>
      <CardContext.Provider value={cardValue}>
        <CodeBlockNodeComponent code="const a = 1" language="javascript" nodeKey={nodeKey} />
      </CardContext.Provider>
    </InklingComposerContext.Provider>,
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
})
