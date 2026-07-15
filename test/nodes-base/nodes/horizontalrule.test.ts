import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
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
      expect($isHorizontalRuleNode(hrNode)).toBe(true)
    }),
  )

  describe('exportDOM', function () {
    it(
      'creates hr element',
      editorTest(async function () {
        const hrNode = $createHorizontalRuleNode()
        const { element } = hrNode.exportDOM(editor, exportOptions)

        await expectPrettifiedHtml((element as HTMLElement).outerHTML, html` <hr /> `)
      }),
    )

    it(
      'creates an Outlook-compatible table with hidden hr when target is email',
      editorTest(async function () {
        const hrNode = $createHorizontalRuleNode()
        const { element } = hrNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const output = (element as HTMLElement).outerHTML

        expect(output).toContain('class="inkling-card inkling-hr-card"')
        expect(output).toContain('role="presentation"')
        expect(output).toContain('class="inkling-hr"')
        // hr is kept (hidden) for html-to-plaintext conversion
        expect(output).toContain('<hr style="display: none;">')
      }),
    )

    it(
      'pins the full email output byte-for-byte',
      editorTest(async function () {
        const hrNode = $createHorizontalRuleNode()
        const { element } = hrNode.exportDOM(editor, { ...exportOptions, target: 'email' })

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <div>
              <table
                class="inkling-card inkling-hr-card"
                role="presentation"
                width="100%"
                border="0"
                cellpadding="0"
                cellspacing="0"
              >
                <tbody>
                  <tr>
                    <td>
                      <!--[if !mso]><!-- -->
                      <hr style="display: none;" />
                      <!--<![endif]-->
                      <table class="inkling-hr" role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tbody>
                          <tr>
                            <td>&nbsp;</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          `,
        )
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses an hr element',
      editorTest(async function () {
        const document = createDocument(html` <hr /> `)
        const nodes = $generateNodesFromDOM(editor, document)

        expect(nodes.length).toBe(1)
        expect(nodes[0]).toBeInstanceOf(HorizontalRuleNode)
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

        expect(json).toEqual({
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
            expect(hrNode).toBeInstanceOf(HorizontalRuleNode)

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
        expect(node.getTextContent()).toBe('---\n\n')
      }),
    )
  })

  describe('getIsVisibilityActive', function () {
    it(
      'returns false (has no visibility property)',
      editorTest(async function () {
        const node = $createHorizontalRuleNode()
        expect(node.getIsVisibilityActive()).toBe(false)
      }),
    )
  })
})
