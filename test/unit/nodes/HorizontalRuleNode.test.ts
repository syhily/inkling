import { createHeadlessEditor } from '@lexical/headless'
import { type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { getCardDragIcon } from '@/nodes/cards/card-menus'
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

  it('exposes a static cardMenu entry', () => {
    expect(HorizontalRuleNode.cardMenu?.[0]?.label).toBe('Divider')
    expect(HorizontalRuleNode.cardMenu?.[0]?.insertCommand).toBe(INSERT_HORIZONTAL_RULE_COMMAND)
  })

  it('resolves the divider drag icon from the card menu', () => {
    expect(typeof getCardDragIcon('horizontalrule')).toBe('function')
  })
})
