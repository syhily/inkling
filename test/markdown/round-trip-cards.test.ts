import { describe, expect, it } from 'vitest'

import { lexicalStateToMarkdown, markdownToLexicalState } from '@/markdown/round-trip'

describe('Markdown round-trip for decorator cards', function () {
  it('round-trips an image card', function () {
    const markdown = '![A mountain](https://example.com/mountain.jpg)'
    const state = markdownToLexicalState(markdown)

    const root = state.root
    expect(root.children).toHaveLength(1)

    const imageNode = root.children[0] as unknown as { type: string; src: string; alt: string }
    expect(imageNode.type).toBe('image')
    expect(imageNode.src).toBe('https://example.com/mountain.jpg')
    expect(imageNode.alt).toBe('A mountain')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })
})
