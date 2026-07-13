import { fireEvent, render, screen } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { FloatingFormatToolbar } from '@/components/ui/FloatingFormatToolbar'

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
}

function selectText(editor: LexicalEditor, text: string): Promise<void> {
  return new Promise((resolve) => {
    editor.update(
      () => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode(text)
        paragraph.append(textNode)
        root.append(paragraph)
        textNode.select(0, text.length)
      },
      { onUpdate: () => resolve() },
    )
  })
}

describe('FloatingFormatToolbar', () => {
  it('collapses the selection to the end of the focus node after a link update', async () => {
    const editor = createTestEditor()
    await selectText(editor, 'hello')
    const setToolbarItemType = vi.fn()

    render(
      <FloatingFormatToolbar
        anchorElem={document.body}
        editor={editor}
        setToolbarItemType={setToolbarItemType}
        toolbarItemType="link"
      />,
    )

    fireEvent.input(screen.getByTestId('link-input'), { target: { value: 'https://example.com' } })
    fireEvent.keyDown(screen.getByTestId('link-input'), { key: 'Enter' })

    // Lexical defers the commit of non-discrete updates to a microtask
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isRangeSelection(selection)).toBe(true)
      if ($isRangeSelection(selection)) {
        expect(selection.isCollapsed()).toBe(true)
        expect(selection.anchor.offset).toBe(5)
      }
    })

    expect(setToolbarItemType).toHaveBeenCalledWith(null)
  })
})
