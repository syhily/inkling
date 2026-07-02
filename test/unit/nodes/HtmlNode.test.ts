import { createHeadlessEditor } from '@lexical/headless'
import { type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { HtmlNode, $createHtmlNode, $isHtmlNode, INSERT_HTML_COMMAND } from '@/nodes/HtmlNode'

const editorNodes = [HtmlNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('HtmlNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isHtmlNode', async () => {
    await updateEditor(editor, () => {
      const node = $createHtmlNode({})
      expect($isHtmlNode(node)).toBe(true)
    })
  })

  it('exposes a static cardMenu entry', () => {
    expect(HtmlNode.cardMenu.label).toBe('HTML')
    expect(HtmlNode.cardMenu.insertCommand).toBe(INSERT_HTML_COMMAND)
  })

  it('returns the html icon', async () => {
    await updateEditor(editor, () => {
      const node = $createHtmlNode({})
      expect(typeof node.getIcon()).toBe('function')
    })
  })
})
