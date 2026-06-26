import { createHeadlessEditor } from '@lexical/headless'
import { type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  HorizontalRuleNode,
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@/nodes/HorizontalRuleNode'

const editorNodes = [HorizontalRuleNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('HorizontalRuleNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isHorizontalRuleNode', async () => {
    await updateEditor(editor, () => {
      const node = $createHorizontalRuleNode()
      expect($isHorizontalRuleNode(node)).toBe(true)
    })
  })

  it('exposes a static kgMenu entry', () => {
    expect(HorizontalRuleNode.kgMenu.label).toBe('Divider')
    expect(HorizontalRuleNode.kgMenu.insertCommand).toBe(INSERT_HORIZONTAL_RULE_COMMAND)
  })

  it('returns the divider icon', async () => {
    await updateEditor(editor, () => {
      const node = $createHorizontalRuleNode()
      expect(typeof node.getIcon()).toBe('function')
    })
  })
})
