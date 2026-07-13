import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, type ElementNode, type LexicalEditor } from 'lexical'
import should from 'should'

import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { CodeBlockNode, $createCodeBlockNode, $isCodeBlockNode } from '@/nodes/base/index'

const editorNodes = [CodeBlockNode]

function unwrapCodeBlock(nodes: unknown[]): CodeBlockNode {
  const firstNode = nodes[0] as CodeBlockNode | ElementNode
  if ((firstNode as ElementNode).getType?.() === 'paragraph') {
    return (firstNode as ElementNode).getChildren()[0] as CodeBlockNode
  }
  return firstNode as CodeBlockNode
}

describe('CodeBlockNode', function () {
  let dataset: Record<string, unknown>
  let editor: LexicalEditor
  let code: string
  let language: string
  let caption: string
  let exportOptions: Record<string, unknown>

  // NOTE: all tests should use this function, without it you need manual
  // try/catch and done handling to avoid assertion failures not triggering
  // failed tests
  const editorTest = (testFn: () => Promise<void> | void) => () =>
    new Promise<void>((resolve, reject) => {
      editor.update(() => {
        try {
          const result = testFn()
          Promise.resolve(result).then(resolve).catch(reject)
        } catch (e) {
          reject(e)
        }
      })
    })

  beforeEach(function () {
    editor = createHeadlessEditor({ nodes: editorNodes })

    code = '<script></script>'
    language = 'javascript'
    caption = 'A code block'

    dataset = {
      code,
      language,
      caption,
    }

    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isCodeBlockNode',
    editorTest(async function () {
      const codeBlockNode = $createCodeBlockNode({ language, code, caption })
      $isCodeBlockNode(codeBlockNode).should.be.true()
    }),
  )

  describe('importJSON', function () {
    it('imports all properties', () =>
      new Promise<void>((resolve, reject) => {
        const serialized = `
                {
                    "root": {
                        "children": [
                            {
                                "type": "codeblock",
                                "code": "<?php echo 'Hello World'; ?>",
                                "language": "php",
                                "caption": "Your first PHP enabled page"
                            }
                        ],
                        "direction": null,
                        "format": "",
                        "indent": 0,
                        "type": "root",
                        "version": 1
                    }
                }
            `

        const editorState = editor.parseEditorState(serialized)

        editorState.read(() => {
          try {
            const codeBlockNode = $getRoot().getChildren()[0] as CodeBlockNode
            should(codeBlockNode.code).equal(`<?php echo 'Hello World'; ?>`)
            should(codeBlockNode.language).equal('php')
            should(codeBlockNode.caption).equal('Your first PHP enabled page')
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('exportJSON', function () {
    it('exports all properties', () =>
      new Promise<void>((resolve, reject) => {
        editor.update(
          () => {
            try {
              const codeBlockNode = $createCodeBlockNode({ code, language, caption })
              $getRoot().append(codeBlockNode)
            } catch (e) {
              reject(e)
            }
          },
          { discrete: true },
        )

        const parsedExport = JSON.parse(JSON.stringify(editor.getEditorState()))

        parsedExport.root.children.should.deepEqual([
          {
            type: 'codeblock',
            version: 1,
            code: '<script></script>',
            language: 'javascript',
            caption: 'A code block',
          },
        ])
        resolve()
      }))
  })

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code, caption })

        codeBlockNode.code.should.equal('<script></script>')
        codeBlockNode.language.should.equal('javascript')
        codeBlockNode.caption.should.equal('A code block')
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language: '', code: '', caption: '' })

        codeBlockNode.language.should.equal('')
        codeBlockNode.language = 'javascript'
        codeBlockNode.language.should.equal('javascript')

        codeBlockNode.code.should.equal('')
        codeBlockNode.code = '<script></script>'
        codeBlockNode.code.should.equal('<script></script>')

        codeBlockNode.caption.should.equal('')
        codeBlockNode.caption = 'A code block'
        codeBlockNode.caption.should.equal('A code block')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code, caption })
        const codeBlockNodeDataset = codeBlockNode.getDataset()

        codeBlockNodeDataset.should.deepEqual({
          code: '<script></script>',
          language: 'javascript',
          caption: 'A code block',
        })
      }),
    )
  })

  describe('isEmpty()', function () {
    it(
      'returns true if markdown is empty',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode(dataset)

        codeBlockNode.isEmpty().should.be.false()
        codeBlockNode.code = ''
        codeBlockNode.isEmpty().should.be.true()
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        CodeBlockNode.getType().should.equal('codeblock')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode(dataset)
        const codeBlockNodeDataset = codeBlockNode.getDataset()
        const clone = CodeBlockNode.clone(codeBlockNode) as CodeBlockNode
        const cloneDataset = clone.getDataset()

        cloneDataset.should.deepEqual({ ...codeBlockNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        CodeBlockNode.urlTransformMap.should.deepEqual({
          caption: 'html',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode(dataset)
        codeBlockNode.hasEditMode().should.be.true()
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'renders and escapes',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ code })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        await el.outerHTML.should.prettifyTo(html` <pre><code>&lt;script&gt;&lt;/script&gt;</code></pre> `)
      }),
    )

    it(
      'renders language class if provided',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        await el.outerHTML.should.prettifyTo(html`
          <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
        `)
      }),
    )

    it(
      'renders empty span when code is undefined or empty',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ code: '' })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        el.outerHTML.should.equal('<span></span>')
      }),
    )

    it(
      'renders a figure if a caption is provided',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code, caption })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        await el.outerHTML.should.prettifyTo(html`
          <figure class="inkling-card inkling-code-card">
            <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
            <figcaption>A code block</figcaption>
          </figure>
        `)
      }),
    )
  })

  it(
    'sanitizes caption HTML',
    editorTest(async function () {
      const codeBlockNode = $createCodeBlockNode({
        language,
        code,
        caption: 'Caption \u003cscript\u003ealert(1)\u003c/script\u003e \u003cimg src=x onerror=alert(1)\u003e',
      })
      const { element } = codeBlockNode.exportDOM(editor, exportOptions)
      const html = (element as HTMLElement).outerHTML

      html.should.not.containEql('\u003cscript')
      html.should.not.containEql('onerror')
      html.should.containEql('Caption')
    }),
  )

  describe('importDOM', function () {
    it(
      'parses PRE>CODE inside FIGURE into code card',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre><code>Test code</code></pre>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document)

        nodes.length.should.equal(1)
        const codeBlock = unwrapCodeBlock(nodes)
        codeBlock.code.should.equal('Test code')
        codeBlock.language.should.equal('')
        codeBlock.caption.should.equal('')
      }),
    )

    it(
      'parses PRE>CODE inside FIGURE with FIGCAPTION into code card',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre><code>Test code</code></pre>
            <figcaption>Test caption</figcaption>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[]

        nodes.length.should.equal(1)
        nodes[0].code.should.equal('Test code')
        nodes[0].caption.should.equal('Test caption')
        nodes[0].language.should.equal('')
      }),
    )

    it(
      'extracts language from pre class name for FIGURE>PRE>CODE',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre class="language-js"><code>Test code</code></pre>
            <figcaption>Test caption</figcaption>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[]

        nodes.length.should.equal(1)
        nodes[0].code.should.equal('Test code')
        nodes[0].caption.should.equal('Test caption')
        nodes[0].language.should.equal('js')
      }),
    )

    it(
      'extracts language from code class name for FIGURE>PRE>CODE',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre><code class="language-js">Test code</code></pre>
            <figcaption>Test caption</figcaption>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as CodeBlockNode[]

        nodes.length.should.equal(1)
        nodes[0].code.should.equal('Test code')
        nodes[0].caption.should.equal('Test caption')
        nodes[0].language.should.equal('js')
      }),
    )

    it(
      'correctly skips if there is no pre tag',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <div><span class="nothing-to-see-here"></span></div>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document)

        nodes.length.should.equal(1)
        nodes[0].getType().should.equal('paragraph')
        ;(nodes[0] as ElementNode).getChildren().length.should.equal(1)
        ;(nodes[0] as ElementNode).getChildren()[0].getType().should.equal('linebreak')
      }),
    )

    it(
      'parses PRE>CODE into code card',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre><code>Test code</code></pre>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document)

        nodes.length.should.equal(1)
        const codeBlock = unwrapCodeBlock(nodes)
        codeBlock.code.should.equal('Test code')
        codeBlock.language.should.equal('')
        codeBlock.caption.should.equal('')
      }),
    )

    it(
      'extracts language from pre class name for PRE>CODE',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre class="language-javascript"><code>Test code</code></pre>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document)

        nodes.length.should.equal(1)
        const codeBlock = unwrapCodeBlock(nodes)
        codeBlock.code.should.equal('Test code')
        codeBlock.language.should.equal('javascript')
        codeBlock.caption.should.equal('')
      }),
    )

    it(
      'extracts language from code class name for PRE>CODE',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <pre><code class="language-ruby">Test code</code></pre>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document)

        nodes.length.should.equal(1)
        const codeBlock = unwrapCodeBlock(nodes)
        codeBlock.code.should.equal('Test code')
        codeBlock.language.should.equal('ruby')
        codeBlock.caption.should.equal('')
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createCodeBlockNode()
        node.getTextContent().should.equal('')

        node.code = '<script>const test = true;</script>'
        node.caption = 'Test caption'

        node.getTextContent().should.equal('<script>const test = true;</script>\nTest caption\n\n')
      }),
    )
  })
})
