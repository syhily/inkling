import { render, screen } from '@testing-library/react'
import { $getRoot, createEditor, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import InklingCardWrapper from '@/components/InklingCardWrapper'
import { useCardSelectionStore } from '@/context/CardSelectionStoreContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { buildDefaultVisibility } from '@/nodes/base/utils/visibility'
import { HtmlNode } from '@/nodes/HtmlNode'
import { VISIBILITY_SETTINGS } from '@/utils/visibility'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [HtmlNode], onError: () => {} })
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
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
    onError: vi.fn(),
  }
}

function addHtmlNode(editor: LexicalEditor, dataset: Record<string, unknown> = {}) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        $getRoot().append(new HtmlNode({ html: '<p>Hello</p>', ...dataset }))
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

function SelectCard({ nodeKey }: { nodeKey: NodeKey }) {
  const store = useCardSelectionStore()
  React.useEffect(() => {
    store.setState({ selectedCardKey: nodeKey })
  }, [nodeKey, store])
  return null
}

function renderWrapper(
  nodeKey: NodeKey,
  { cardConfig, select }: { cardConfig?: Record<string, unknown>; select?: boolean } = {},
) {
  const composerValue = createComposerContext(cardConfig)
  return render(
    <InklingComposerContext.Provider value={composerValue}>
      <InklingSelectedCardContext>
        {select ? <SelectCard nodeKey={nodeKey} /> : null}
        <InklingCardWrapper nodeKey={nodeKey}>
          <div data-testid="card-content">card content</div>
        </InklingCardWrapper>
      </InklingSelectedCardContext>
    </InklingComposerContext.Provider>,
  )
}

describe('InklingCardWrapper', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('renders children with the card type derived from the node', async () => {
    const nodeKey = await addHtmlNode(editor)

    const { container } = renderWrapper(nodeKey)
    const card = container.querySelector('[data-inkling-card="html"]')

    expect(screen.getByTestId('card-content')).toBeInTheDocument()
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('data-inkling-card-selected', 'false')
    expect(card).toHaveClass('z-10')
  })

  it('toggles the selected state with the selected card context', async () => {
    const nodeKey = await addHtmlNode(editor)

    const { container } = renderWrapper(nodeKey, { select: true })
    const card = container.querySelector('[data-inkling-card="html"]')!

    expect(card).toHaveAttribute('data-inkling-card-selected', 'true')
    expect(card).toHaveClass('z-20')
  })

  it('shows the visibility indicator when the node visibility is restricted', async () => {
    const visibility = buildDefaultVisibility()
    visibility.web.nonMember = false
    const nodeKey = await addHtmlNode(editor, { visibility })

    renderWrapper(nodeKey, { cardConfig: { visibilitySettings: VISIBILITY_SETTINGS.WEB_ONLY } })

    expect(screen.getByTestId('visibility-indicator')).toBeInTheDocument()
  })
})
