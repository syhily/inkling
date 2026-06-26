import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { HeaderNode, $createHeaderNode, $isHeaderNode, INSERT_HEADER_COMMAND } from '@/nodes/HeaderNode'

const editorNodes = [HeaderNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('HeaderNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isHeaderNode', async () => {
    await updateEditor(editor, () => {
      const node = $createHeaderNode({})
      expect($isHeaderNode(node)).toBe(true)
    })
  })

  it('exposes a static kgMenu entry', () => {
    expect(HeaderNode.kgMenu[0].label).toBe('Header')
    expect(HeaderNode.kgMenu[0].insertCommand).toBe(INSERT_HEADER_COMMAND)
  })

  it('returns the header icon', async () => {
    await updateEditor(editor, () => {
      const node = $createHeaderNode({})
      expect(typeof node.getIcon()).toBe('function')
    })
  })

  it('getDataset includes nested editor references', async () => {
    await updateEditor(editor, () => {
      const node = $createHeaderNode({ header: 'Hello', subheader: 'World' })
      const dataset = node.getDataset()

      expect(dataset.headerTextEditor).toBeDefined()
      expect(dataset.subheaderTextEditor).toBeDefined()
    })
  })

  it('exports header and subheader as html when editors exist', async () => {
    await updateEditor(editor, () => {
      const node = $createHeaderNode({})

      const makeEditor = () => {
        const nested = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
        nested.update(
          () => {
            const root = $getRoot()
            root.clear()
            const paragraph = root.append($createParagraphNode())
            paragraph.append($createTextNode('Text'))
          },
          { onUpdate: () => {} },
        )
        return nested
      }

      node.__headerTextEditor = makeEditor()
      node.__subheaderTextEditor = makeEditor()

      const json = node.exportJSON() as Record<string, unknown>
      expect(json.header).toContain('Text')
      expect(json.subheader).toContain('Text')
    })
  })

  it('returns full card width for split layout', async () => {
    await updateEditor(editor, () => {
      const node = $createHeaderNode({ layout: 'split' })
      expect(node.getCardWidth()).toBe('full')
    })
  })

  it('returns the layout as card width otherwise', async () => {
    await updateEditor(editor, () => {
      const node = $createHeaderNode({ layout: 'regular' })
      expect(node.getCardWidth()).toBe('regular')
    })
  })
})
