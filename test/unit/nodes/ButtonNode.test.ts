import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { ButtonNode, $createButtonNode, $$isisButtonNode, INSERT_BUTTON_COMMAND } from '@/nodes/ButtonNode'

const editorNodes = [ButtonNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('ButtonNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $$isisButtonNode', async () => {
    await updateEditor(editor, () => {
      const buttonNode = $createButtonNode()
      expect($$isisButtonNode(buttonNode)).toBe(true)
    })
  })

  it('exposes a static kgMenu entry', () => {
    expect(ButtonNode.kgMenu[0].label).toBe('Button')
    expect(ButtonNode.kgMenu[0].insertCommand).toBe(INSERT_BUTTON_COMMAND)
  })

  it('returns the button icon', async () => {
    await updateEditor(editor, () => {
      const node = $createButtonNode()
      expect(typeof node.getIcon()).toBe('function')
    })
  })

  it('getDataset includes text editor state', async () => {
    await updateEditor(editor, () => {
      const node = $createButtonNode({ text: 'Click me' })
      const dataset = node.getDataset()

      expect(dataset.text).toBe('Click me')
      expect(dataset.textEditor).toBeDefined()
      expect(dataset.textEditorInitialState).toBeDefined()
    })
  })

  it('exports button text as html when a text editor exists', async () => {
    await updateEditor(editor, () => {
      const node = $createButtonNode({})
      node.__textEditor = createHeadlessEditor({
        nodes: editorNodes,
        onError: () => {},
      })

      node.__textEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const paragraph = root.append($createParagraphNode())
          paragraph.append($createTextNode('Subscribe'))
        },
        { onUpdate: () => {} },
      )

      const json = node.exportJSON() as Record<string, unknown>
      expect(json.text).toContain('Subscribe')
    })
  })
})
