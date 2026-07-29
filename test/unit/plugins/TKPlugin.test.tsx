import { render, screen } from '@testing-library/react'
import { $createTextNode, type LexicalEditor } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockComposerContext } from '#/utils/composer-context'
import { createTestEditor, updateEditor } from '#/utils/test-editor'
import CardContext, { type CardContextValue } from '@/context/CardContext'
import { TKHandleContext } from '@/context/TKHandleContext'
import { useInklingTextEntity } from '@/hooks/useInklingTextEntity'
import { ExtendedTextNode, TKNode } from '@/nodes/base'
import { createTKHandle, type TKHandle } from '@/plugins/behaviour/tkHandle'
import TKPlugin from '@/plugins/TKPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('../../../src/hooks/useInklingTextEntity', () => ({
  useInklingTextEntity: vi.fn(),
}))

function createCardContextValue(overrides: Partial<CardContextValue> = {}): CardContextValue {
  return {
    captionHasFocus: false,
    nodeKey: undefined,
    setCaptionHasFocus: vi.fn(),
    ...overrides,
  }
}

function mockComposerEditor(editor: LexicalEditor) {
  mockComposerContext(editor)
}

function renderTKPlugin(handle: TKHandle, cardValue: CardContextValue) {
  return render(
    <TKHandleContext.Provider value={handle}>
      <CardContext.Provider value={cardValue}>
        <TKPlugin />
      </CardContext.Provider>
    </TKHandleContext.Provider>,
  )
}

describe('TKPlugin', () => {
  let editor: LexicalEditor
  let handle: TKHandle

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = '<div data-lexical-editor="true"></div>'
    handle = createTKHandle()
  })

  it('throws when TKNode is not registered', () => {
    editor = createTestEditor({ headless: false })
    mockComposerEditor(editor)

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const cardValue = createCardContextValue()
    expect(() => {
      renderTKPlugin(handle, cardValue)
    }).toThrow('TKPlugin: TKNode not registered on editor')

    consoleError.mockRestore()
  })

  it('returns null when in nested editor', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    mockComposerEditor(editor)

    const cardValue = createCardContextValue({ nodeKey: 'card-1' })
    const { container } = renderTKPlugin(handle, cardValue)

    expect(container.firstChild).toBeNull()
  })

  it('returns null when editor has no root parent', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    mockComposerEditor(editor)

    // Ensure getRootElement returns null
    editor.setRootElement(null)

    const cardValue = createCardContextValue()
    const { container } = renderTKPlugin(handle, cardValue)

    expect(container.firstChild).toBeNull()
  })

  it('renders TK indicators for top-level editor', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const paragraph = document.createElement('p')
    paragraph.setAttribute('data-lexical-decorator', 'true')
    document.body.appendChild(paragraph)

    handle.setState({
      tkNodeMap: {
        'paragraph-key': ['tk-1', 'tk-2'],
      },
      tkCount: 2,
    })

    vi.spyOn(editor, 'getElementByKey').mockImplementation((key: string) => {
      if (key === 'paragraph-key') {
        return paragraph
      }
      return null
    })

    const cardValue = createCardContextValue()
    renderTKPlugin(handle, cardValue)

    expect(screen.getAllByTestId('tk-indicator')).toHaveLength(1)
  })

  it('does not render indicator when parent container is missing', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    handle.setState({
      tkNodeMap: {
        'missing-key': ['tk-1'],
      },
      tkCount: 1,
    })

    vi.spyOn(editor, 'getElementByKey').mockReturnValue(null)

    const cardValue = createCardContextValue()
    const { container } = renderTKPlugin(handle, cardValue)

    expect(container.firstChild).toBeNull()
  })

  it('removes editor on unmount', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const removeEditor = vi.spyOn(handle, 'removeEditor')

    const cardValue = createCardContextValue()
    const { unmount } = renderTKPlugin(handle, cardValue)

    unmount()
    expect(removeEditor).toHaveBeenCalledWith(editor.getKey())
  })

  it('getTKMatch returns null for text without TK', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const cardValue = createCardContextValue()
    renderTKPlugin(handle, cardValue)

    const [getTKMatch] = vi.mocked(useInklingTextEntity).mock.calls[0]
    expect(getTKMatch('hello world')).toBeNull()
  })

  it('getTKMatch finds TK in text', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const cardValue = createCardContextValue()
    renderTKPlugin(handle, cardValue)

    const [getTKMatch] = vi.mocked(useInklingTextEntity).mock.calls[0]
    const match = getTKMatch('hello TK')
    if (!match) {
      throw new Error('Expected TK entity match')
    }
    expect(match.start).toBe(6)
    expect(match.end).toBe(8)
  })

  it('getTKMatch rejects TK preceded by word character', () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const cardValue = createCardContextValue()
    renderTKPlugin(handle, cardValue)

    const [getTKMatch] = vi.mocked(useInklingTextEntity).mock.calls[0]
    expect(getTKMatch('wordTK')).toBeNull()
  })

  it('createTKNode creates a TKNode with text content', async () => {
    editor = createTestEditor({ nodes: [TKNode, ExtendedTextNode], headless: false })
    editor.setRootElement(document.querySelector('[data-lexical-editor]') as HTMLElement)
    mockComposerEditor(editor)

    const cardValue = createCardContextValue()
    renderTKPlugin(handle, cardValue)

    const [, , createTKNode] = vi.mocked(useInklingTextEntity).mock.calls[0]

    let textContent = ''
    await updateEditor(editor, () => {
      const tkNode = createTKNode($createTextNode('TK test'))
      textContent = tkNode.getTextContent()
    })

    expect(textContent).toBe('TK test')
  })
})
