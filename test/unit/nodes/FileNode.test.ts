import { createHeadlessEditor } from '@lexical/headless'
import { type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { FileNode, $createFileNode, $isFileNode, INSERT_FILE_COMMAND } from '@/nodes/FileNode'

const editorNodes = [FileNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('FileNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isFileNode', async () => {
    await updateEditor(editor, () => {
      const node = $createFileNode({})
      expect($isFileNode(node)).toBe(true)
    })
  })

  it('exposes a static cardMenu entry', () => {
    expect(FileNode.cardMenu[0].label).toBe('File')
    expect(FileNode.cardMenu[0].insertCommand).toBe(INSERT_FILE_COMMAND)
  })

  it('returns the file icon', async () => {
    await updateEditor(editor, () => {
      const node = $createFileNode({})
      expect(typeof node.getIcon()).toBe('function')
    })
  })

  it('sets __triggerFileDialog when no src is provided', async () => {
    await updateEditor(editor, () => {
      const node = $createFileNode({ triggerFileDialog: true })
      expect((node as unknown as Record<string, boolean>).__triggerFileDialog).toBe(true)
    })
  })

  it('stores the initial file', async () => {
    const file = new File(['content'], 'doc.pdf')
    await updateEditor(editor, () => {
      const node = $createFileNode({ initialFile: file })
      expect((node as unknown as Record<string, File | null>).__initialFile).toBe(file)
    })
  })
})
