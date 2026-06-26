import { describe, expect, it } from 'vitest'

import { nodeProp } from '@/utils/node-helpers'

describe('nodeProp', () => {
  it('reads a property value', () => {
    const node = { src: 'image.png' }
    expect(nodeProp<string>(node, 'src')).toBe('image.png')
  })

  it('writes a property value', () => {
    const node: Record<string, unknown> = {}
    nodeProp<string>(node, 'src', 'image.png')
    expect(node.src).toBe('image.png')
  })
})
