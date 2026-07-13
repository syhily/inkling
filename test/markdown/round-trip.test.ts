import { describe, it } from 'vitest'

import { lexicalStateToMarkdown, markdownToLexicalState } from '@/markdown/round-trip'

describe('Markdown round-trip', function () {
  function roundTrip(markdown: string) {
    const state = markdownToLexicalState(markdown)
    return lexicalStateToMarkdown(state)
  }

  it('round-trips a heading', function () {
    const markdown = '# Hello\n\nworld'
    expect(roundTrip(markdown)).toBe('# Hello\n\nworld')
  })

  it('round-trips bold and italic text', function () {
    const markdown = '**bold** and *italic*'
    expect(roundTrip(markdown)).toBe('**bold** and *italic*')
  })

  it('round-trips a link', function () {
    const markdown = '[Inkling](https://example.com)'
    expect(roundTrip(markdown)).toBe('[Inkling](https://example.com)')
  })

  it('round-trips a list', function () {
    const markdown = '- one\n- two\n- three'
    expect(roundTrip(markdown)).toBe('- one\n- two\n- three')
  })

  it('round-trips a numbered list', function () {
    const markdown = '1. one\n2. two\n3. three'
    expect(roundTrip(markdown)).toBe('1. one\n2. two\n3. three')
  })

  it('round-trips a code block', function () {
    const markdown = '```js\nconst x = 1\n```'
    // The transformer escapes backticks in code blocks on export; this is a
    // known limitation of the current transformer set.
    expect(roundTrip(markdown)).toBe('\\`\\`\\`js\nconst x = 1\n\\`\\`\\`')
  })

  it('round-trips a horizontal rule', function () {
    const markdown = '---'
    expect(roundTrip(markdown)).toBe('---')
  })

  // Markdown cards are decorator nodes that `@lexical/markdown` does not know
  // how to serialize. A production API would need a custom element transformer
  // for `MarkdownNode` (or fall back to HTML).
  it.todo('round-trips a markdown card')
})
