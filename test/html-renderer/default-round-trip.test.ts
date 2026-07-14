import type { SerializedParagraphNode } from 'lexical'

import { HeadingNode } from '@lexical/rich-text'
import { JSDOM } from 'jsdom'
import { ParagraphNode } from 'lexical'

import { htmlToLexical } from '@/html/html-to-lexical/index'
import { LexicalHTMLRenderer as Renderer } from '@/html/renderer/index'

const dom = new JSDOM()

class CustomBlockNode extends ParagraphNode {
  static getType() {
    return 'custom-block'
  }

  static clone(_node: CustomBlockNode) {
    return new CustomBlockNode()
  }

  static importJSON(_serializedNode: SerializedParagraphNode) {
    return new CustomBlockNode()
  }
}

describe('default import-to-render round trip', function () {
  it('renders <h1> importer output with a default renderer', async function () {
    const onError = vi.fn()
    const state = htmlToLexical('<h1>Hello</h1>')

    const renderer = new Renderer({ dom, onError })
    const html = await renderer.render(state)

    expect(onError).not.toHaveBeenCalled()
    expect(html).toMatch(/<h1[^>]*>Hello<\/h1>/)
  })

  it('round-trips basic formatting (bold, line break, link)', async function () {
    const state = htmlToLexical('<p>Hello <strong>world</strong><br><a href="https://example.com">link</a></p>')

    const html = await new Renderer({ dom }).render(state)

    expect(html).toContain('<strong>world</strong>')
    expect(html).toContain('<br>')
    expect(html).toContain('<a href="https://example.com">link</a>')
  })

  it('round-trips an image card produced by the default importer', async function () {
    const state = htmlToLexical('<img src="https://example.com/image.png">')

    const html = await new Renderer({ dom }).render(state)

    expect(html).toContain('inkling-image-card')
    expect(html).toContain('src="https://example.com/image.png"')
  })

  it('keeps renderer constructor nodes additive to the defaults', async function () {
    const state = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Custom block","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"custom-block","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Plain paragraph","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`

    const renderer = new Renderer({ dom, nodes: [CustomBlockNode] })
    const html = await renderer.render(state)

    expect(html).toContain('Custom block')
    expect(html).toContain('<p>Plain paragraph</p>')
  })

  it('lets an explicit editorConfig.nodes importer override win', function () {
    const state = htmlToLexical('<h1>Hello</h1>', {
      editorConfig: {
        nodes: [HeadingNode],
        onError(e: Error) {
          throw e
        },
      },
    })

    expect(state.root.children[0].type).toBe('heading')
  })
})
