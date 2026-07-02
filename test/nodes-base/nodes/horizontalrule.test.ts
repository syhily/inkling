import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'

import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode } from '@/nodes/base/index'

const editorNodes = [HorizontalRuleNode]

describe('HorizontalNode', function () {
  let editor: LexicalEditor
  let dataset: Record<string, unknown>
  let exportOptions: { dom: typeof dom }

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

    dataset = {}

    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isHorizontalRuleNode',
    editorTest(async function () {
      const hrNode = $createHorizontalRuleNode()
      $isHorizontalRuleNode(hrNode).should.be.true()
    }),
  )

  describe('exportDOM', function () {
    it(
      'creates hr element',
      editorTest(async function () {
        const hrNode = $createHorizontalRuleNode()
        const { element } = hrNode.exportDOM(editor, exportOptions)

        await (element as HTMLElement).outerHTML.should.prettifyTo(html` <hr /> `)
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses an hr element',
      editorTest(async function () {
        const document = createDocument(html` <hr /> `)
        const nodes = $generateNodesFromDOM(editor, document)

        nodes.length.should.equal(1)
        nodes[0].should.be.instanceof(HorizontalRuleNode)
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        dataset.cardWidth = 'wide'

        const asideNode = $createHorizontalRuleNode()
        const json = asideNode.exportJSON()

        json.should.deepEqual({
          type: 'horizontalrule',
          version: 1,
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
                type: 'horizontalrule',
              },
            ],
            type: 'root',
            version: 1,
          },
        })

        const editorState = editor.parseEditorState(serializedState)
        editor.setEditorState(editorState)

        editor.getEditorState().read(() => {
          try {
            const [hrNode] = $getRoot().getChildren()
            hrNode.should.be.instanceof(HorizontalRuleNode)

            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('getTextContent', function () {
    it(
      'returns plaintext representation',
      editorTest(async function () {
        const node = $createHorizontalRuleNode()
        node.getTextContent().should.equal('---\n\n')
      }),
    )
  })

  describe('getIsVisibilityActive', function () {
    it(
      'returns false (has no visibility property)',
      editorTest(async function () {
        const node = $createHorizontalRuleNode()
        node.getIsVisibilityActive().should.be.false()
      }),
    )
  })
})
