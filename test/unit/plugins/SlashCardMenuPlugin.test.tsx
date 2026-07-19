import { act, render, screen, waitFor } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockComposerContext } from '#/utils/composer-context'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import DEFAULT_NODES from '@/nodes/DefaultNodes'
import { INSERT_HTML_COMMAND } from '@/nodes/HtmlNode'
import SlashCardMenuPlugin from '@/plugins/SlashCardMenuPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createComposerContext() {
  return {
    fileUploader: {
      useFileUpload: () => ({
        upload: () => Promise.resolve(undefined),
      }),
    },
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
    onError: vi.fn(),
  }
}

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: 'test',
    nodes: DEFAULT_NODES,
    onError: () => {},
    theme: {},
  })
}

async function updateEditor(editor: LexicalEditor, updateFn: () => void): Promise<void> {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

async function setupSlashPlugin() {
  const editor = createTestEditor()
  const rootElement = document.createElement('div')
  rootElement.setAttribute('contenteditable', 'true')
  document.body.appendChild(rootElement)
  editor.setRootElement(rootElement)
  rootElement.focus()

  await updateEditor(editor, () => {
    const paragraph = $createParagraphNode()
    paragraph.append($createTextNode(''))
    $getRoot().append(paragraph)
    paragraph.select()
  })

  function getAnchorNode(): Node | null {
    const textSpan = rootElement.querySelector('[data-lexical-text="true"]')
    if (textSpan?.firstChild) {
      return textSpan.firstChild
    }
    const paragraph = rootElement.querySelector('p')
    if (!paragraph) {
      return null
    }
    return {
      nodeType: Node.TEXT_NODE,
      nodeValue: '',
      parentNode: paragraph,
      textContent: '',
    } as unknown as Node
  }

  vi.spyOn(window, 'getSelection').mockImplementation(
    () =>
      ({
        get anchorNode() {
          return getAnchorNode()
        },
        get focusNode() {
          return getAnchorNode()
        },
        get isCollapsed() {
          return true
        },
        get rangeCount() {
          return 1
        },
        removeAllRanges: () => {},
        addRange: () => {},
        getRangeAt: () => ({}) as Range,
        toString: () => '',
      }) as unknown as Selection,
  )

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 20,
    height: 20,
    left: 0,
    right: 100,
    top: 0,
    width: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)

  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    value: 0,
  })

  const contextValue = createComposerContext()

  mockComposerContext(editor)
  const dispatchCommandSpy = vi.spyOn(editor, 'dispatchCommand')

  render(
    <InklingHostIntegrationContext.Provider value={contextValue}>
      <SlashCardMenuPlugin />
    </InklingHostIntegrationContext.Provider>,
  )

  return { editor, rootElement, dispatchCommandSpy }
}

describe('SlashCardMenuPlugin', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('does not render the slash menu initially', async () => {
    await setupSlashPlugin()
    expect(document.querySelector('[data-inkling-slash-menu]')).not.toBeInTheDocument()
  })

  it('opens the slash menu when / is typed on an empty paragraph', async () => {
    await setupSlashPlugin()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keypress', { key: '/', bubbles: true }))
    })

    await waitFor(() => {
      expect(document.querySelector('[data-inkling-slash-menu]')).toBeInTheDocument()
    })

    expect(document.querySelector('[data-inkling-card-menu]')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
  })

  it('filters the menu when typing a query', async () => {
    const { editor } = await setupSlashPlugin()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keypress', { key: '/', bubbles: true }))
    })

    await act(async () => {
      await updateEditor(editor, () => {
        const paragraph = $getRoot().getFirstChild()
        if ($isElementNode(paragraph)) {
          paragraph.clear()
          paragraph.append($createTextNode('/image'))
        }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Image')).toBeInTheDocument()
    })

    expect(screen.queryByText('HTML')).not.toBeInTheDocument()
  })

  it('dispatches the insert command when selecting an item from the menu', async () => {
    const { editor, dispatchCommandSpy } = await setupSlashPlugin()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keypress', { key: '/', bubbles: true }))
    })

    await act(async () => {
      await updateEditor(editor, () => {
        const paragraph = $getRoot().getFirstChild()
        if ($isElementNode(paragraph)) {
          paragraph.clear()
          paragraph.append($createTextNode('/html'))
        }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('HTML')).toBeInTheDocument()
    })

    await act(async () => {
      screen.getByText('HTML').click()
    })

    await waitFor(() => {
      expect(dispatchCommandSpy).toHaveBeenCalledWith(INSERT_HTML_COMMAND, expect.any(Object))
    })
  })

  it('closes the slash menu when Escape is pressed', async () => {
    await setupSlashPlugin()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keypress', { key: '/', bubbles: true }))
    })

    await waitFor(() => {
      expect(document.querySelector('[data-inkling-slash-menu]')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    await waitFor(() => {
      expect(document.querySelector('[data-inkling-slash-menu]')).not.toBeInTheDocument()
    })
  })
})
