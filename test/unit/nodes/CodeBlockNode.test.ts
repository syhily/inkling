import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { getCardDragIcon } from '@/nodes/cards/card-menus'
import { CodeBlockNode, $createCodeBlockNode, $isCodeBlockNode } from '@/nodes/CodeBlockNode'

const editorNodes = [CodeBlockNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('CodeBlockNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isCodeBlockNode', async () => {
    await updateEditor(editor, () => {
      const node = $createCodeBlockNode({})
      expect($isCodeBlockNode(node)).toBe(true)
    })
  })

  it('resolves the code block drag icon despite having no cardMenu entry', () => {
    expect(typeof getCardDragIcon('codeblock')).toBe('function')
  })

  it('stores open in edit mode flag', async () => {
    await updateEditor(editor, () => {
      const node = $createCodeBlockNode({ _openInEditMode: true })
      expect((node as unknown as Record<string, boolean>).__openInEditMode).toBe(true)

      node.clearOpenInEditMode()
      expect((node as unknown as Record<string, boolean>).__openInEditMode).toBe(false)
    })
  })

  it('getDataset includes caption editor state', async () => {
    await updateEditor(editor, () => {
      const node = $createCodeBlockNode({ caption: 'A caption' })
      const dataset = node.getDataset()

      expect(dataset.caption).toBe('A caption')
      expect(dataset.captionEditor).toBeDefined()
      expect(dataset.captionEditorInitialState).toBeDefined()
    })
  })

  it('exports caption as html when a caption editor exists', async () => {
    await updateEditor(editor, () => {
      const node = $createCodeBlockNode({})
      node.__captionEditor = createHeadlessEditor({
        nodes: editorNodes,
        onError: () => {},
      })

      node.__captionEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const paragraph = root.append($createParagraphNode())
          paragraph.append($createTextNode('Hello caption'))
        },
        { onUpdate: () => {} },
      )

      const json = node.exportJSON()
      expect(json.caption).toContain('Hello caption')
    })
  })
})
