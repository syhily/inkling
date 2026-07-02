import { markdownToLexicalState, lexicalStateToMarkdown } from '@/markdown/spike'

describe('Markdown round-trip spike', function () {
  function roundTrip(markdown: string) {
    const state = markdownToLexicalState(markdown)
    return lexicalStateToMarkdown(state)
  }

  it('round-trips a heading', function () {
    const markdown = '# Hello\n\nworld'
    roundTrip(markdown).should.equal('# Hello\n\nworld')
  })

  it('round-trips bold and italic text', function () {
    const markdown = '**bold** and *italic*'
    roundTrip(markdown).should.equal('**bold** and *italic*')
  })

  it('round-trips a link', function () {
    const markdown = '[Inkling](https://example.com)'
    roundTrip(markdown).should.equal('[Inkling](https://example.com)')
  })

  it('round-trips a list', function () {
    const markdown = '- one\n- two\n- three'
    roundTrip(markdown).should.equal('- one\n- two\n- three')
  })

  it('round-trips a numbered list', function () {
    const markdown = '1. one\n2. two\n3. three'
    roundTrip(markdown).should.equal('1. one\n2. two\n3. three')
  })

  // Markdown cards are decorator nodes that `@lexical/markdown` does not know
  // how to serialize. A production API would need a custom element transformer
  // for `MarkdownNode` (or fall back to HTML).
  it.todo('round-trips a markdown card')
})
