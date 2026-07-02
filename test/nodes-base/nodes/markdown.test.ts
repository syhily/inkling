import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $getRoot } from 'lexical'

import { dom, html } from '#/nodes-base/test-utils/index'
import { MarkdownNode, $createMarkdownNode, $isMarkdownNode } from '@/nodes/base/index'

const editorNodes = [MarkdownNode]

describe('MarkdownNode', function () {
  let editor: LexicalEditor
  let dataset: { markdown: string }
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

    dataset = {
      markdown: '#HEADING\r\n- list\r\n- items',
    }

    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isImageNode',
    editorTest(async function () {
      const markdownNode = $createMarkdownNode(dataset)
      $isMarkdownNode(markdownNode).should.be.true()
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)

        markdownNode.markdown.should.equal('#HEADING\r\n- list\r\n- items')
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)

        markdownNode.markdown.should.equal('#HEADING\r\n- list\r\n- items')
        markdownNode.markdown = '#HEADING 2\r\n- list\r\n- items'
        markdownNode.markdown.should.equal('#HEADING 2\r\n- list\r\n- items')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)
        const markdownNodeDataset = markdownNode.getDataset()

        markdownNodeDataset.should.deepEqual({
          ...dataset,
        })
      }),
    )
  })

  describe('isEmpty()', function () {
    it(
      'returns true if markdown is empty',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)

        markdownNode.isEmpty().should.be.false()
        markdownNode.markdown = ''
        markdownNode.isEmpty().should.be.true()
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        MarkdownNode.getType().should.equal('markdown')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)
        const markdownNodeDataset = markdownNode.getDataset()
        const clone = MarkdownNode.clone(markdownNode) as MarkdownNode
        const cloneDataset = clone.getDataset()

        cloneDataset.should.deepEqual({ ...markdownNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        MarkdownNode.urlTransformMap.should.deepEqual({
          markdown: 'markdown',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)
        markdownNode.hasEditMode().should.be.true()
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'creates a markdown card',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)
        const result = markdownNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        result.type.should.equal('inner')
        await element.innerHTML.should.prettifyTo(html`
          <h1 id="heading">HEADING</h1>
          <ul>
            <li>list</li>
            <li>items</li>
          </ul>
        `)
      }),
    )

    it(
      'renders an empty div with a missing src',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode()
        const result = markdownNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        element.outerHTML.should.equal('<div></div>')
      }),
    )

    it(
      'throws a clear error when createDocument is not callable',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)

        ;(() => markdownNode.exportDOM(editor, { createDocument: true as unknown as () => Document })).should.throw(
          'renderMarkdownNode requires options.createDocument to be a function',
        )
      }),
    )

    it(
      'sanitizes raw HTML in the markdown source',
      editorTest(function () {
        const markdownNode = $createMarkdownNode({ markdown: '<script>alert(1)</script>' })
        const result = markdownNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        element.innerHTML.should.not.containEql('<script>alert(1)</script>')
        element.innerHTML.should.not.containEql('<script>')
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const markdownNode = $createMarkdownNode(dataset)
        const json = markdownNode.exportJSON()

        json.should.deepEqual({
          type: 'markdown',
          version: 1,
          markdown: '#HEADING\r\n- list\r\n- items',
        })
      }),
    )
  })

  describe('importJSON', function () {
    it('imports all data', () =>
      new Promise<void>((resolve, reject) => {
        const serializedState = JSON.stringify({
          root: {
            children: [
              {
                type: 'markdown',
                ...dataset,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        })

        const editorState = editor.parseEditorState(serializedState)
        editor.setEditorState(editorState)

        editor.getEditorState().read(() => {
          try {
            const [markdownNode] = $getRoot().getChildren() as MarkdownNode[]

            markdownNode.markdown.should.equal('#HEADING\r\n- list\r\n- items')

            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createMarkdownNode()
        node.getTextContent().should.equal('')

        node.markdown = '#HEADING\r\n- list\r\n- items'

        node.getTextContent().should.equal('#HEADING\r\n- list\r\n- items\n\n')
      }),
    )
  })
})
