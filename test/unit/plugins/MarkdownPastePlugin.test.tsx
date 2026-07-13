import { LexicalComposerContext, createLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isHeadingNode, HeadingNode, registerRichText } from '@lexical/rich-text'
import { act, renderHook } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  createEditor,
} from 'lexical'
import React, { useMemo } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MarkdownPastePlugin, PASTE_MARKDOWN_COMMAND } from '@/plugins/MarkdownPastePlugin'

// jsdom does not implement DataTransfer (verified on jsdom 29); the plugin
// builds one inside its command handler, so shim the minimal setData/getData
// surface the handler and $insertDataTransferForRichText rely on
class MockDataTransfer {
  private data = new Map<string, string>()

  setData(format: string, value: string) {
    this.data.set(format, value)
  }

  getData(format: string) {
    return this.data.get(format) ?? ''
  }
}

const originalDataTransfer = globalThis.DataTransfer

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [HeadingNode],
    onError: () => {},
    theme: {},
  })
}

type TestEditor = ReturnType<typeof createTestEditor>

function TestWrapper({ children, editor }: { children: React.ReactNode; editor: TestEditor }) {
  const contextValue = useMemo(() => [editor, createLexicalComposerContext(null, {})] as const, [editor])
  return <LexicalComposerContext.Provider value={contextValue}>{children}</LexicalComposerContext.Provider>
}

async function pasteMarkdown(editor: TestEditor, text: string, allowBr: boolean) {
  await act(async () => {
    editor.dispatchCommand(PASTE_MARKDOWN_COMMAND, { text, allowBr })
  })
}

describe('MarkdownPastePlugin', () => {
  let editor: TestEditor

  beforeEach(async () => {
    globalThis.DataTransfer = MockDataTransfer as unknown as typeof DataTransfer

    editor = createTestEditor()

    const rootElement = document.createElement('div')
    rootElement.setAttribute('contenteditable', 'true')
    document.body.appendChild(rootElement)
    editor.setRootElement(rootElement)

    await act(async () => {
      editor.update(() => {
        const paragraph = $createParagraphNode()
        const text = $createTextNode('')
        paragraph.append(text)
        $getRoot().append(paragraph)
        text.select()
      })
    })

    await act(async () => {
      renderHook(() => MarkdownPastePlugin(), {
        wrapper: ({ children }) => <TestWrapper editor={editor}>{children}</TestWrapper>,
      })
    })

    registerRichText(editor)
  })

  afterEach(() => {
    globalThis.DataTransfer = originalDataTransfer
    document.body.innerHTML = ''
  })

  it('converts pasted markdown into rich text (# Title becomes a heading)', async () => {
    await pasteMarkdown(editor, '# Title', false)

    editor.getEditorState().read(() => {
      const heading = $getRoot().getFirstChild()
      expect($isHeadingNode(heading)).toBe(true)
      expect(heading?.getTextContent()).toBe('Title')
    })
  })

  it('inserts raw text without markdown conversion while shift is held', async () => {
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
    })

    await pasteMarkdown(editor, '# Title', false)

    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild()
      expect($isParagraphNode(paragraph)).toBe(true)
      expect(paragraph?.getTextContent()).toBe('# Title')
    })

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }))
    })
  })

  it('strips <br> tags from converted markdown when allowBr is false', async () => {
    // two trailing spaces are a markdown hard break, rendered as <br>
    await pasteMarkdown(editor, 'a  \nb', false)

    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild()
      expect($isParagraphNode(paragraph)).toBe(true)
      expect($isParagraphNode(paragraph) && paragraph.getChildren().some((node) => $isLineBreakNode(node))).toBe(false)
    })
  })

  it('keeps <br> line breaks when allowBr is true', async () => {
    await pasteMarkdown(editor, 'a  \nb', true)

    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild()
      expect($isParagraphNode(paragraph)).toBe(true)
      expect($isParagraphNode(paragraph) && paragraph.getChildren().some((node) => $isLineBreakNode(node))).toBe(true)
    })
  })
})
