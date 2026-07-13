import { describe, expect, it } from 'vitest'

import { lexicalStateToMarkdown, markdownToLexicalState } from '@/markdown/round-trip'

function inklingCard(card: string, data: Record<string, unknown>) {
  return '```inkling:' + card + '\n' + JSON.stringify(data) + '\n```'
}

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

  it('round-trips an html card', function () {
    const markdown = inklingCard('html', { html: '<iframe src="https://example.com"></iframe>' })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as { type: string; html: string }
    expect(node.type).toBe('html')
    expect(node.html).toBe('<iframe src="https://example.com"></iframe>')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a file card', function () {
    const markdown = inklingCard('file', {
      src: 'https://example.com/report.pdf',
      fileName: 'report.pdf',
      fileCaption: 'Q3 report',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      src: string
      fileName: string
      fileCaption: string
    }
    expect(node.type).toBe('file')
    expect(node.src).toBe('https://example.com/report.pdf')
    expect(node.fileName).toBe('report.pdf')
    expect(node.fileCaption).toBe('Q3 report')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a button card', function () {
    const markdown = inklingCard('button', {
      buttonUrl: 'https://example.com',
      buttonText: 'Click me',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      buttonUrl: string
      buttonText: string
    }
    expect(node.type).toBe('button')
    expect(node.buttonUrl).toBe('https://example.com')
    expect(node.buttonText).toBe('Click me')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips an audio card', function () {
    const markdown = inklingCard('audio', {
      src: 'https://example.com/audio.mp3',
      caption: 'Podcast episode',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      src: string
      title: string
    }
    expect(node.type).toBe('audio')
    expect(node.src).toBe('https://example.com/audio.mp3')
    expect(node.title).toBe('Podcast episode')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a video card', function () {
    const markdown = inklingCard('video', {
      src: 'https://example.com/video.mp4',
      caption: 'Demo video',
      thumbnailSrc: 'https://example.com/thumb.jpg',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      src: string
      caption: string
      thumbnailSrc: string
    }
    expect(node.type).toBe('video')
    expect(node.src).toBe('https://example.com/video.mp4')
    expect(node.caption).toContain('Demo video')
    expect(node.thumbnailSrc).toBe('https://example.com/thumb.jpg')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a gallery card', function () {
    const markdown = inklingCard('gallery', {
      images: [{ src: 'https://example.com/a.jpg' }, { src: 'https://example.com/b.jpg' }],
      caption: 'Two photos',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      images: Array<{ src: string }>
      caption: string
    }
    expect(node.type).toBe('gallery')
    expect(node.images).toHaveLength(2)
    expect(node.images[0].src).toBe('https://example.com/a.jpg')
    expect(node.images[1].src).toBe('https://example.com/b.jpg')
    expect(node.caption).toContain('Two photos')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a bookmark card', function () {
    const markdown = inklingCard('bookmark', {
      url: 'https://example.com',
      title: 'Example',
      description: 'An example site',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      url: string
      metadata: { title: string; description: string }
    }
    expect(node.type).toBe('bookmark')
    expect(node.url).toBe('https://example.com')
    expect(node.metadata.title).toBe('Example')
    expect(node.metadata.description).toBe('An example site')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a toggle card', function () {
    const markdown = inklingCard('toggle', {
      heading: 'Summary',
      content: 'Hidden details',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      heading: string
      content: string
    }
    expect(node.type).toBe('toggle')
    expect(node.heading).toContain('Summary')
    expect(node.content).toContain('Hidden details')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })

  it('round-trips a callout card', function () {
    const markdown = inklingCard('callout', {
      text: 'Important note',
      backgroundColor: 'green',
    })
    const state = markdownToLexicalState(markdown)

    const node = state.root.children[0] as unknown as {
      type: string
      calloutText: string
      backgroundColor: string
    }
    expect(node.type).toBe('callout')
    expect(node.calloutText).toContain('Important note')
    expect(node.backgroundColor).toBe('green')

    const exported = lexicalStateToMarkdown(state)
    expect(exported.trim()).toBe(markdown)
  })
})
