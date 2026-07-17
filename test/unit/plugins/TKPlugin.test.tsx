import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { render, screen } from '@testing-library/react'
import { $createTextNode, createEditor, type LexicalEditor, type LexicalNodeConfig } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext, { type CardContextValue } from '@/context/CardContext'
import { useTKContext, type TKContextValue } from '@/context/TKContext'
import { useInklingTextEntity } from '@/hooks/useInklingTextEntity'
import { ExtendedTextNode, TKNode } from '@/nodes/base'
import TKPlugin from '@/plugins/TKPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('../../../src/hooks/useInklingTextEntity', () => ({
  useInklingTextEntity: vi.fn(),
}))

vi.mock('../../../src/context/TKContext', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useTKContext: vi.fn(),
  }
})

function createTestEditor(nodes: LexicalNodeConfig[] = []): LexicalEditor {
  return createEditor({ namespace: 'test', nodes, onError: () => {} })
}

function createTKContextValue(overrides: Partial<TKContextValue> = {}): TKContextValue {
  return {
    tkNodeMap: {},
    tkCount: 0,
    addEditorTkNode: vi.fn(),
    removeEditorTkNode: vi.fn(),
    removeEditor: vi.fn(),
    ...overrides,
  }
}

function createCardContextValue(overrides: Partial<CardContextValue> = {}): CardContextValue {
  return {
    isSelected: false,
    isEditing: false,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: undefined,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function mockComposerEditor(editor: LexicalEditor) {
  vi.mocked(useLexicalComposerContext).mockReturnValue([editor, { getTheme: () => null }])
}

function mockTKContext(value: TKContextValue) {
  vi.mocked(useTKContext).mockReturnValue(value)
}

describe('TKPlugin', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = '<div data-lexical-editor="true"></div>'
  })

  it('throws when TKNode is not registered', () => {
    editor = createTestEditor()
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const cardValue = createCardContextValue()
    expect(() => {
      render(
        <CardContext.Provider value={cardValue}>
          <TKPlugin />
        </CardContext.Provider>,
      )
    }).toThrow('TKPlugin: TKNode not registered on editor')

    consoleError.mockRestore()
  })

  it('returns null when in nested editor', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    const cardValue = createCardContextValue({ nodeKey: 'card-1' })
    const { container } = render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('returns null when editor has no root parent', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    // Ensure getRootElement returns null
    editor.setRootElement(null)

    const cardValue = createCardContextValue()
    const { container } = render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders TK indicators for top-level editor', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-lexical-decorator', 'true')
    document.body.appendChild(paragraph)

    const tkNodeMap = {
      'paragraph-key': ['tk-1', 'tk-2'],
    }

    mockTKContext(createTKContextValue({ tkNodeMap }))

    vi.spyOn(editor, 'getElementByKey').mockImplementation((key: string) => {
      if (key === 'paragraph-key') {
        return paragraph
      }
      return null
    })

    const cardValue = createCardContextValue()
    render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    expect(screen.getAllByTestId('tk-indicator')).toHaveLength(1)
  })

  it('does not render indicator when parent container is missing', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const tkNodeMap = {
      'missing-key': ['tk-1'],
    }

    mockTKContext(createTKContextValue({ tkNodeMap }))

    vi.spyOn(editor, 'getElementByKey').mockReturnValue(null)

    const cardValue = createCardContextValue()
    const { container } = render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    expect(container.firstChild).toBeNull()
  })

  it('removes editor on unmount', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const removeEditor = vi.fn()
    mockTKContext(createTKContextValue({ removeEditor }))

    const cardValue = createCardContextValue()
    const { unmount } = render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    unmount()
    expect(removeEditor).toHaveBeenCalledWith(editor.getKey())
  })

  it('getTKMatch returns null for text without TK', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    const cardValue = createCardContextValue()
    render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    const [getTKMatch] = vi.mocked(useInklingTextEntity).mock.calls[0]
    expect(getTKMatch('hello world')).toBeNull()
  })

  it('getTKMatch finds TK in text', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    const cardValue = createCardContextValue()
    render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    const [getTKMatch] = vi.mocked(useInklingTextEntity).mock.calls[0]
    const match = getTKMatch('hello TK')
    if (!match) {
      throw new Error('Expected TK entity match')
    }
    expect(match.start).toBe(6)
    expect(match.end).toBe(8)
  })

  it('getTKMatch rejects TK preceded by word character', () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    const cardValue = createCardContextValue()
    render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    const [getTKMatch] = vi.mocked(useInklingTextEntity).mock.calls[0]
    expect(getTKMatch('wordTK')).toBeNull()
  })

  it('createTKNode creates a TKNode with text content', async () => {
    editor = createTestEditor([TKNode, ExtendedTextNode])
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)
    mockTKContext(createTKContextValue())

    const cardValue = createCardContextValue()
    render(
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>,
    )

    const [, , createTKNode] = vi.mocked(useInklingTextEntity).mock.calls[0]

    let textContent = ''
    await new Promise<void>((resolve) => {
      editor.update(
        () => {
          const tkNode = createTKNode($createTextNode('TK test'))
          textContent = tkNode.getTextContent()
        },
        { onUpdate: () => resolve() },
      )
    })

    expect(textContent).toBe('TK test')
  })
})
