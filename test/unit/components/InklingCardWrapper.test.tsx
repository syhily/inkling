import { render, screen, act } from '@testing-library/react'
import { $getRoot, createEditor, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CardWidth } from '@/nodes/base/utils/card-widths'

import InklingCardWrapper from '@/components/InklingCardWrapper'
import CardContext from '@/context/CardContext'
import { useCardSelectionStore } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { InklingSelectedCardContext } from '@/context/InklingSelectedCardContext'
import { buildDefaultVisibility } from '@/nodes/base/utils/visibility'
import { HtmlNode } from '@/nodes/HtmlNode'
import { EDIT_CARD_COMMAND } from '@/plugins/behaviour/commands'
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
    <InklingHostIntegrationContext.Provider value={composerValue}>
      <InklingSelectedCardContext>
        {select ? <SelectCard nodeKey={nodeKey} /> : null}
        <InklingCardWrapper nodeKey={nodeKey}>
          <div data-testid="card-content">card content</div>
        </InklingCardWrapper>
      </InklingSelectedCardContext>
    </InklingHostIntegrationContext.Provider>,
  )
}

function CardWidthProbe({ widths }: { widths: CardWidth[] }) {
  const { cardWidth } = React.useContext(CardContext)
  React.useEffect(() => {
    widths.push(cardWidth)
  }, [cardWidth, widths])
  return null
}

function renderWrapperWithWidth(nodeKey: NodeKey, width: string, widths: CardWidth[]) {
  const composerValue = createComposerContext()
  const tree = (nextWidth: string) => (
    <InklingHostIntegrationContext.Provider value={composerValue}>
      <InklingSelectedCardContext>
        <InklingCardWrapper nodeKey={nodeKey} width={nextWidth}>
          <CardWidthProbe widths={widths} />
        </InklingCardWrapper>
      </InklingSelectedCardContext>
    </InklingHostIntegrationContext.Provider>
  )
  const result = render(tree(width))
  return { ...result, rerenderWidth: (nextWidth: string) => result.rerender(tree(nextWidth)) }
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

  it('toggles the selected state with the card selection store', async () => {
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

  it('syncs the context cardWidth state from the width prop', async () => {
    const nodeKey = await addHtmlNode(editor)
    const widths: CardWidth[] = []

    const { rerenderWidth } = renderWrapperWithWidth(nodeKey, 'wide', widths)
    expect(widths.at(-1)).toBe('wide')

    rerenderWidth('regular')
    expect(widths.at(-1)).toBe('regular')

    rerenderWidth('wide')
    expect(widths.at(-1)).toBe('wide')
  })

  it('keys the decorator parent data attribute off the width prop', async () => {
    const nodeKey = await addHtmlNode(editor)

    // in this harness the decorator parent element is the render container;
    // in the product it is Lexical's decorator div
    const { container, rerenderWidth } = renderWrapperWithWidth(nodeKey, 'wide', [])
    expect(container).toHaveAttribute('data-inkling-card-width', 'wide')

    // 'regular' deletes the attribute so there is less test churn
    rerenderWidth('regular')
    expect(container).not.toHaveAttribute('data-inkling-card-width')

    rerenderWidth('wide')
    expect(container).toHaveAttribute('data-inkling-card-width', 'wide')
  })

  it('dispatches EDIT_CARD_COMMAND when the card context setEditing(true) is called', async () => {
    // the equivalence plan 046 relies on: cards that dispatch
    // EDIT_CARD_COMMAND directly and cards that call the context's
    // setEditing(true) reach the same command handler
    const nodeKey = await addHtmlNode(editor)
    const dispatchSpy = vi.spyOn(editor, 'dispatchCommand')
    const composerValue = createComposerContext()
    let captured: React.ContextType<typeof CardContext> | undefined
    function ContextProbe() {
      captured = React.useContext(CardContext)
      return null
    }

    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <InklingSelectedCardContext>
          <InklingCardWrapper nodeKey={nodeKey}>
            <ContextProbe />
          </InklingCardWrapper>
        </InklingSelectedCardContext>
      </InklingHostIntegrationContext.Provider>,
    )

    act(() => {
      captured?.setEditing(true)
    })

    expect(dispatchSpy).toHaveBeenCalledWith(EDIT_CARD_COMMAND, { cardKey: nodeKey })
  })
})
