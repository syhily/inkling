import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'

import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { CalloutNode, $createCalloutNode, $isCalloutNode } from '@/nodes/base/index'

const editorNodes = [CalloutNode]

describe('CalloutNode', function () {
  let editor: LexicalEditor
  let dataset: { calloutText: string; calloutEmoji: string; backgroundColor: string }
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
    editor = createHeadlessEditor({
      nodes: editorNodes,
    })
    dataset = {
      calloutText:
        '<p dir="ltr"><b><strong>Hello!</strong></b><span> Check </span><i><em class="italic">this</em></i> <a href="https://inkling.local" rel="noopener"><span>out</span></a><span>.</span></p>',
      calloutEmoji: '\u{1F4A1}',
      backgroundColor: 'blue',
    }

    exportOptions = {
      exportFormat: 'html',
      dom,
    }
  })

  it(
    'can match node with calloutNode',
    editorTest(async function () {
      const node = $createCalloutNode(dataset)
      $isCalloutNode(node).should.be.true()
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const node = $createCalloutNode(dataset)
        node.calloutText.should.equal(dataset.calloutText)
        node.calloutEmoji.should.equal(dataset.calloutEmoji)
        node.backgroundColor.should.equal(dataset.backgroundColor)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const node = $createCalloutNode(dataset)
        node.calloutText = 'new text'
        node.calloutText.should.equal('new text')
        node.backgroundColor = 'red'
        node.backgroundColor.should.equal('red')
        node.calloutEmoji = '\u{1F44D}'
        node.calloutEmoji.should.equal('\u{1F44D}')
      }),
    )

    it(
      'has getDataset() method',
      editorTest(async function () {
        const node = $createCalloutNode(dataset)
        const nodeDataset = node.getDataset()
        nodeDataset.should.deepEqual(dataset)
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        CalloutNode.getType().should.equal('callout')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const calloutNode = $createCalloutNode(dataset)
        const calloutNodeDataset = calloutNode.getDataset()
        const clone = CalloutNode.clone(calloutNode) as CalloutNode
        const cloneDataset = clone.getDataset()

        cloneDataset.should.deepEqual({ ...calloutNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        CalloutNode.urlTransformMap.should.deepEqual({})
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const calloutNode = $createCalloutNode(dataset)
        calloutNode.hasEditMode().should.be.true()
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const calloutNode = $createCalloutNode(dataset)
        const json = calloutNode.exportJSON()

        json.should.deepEqual({
          type: 'callout',
          version: 1,
          ...dataset,
        })
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'can render to HTML',
      editorTest(async function () {
        const node = $createCalloutNode(dataset)
        const result = node.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement
        await element.outerHTML.should.prettifyTo(html`
          <div class="inkling-card inkling-callout-card inkling-callout-card-blue">
            <div class="inkling-callout-emoji">💡</div>
            <div class="inkling-callout-text">
              <b><strong>Hello!</strong></b
              >Check<i><em class="italic">this</em></i
              ><a href="https://inkling.local" rel="noopener">out</a>.
            </div>
          </div>
        `)
      }),
    )

    it(
      'can render to HTML with no emoji',
      editorTest(async function () {
        const dataset2 = {
          calloutText:
            '<p dir="ltr"><b><strong>Hello!</strong></b><span> Check </span><i><em class="italic">this</em></i> <a href="https://inkling.local" rel="noopener"><span>out</span></a><span>.</span></p>',
          calloutEmoji: '',
          backgroundColor: 'blue',
        }
        const node = $createCalloutNode(dataset2)
        const result = node.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement
        await element.outerHTML.should.prettifyTo(html`
          <div class="inkling-card inkling-callout-card inkling-callout-card-blue">
            <div class="inkling-callout-text">
              <b><strong>Hello!</strong></b
              >Check<i><em class="italic">this</em></i
              ><a href="https://inkling.local" rel="noopener">out</a>.
            </div>
          </div>
        `)
      }),
    )

    it(
      'can render to HTML with invalid backgroundColor',
      editorTest(async function () {
        dataset.backgroundColor = 'rgba(124, 139, 154, 0.13)'

        const node = $createCalloutNode(dataset)
        const result = node.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        await element.outerHTML.should.prettifyTo(html`
          <div class="inkling-card inkling-callout-card inkling-callout-card-white">
            <div class="inkling-callout-emoji">💡</div>
            <div class="inkling-callout-text">
              <b><strong>Hello!</strong></b
              >Check<i><em class="italic">this</em></i
              ><a href="https://inkling.local" rel="noopener">out</a>.
            </div>
          </div>
        `)
      }),
    )

    it(
      'can render with inline code',
      editorTest(async function () {
        dataset.calloutText =
          '<p><span style="white-space: pre-wrap;">Does </span><code spellcheck="false" style="white-space: pre-wrap;"><span>inline code</span></code><span style="white-space: pre-wrap;"> render properly?</span></p>'

        const node = $createCalloutNode(dataset)
        const result = node.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        await element.outerHTML.should.prettifyTo(html`
          <div class="inkling-card inkling-callout-card inkling-callout-card-blue">
            <div class="inkling-callout-emoji">💡</div>
            <div class="inkling-callout-text">
              Does <code spellcheck="false" style="white-space: pre-wrap">inline code</code> render properly?
            </div>
          </div>
        `)
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses callout card',
      editorTest(async function () {
        const document = createDocument(html`
          <div class="inkling-card inkling-callout-card inkling-callout-card-red">
            <div class="inkling-callout-emoji">💡</div>
            <div class="inkling-callout-text">This is a callout</div>
          </div>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as CalloutNode[]
        nodes.length.should.equal(1)
        nodes[0].backgroundColor.should.equal('red')
        nodes[0].calloutText.should.equal('This is a callout')
        nodes[0].calloutEmoji.should.equal('\u{1F4A1}')
      }),
    )

    it(
      'parses callout card with no emoji',
      editorTest(async function () {
        const document = createDocument(html`
          <div class="inkling-card inkling-callout-card inkling-callout-card-red">
            <div class="inkling-callout-text">This is a callout</div>
          </div>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as CalloutNode[]
        nodes.length.should.equal(1)
        nodes[0].backgroundColor.should.equal('red')
        nodes[0].calloutText.should.equal('This is a callout')
        nodes[0].calloutEmoji.should.equal('')
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
                type: 'callout',
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
            const [calloutNode] = $getRoot().getChildren() as CalloutNode[]
            calloutNode.calloutText.should.equal(dataset.calloutText)
            calloutNode.calloutEmoji.should.equal(dataset.calloutEmoji)
            calloutNode.backgroundColor.should.equal(dataset.backgroundColor)
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
        const node = $createCalloutNode()
        node.getTextContent().should.equal('')

        node.calloutText = 'Test'

        node.getTextContent().should.equal('Test\n\n')
      }),
    )
  })
})
