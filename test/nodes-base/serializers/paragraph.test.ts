import type { ElementNode, HTMLConfig, LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import should from 'should'

import { createDocument } from '#/nodes-base/test-utils/index'
import { DEFAULT_CONFIG, DEFAULT_NODES } from '@/nodes/base/index'

describe('Serializers: paragraph', function () {
  let editor: LexicalEditor

  const editorTest = (testFn: () => void) => () =>
    new Promise<void>((resolve, reject) => {
      editor.update(() => {
        try {
          testFn()
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

  beforeEach(function () {
    editor = createHeadlessEditor({ nodes: DEFAULT_NODES, html: DEFAULT_CONFIG.html as HTMLConfig })
  })

  describe('import', function () {
    it(
      '(non GDoc) keeps empty paragraphs',
      editorTest(function () {
        const htmlString = '<p>Hello World</p><p></p><p>After</p>'
        const document = createDocument(htmlString)
        const nodes = $generateNodesFromDOM(editor, document)

        should.equal(nodes.length, 3)
        should.equal(nodes[0].getType(), 'paragraph')
        should.equal(nodes[1].getType(), 'paragraph')
        should.equal(nodes[2].getType(), 'paragraph')
      }),
    )

    it(
      '(GDoc) removes empty paragraphs',
      editorTest(function () {
        const htmlString = '<div id="docs-internal-guid-1234"><p>Hello World</p><p></p><p>After</p></div>'
        const document = createDocument(htmlString)
        const nodes = $generateNodesFromDOM(editor, document)

        should.equal(nodes.length, 2)
        should.equal(nodes[0].getType(), 'paragraph')
        should.equal(nodes[1].getType(), 'paragraph')
      }),
    )

    it(
      '(non GDoc) keeps empty paragraphs around dividers',
      editorTest(function () {
        const htmlString = '<p>Hello World</p><p><hr></p><p>After</p>'
        const document = createDocument(htmlString)
        const nodes = $generateNodesFromDOM(editor, document)

        should.equal(nodes.length, 5)
        should.equal(nodes[0].getType(), 'paragraph')
        should.equal(nodes[1].getType(), 'paragraph')
        should.equal(nodes[2].getType(), 'horizontalrule')
        should.equal(nodes[3].getType(), 'paragraph')
        should.equal(nodes[4].getType(), 'paragraph')
      }),
    )

    it(
      '(GDoc) removes empty paragraphs around dividers',
      editorTest(function () {
        const htmlString = '<div id="docs-internal-guid-1234"><p>Hello World</p><p><hr></p><p>After</p></div>'
        const document = createDocument(htmlString)
        const nodes = $generateNodesFromDOM(editor, document)

        should.equal(nodes.length, 3)
        should.equal(nodes[0].getType(), 'paragraph')
        should.equal(nodes[1].getType(), 'paragraph')
        should.equal((nodes[1] as ElementNode).getChildren().length, 1)
        should.equal((nodes[1] as ElementNode).getChildren()[0].getType(), 'horizontalrule')
        should.equal(nodes[2].getType(), 'paragraph')
      }),
    )
  })
})
