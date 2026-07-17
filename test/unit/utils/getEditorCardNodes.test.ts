import { createEditor, DecoratorNode } from 'lexical'
import { describe, expect, it } from 'vitest'

import { getEditorCardNodes } from '@/utils/getEditorCardNodes'

class CardNode extends DecoratorNode<null> {
  static getType() {
    return 'test-card'
  }

  static clone() {
    return new CardNode()
  }

  static cardMenu = [{ label: 'Card' }]

  createDOM() {
    return document.createElement('div')
  }

  updateDOM() {
    return false
  }

  decorate() {
    return null
  }
}

describe('getEditorCardNodes', () => {
  it('returns an empty array when there are no nodes', () => {
    expect(getEditorCardNodes(createEditor({ onError: () => {} }))).toEqual([])
  })

  it('only returns nodes with a cardMenu static property', () => {
    const editor = createEditor({ nodes: [CardNode], onError: () => {} })

    expect(getEditorCardNodes(editor)).toEqual([['test-card', CardNode]])
  })
})
