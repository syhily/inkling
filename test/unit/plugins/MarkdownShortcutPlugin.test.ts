import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { LinkNode } from '@lexical/link'
import { $isListItemNode, $isListNode, ListItemNode, ListNode } from '@lexical/list'
import { $convertFromMarkdownString, $convertToMarkdownString, type Transformer } from '@lexical/markdown'
import { $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $getRoot, $isParagraphNode, $isTextNode } from 'lexical'
import { describe, expect, it } from 'vitest'

import { $createCodeBlockNode, $isCodeBlockNode, CodeBlockNode } from '@/nodes/CodeBlockNode'
import { $isHorizontalRuleNode, HorizontalRuleNode } from '@/nodes/HorizontalRuleNode'
import {
  BASIC_TRANSFORMERS,
  DEFAULT_TRANSFORMERS,
  ELEMENT_TRANSFORMERS,
  MINIMAL_TRANSFORMERS,
} from '@/plugins/MarkdownShortcutPlugin'

function createTestEditor() {
  return createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeBlockNode, HorizontalRuleNode],
    onError(error) {
      throw error
    },
  })
}

function importMarkdown(markdown: string, transformers: Transformer[] = DEFAULT_TRANSFORMERS): LexicalEditor {
  const editor = createTestEditor()
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, transformers)
    },
    { discrete: true },
  )
  return editor
}

function exportMarkdown(editor: LexicalEditor, transformers: Transformer[] = DEFAULT_TRANSFORMERS): string {
  return editor.getEditorState().read(() => $convertToMarkdownString(transformers))
}

describe('MarkdownShortcutPlugin transformers', () => {
  it('exports the shared transformer sets wired into the public API', () => {
    // the element transformers include the custom hr and code block transformers
    expect(ELEMENT_TRANSFORMERS.map((t) => t.type)).toEqual([
      'element',
      'element',
      'element',
      'element',
      'element',
      'element',
    ])
    expect(DEFAULT_TRANSFORMERS.length).toBeGreaterThan(ELEMENT_TRANSFORMERS.length)
    // minimal/basic sets exclude the heading element transformer
    expect(MINIMAL_TRANSFORMERS.some((t) => t === ELEMENT_TRANSFORMERS[0])).toBe(false)
    expect(BASIC_TRANSFORMERS.some((t) => t === ELEMENT_TRANSFORMERS[0])).toBe(false)
  })

  it('imports and exports headings', () => {
    const editor = importMarkdown('# Hello')
    editor.getEditorState().read(() => {
      const heading = $getRoot().getFirstChild()
      expect($isHeadingNode(heading)).toBe(true)
      expect(heading?.getTextContent()).toBe('Hello')
    })
    expect(exportMarkdown(editor)).toBe('# Hello')
  })

  it('imports and exports unordered lists', () => {
    const editor = importMarkdown('- one\n- two')
    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild()
      expect($isListNode(list)).toBe(true)
      expect($isListNode(list) && list.getListType()).toBe('bullet')
      expect(list?.getChildrenSize()).toBe(2)
    })
    expect(exportMarkdown(editor)).toBe('- one\n- two')
  })

  it('imports and exports ordered lists', () => {
    const editor = importMarkdown('1. one\n2. two')
    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild()
      expect($isListNode(list)).toBe(true)
      expect($isListNode(list) && list.getListType()).toBe('number')
    })
    expect(exportMarkdown(editor)).toBe('1. one\n2. two')
  })

  it('imports and exports quotes', () => {
    const editor = importMarkdown('> a quote')
    editor.getEditorState().read(() => {
      const quote = $getRoot().getFirstChild()
      expect($isQuoteNode(quote)).toBe(true)
      expect(quote?.getTextContent()).toBe('a quote')
    })
    expect(exportMarkdown(editor)).toBe('> a quote')
  })

  it('imports and exports horizontal rules', () => {
    const editor = importMarkdown('---')
    editor.getEditorState().read(() => {
      expect($isHorizontalRuleNode($getRoot().getFirstChild())).toBe(true)
    })
    expect(exportMarkdown(editor)).toBe('---')
  })

  it('exports code blocks with their language', () => {
    const editor = createTestEditor()
    editor.update(
      () => {
        $getRoot().append($createCodeBlockNode({ code: 'const x = 1', language: 'js' }))
      },
      { discrete: true },
    )
    // TODO: bug — the decorator node's getTextContent appends '\n\n' for word
    // counting, which leaks into the fence as trailing blank lines on export
    expect(exportMarkdown(editor)).toBe('```js\nconst x = 1\n\n\n```')
  })

  it('does not import code fences as code blocks (fence regexp requires trailing whitespace)', () => {
    // the CODE_BLOCK regExp /^```(\w{1,10})?\s/ only matches once a space is
    // typed after the fence, so `$convertFromMarkdownString` leaves the fence
    // as plain text — the same limitation documented for the round-trip API
    const editor = importMarkdown('```js\nconst x = 1\n```')
    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .some((node) => $isCodeBlockNode(node)),
      ).toBe(false)
    })
    expect(exportMarkdown(editor)).toBe('\\`\\`\\`js\nconst x = 1\n\\`\\`\\`')
  })

  it('imports and exports subscript via the custom ~ transformer', () => {
    const editor = importMarkdown('H~2~O')
    editor.getEditorState().read(() => {
      const textNodes = $getRoot().getAllTextNodes()
      const sub = textNodes.find((node) => node.getTextContent() === '2')
      expect(sub && $isTextNode(sub) && sub.hasFormat('subscript')).toBe(true)
    })
    expect(exportMarkdown(editor)).toBe('H~2~O')
  })

  it('imports and exports superscript via the custom ^ transformer', () => {
    const editor = importMarkdown('E=mc^2^')
    editor.getEditorState().read(() => {
      const textNodes = $getRoot().getAllTextNodes()
      const sup = textNodes.find((node) => node.getTextContent() === '2')
      expect(sup && $isTextNode(sup) && sup.hasFormat('superscript')).toBe(true)
    })
    expect(exportMarkdown(editor)).toBe('E=mc^2^')
  })

  it('leaves heading markdown as plain text with the minimal transformer set', () => {
    const editor = importMarkdown('# Hello', MINIMAL_TRANSFORMERS)
    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild()
      expect($isParagraphNode(paragraph)).toBe(true)
      expect(paragraph?.getTextContent()).toBe('# Hello')
    })
  })

  it('keeps list import working with the basic transformer set', () => {
    const editor = importMarkdown('- one', BASIC_TRANSFORMERS)
    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild()
      expect($isListNode(list)).toBe(true)
      expect($isListItemNode(list?.getFirstChild())).toBe(true)
    })
  })
})
