import { describe, expect, it } from 'vitest'

import { getScrollParent } from '@/utils/getScrollParent'

describe('getScrollParent', () => {
  it('returns document.body when node is missing', () => {
    expect(getScrollParent(null)).toBe(document.body)
  })

  it('returns the node itself when it is scrollable', () => {
    const node = document.createElement('div')
    node.style.overflowY = 'auto'
    Object.defineProperty(node, 'scrollHeight', { value: 200 })
    Object.defineProperty(node, 'clientHeight', { value: 100 })

    expect(getScrollParent(node)).toBe(node)
  })

  it('walks up the tree until it finds a scrollable parent', () => {
    const parent = document.createElement('div')
    parent.style.overflowY = 'scroll'
    Object.defineProperty(parent, 'scrollHeight', { value: 300 })
    Object.defineProperty(parent, 'clientHeight', { value: 100 })

    const child = document.createElement('div')
    parent.appendChild(child)

    expect(getScrollParent(child)).toBe(parent)
  })

  it('falls back to document.body when no scrollable ancestor exists', () => {
    const node = document.createElement('span')
    document.body.appendChild(node)

    expect(getScrollParent(node)).toBe(document.body)

    node.remove()
  })
})
