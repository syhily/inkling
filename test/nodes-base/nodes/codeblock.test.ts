import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, type ElementNode, type LexicalEditor } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
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
      expect($isCodeBlockNode(codeBlockNode)).toBe(true)
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
            expect(codeBlockNode.code).toBe(`<?php echo 'Hello World'; ?>`)
            expect(codeBlockNode.language).toBe('php')
            expect(codeBlockNode.caption).toBe('Your first PHP enabled page')
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

        expect(parsedExport.root.children).toEqual([
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

        expect(codeBlockNode.code).toBe('<script></script>')
        expect(codeBlockNode.language).toBe('javascript')
        expect(codeBlockNode.caption).toBe('A code block')
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language: '', code: '', caption: '' })

        expect(codeBlockNode.language).toBe('')
        codeBlockNode.language = 'javascript'
        expect(codeBlockNode.language).toBe('javascript')

        expect(codeBlockNode.code).toBe('')
        codeBlockNode.code = '<script></script>'
        expect(codeBlockNode.code).toBe('<script></script>')

        expect(codeBlockNode.caption).toBe('')
        codeBlockNode.caption = 'A code block'
        expect(codeBlockNode.caption).toBe('A code block')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code, caption })
        const codeBlockNodeDataset = codeBlockNode.getDataset()

        expect(codeBlockNodeDataset).toEqual({
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

        expect(codeBlockNode.isEmpty()).toBe(false)
        codeBlockNode.code = ''
        expect(codeBlockNode.isEmpty()).toBe(true)
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        expect(CodeBlockNode.getType()).toBe('codeblock')
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

        expect(cloneDataset).toEqual({ ...codeBlockNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        expect(CodeBlockNode.urlTransformMap).toEqual({
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
        expect(codeBlockNode.hasEditMode()).toBe(true)
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

        await expectPrettifiedHtml(el.outerHTML, html` <pre><code>&lt;script&gt;&lt;/script&gt;</code></pre> `)
      }),
    )

    it(
      'renders language class if provided',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        await expectPrettifiedHtml(
          el.outerHTML,
          html` <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre> `,
        )
      }),
    )

    it(
      'renders empty span when code is undefined or empty',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ code: '' })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        expect(el.outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'renders a figure if a caption is provided',
      editorTest(async function () {
        const codeBlockNode = $createCodeBlockNode({ language, code, caption })
        const { element } = codeBlockNode.exportDOM(editor, exportOptions)
        const el = element as HTMLElement

        await expectPrettifiedHtml(
          el.outerHTML,
          html`
            <figure class="inkling-card inkling-code-card">
              <pre><code class="language-javascript">&lt;script&gt;&lt;/script&gt;</code></pre>
              <figcaption>A code block</figcaption>
            </figure>
          `,
        )
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

      expect(html).not.toContain('\u003cscript')
      expect(html).not.toContain('onerror')
      expect(html).toContain('Caption')
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

        expect(nodes.length).toBe(1)
        const codeBlock = unwrapCodeBlock(nodes)
        expect(codeBlock.code).toBe('Test code')
        expect(codeBlock.language).toBe('')
        expect(codeBlock.caption).toBe('')
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

        expect(nodes.length).toBe(1)
        expect(nodes[0].code).toBe('Test code')
        expect(nodes[0].caption).toBe('Test caption')
        expect(nodes[0].language).toBe('')
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

        expect(nodes.length).toBe(1)
        expect(nodes[0].code).toBe('Test code')
        expect(nodes[0].caption).toBe('Test caption')
        expect(nodes[0].language).toBe('js')
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

        expect(nodes.length).toBe(1)
        expect(nodes[0].code).toBe('Test code')
        expect(nodes[0].caption).toBe('Test caption')
        expect(nodes[0].language).toBe('js')
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

        expect(nodes.length).toBe(1)
        expect(nodes[0].getType()).toBe('paragraph')
        expect((nodes[0] as ElementNode).getChildren().length).toBe(1)
        expect((nodes[0] as ElementNode).getChildren()[0].getType()).toBe('linebreak')
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

        expect(nodes.length).toBe(1)
        const codeBlock = unwrapCodeBlock(nodes)
        expect(codeBlock.code).toBe('Test code')
        expect(codeBlock.language).toBe('')
        expect(codeBlock.caption).toBe('')
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

        expect(nodes.length).toBe(1)
        const codeBlock = unwrapCodeBlock(nodes)
        expect(codeBlock.code).toBe('Test code')
        expect(codeBlock.language).toBe('javascript')
        expect(codeBlock.caption).toBe('')
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

        expect(nodes.length).toBe(1)
        const codeBlock = unwrapCodeBlock(nodes)
        expect(codeBlock.code).toBe('Test code')
        expect(codeBlock.language).toBe('ruby')
        expect(codeBlock.caption).toBe('')
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createCodeBlockNode()
        expect(node.getTextContent()).toBe('')

        node.code = '<script>const test = true;</script>'
        node.caption = 'Test caption'

        expect(node.getTextContent()).toBe('<script>const test = true;</script>\nTest caption\n\n')
      }),
    )
  })
})
