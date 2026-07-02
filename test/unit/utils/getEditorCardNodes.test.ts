import { describe, expect, it } from 'vitest'

import { getEditorCardNodes } from '@/utils/getEditorCardNodes'

describe('getEditorCardNodes', () => {
  it('returns an empty array when there are no nodes', () => {
    expect(getEditorCardNodes({ _nodes: new Map() })).toEqual([])
  })

  it('only returns nodes with a cardMenu static property', () => {
    const cardClass = { cardMenu: [{ label: 'Card' }] }
    const plainClass = {}

    const editor = {
      _nodes: new Map([
        ['card', { klass: cardClass }],
        ['plain', { klass: plainClass }],
      ]),
    }

    expect(getEditorCardNodes(editor)).toEqual([['card', cardClass]])
  })
})
