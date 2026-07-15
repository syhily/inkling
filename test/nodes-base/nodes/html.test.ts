import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, type LexicalEditor } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { HtmlNode, $createHtmlNode, $isHtmlNode, type ExportDOMOptions, utils } from '@/nodes/base/index'

const editorNodes = [HtmlNode]
const { ALL_MEMBERS_SEGMENT, NO_MEMBERS_SEGMENT } = utils.visibility

describe('HtmlNode', function () {
  let editor: LexicalEditor
  let dataset: Record<string, unknown>
  let exportOptions: ExportDOMOptions

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
      onError: (e: Error) => {
        throw e
      },
    })

    dataset = {
      html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
    }

    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isImageNode',
    editorTest(async function () {
      const htmlNode = $createHtmlNode(dataset)
      expect($isHtmlNode(htmlNode)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)

        expect(htmlNode.html).toBe('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>')
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)

        expect(htmlNode.html).toBe('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>')
        htmlNode.html = '<p>Paragraph 1</p><p>Paragraph 2</p>'
        expect(htmlNode.html).toBe('<p>Paragraph 1</p><p>Paragraph 2</p>')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)
        const htmlNodeDataset = htmlNode.getDataset()

        expect(htmlNodeDataset).toEqual({
          ...dataset,
          visibility: {
            web: {
              nonMember: true,
              memberSegment: 'status:free,status:-free',
            },
            email: {
              memberSegment: 'status:free,status:-free',
            },
          },
        })
      }),
    )

    it(
      'has isEmpty() convenience method',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)

        expect(htmlNode.isEmpty()).toBe(false)
        htmlNode.html = ''
        expect(htmlNode.isEmpty()).toBe(true)
      }),
    )
  })

  describe('isEmpty()', function () {
    it(
      'returns true if markdown is empty',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)

        expect(htmlNode.isEmpty()).toBe(false)
        htmlNode.html = ''
        expect(htmlNode.isEmpty()).toBe(true)
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        expect(HtmlNode.getType()).toBe('html')
      }),
    )
  })

  describe('getPropertyDefaults', function () {
    it(
      'returns the correct default values',
      editorTest(async function () {
        const defaults = HtmlNode.getPropertyDefaults()

        expect(defaults).toEqual({
          html: '',
          visibility: {
            web: {
              nonMember: true,
              memberSegment: 'status:free,status:-free',
            },
            email: {
              memberSegment: 'status:free,status:-free',
            },
          },
        })
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)
        const htmlNodeDataset = htmlNode.getDataset()
        const clone = HtmlNode.clone(htmlNode) as HtmlNode
        const cloneDataset = clone.getDataset()

        expect(cloneDataset).toEqual({ ...htmlNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        expect(HtmlNode.urlTransformMap).toEqual({
          html: 'html',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)
        expect(htmlNode.hasEditMode()).toBe(true)
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'creates a html card',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)
        const result = htmlNode.exportDOM(editor, exportOptions)
        expect(result.type).toBe('value')
        const element = result.element as HTMLTextAreaElement
        await expectPrettifiedHtml(
          element.value,
          html`
            <!--inkling-card-begin: html-->
            <p>Paragraph with:</p>
            <ul>
              <li>list</li>
              <li>items</li>
            </ul>
            <!--inkling-card-end: html-->
          `,
        )
      }),
    )

    it(
      'renders an empty span with missing html',
      editorTest(async function () {
        const htmlNode = $createHtmlNode()
        const result = htmlNode.exportDOM(editor, exportOptions)
        expect(result.type).toBe('inner')
        const element = result.element as HTMLElement

        expect(element.outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'renders unclosed tags',
      editorTest(async function () {
        const htmlNode = $createHtmlNode({ html: '<div style="color:red">' })
        const result = htmlNode.exportDOM(editor, exportOptions)
        expect(result.type).toBe('value')
        const element = result.element as HTMLTextAreaElement

        // do not prettify, it will add a closing tag to the compared string causing a false pass
        expect(element.value).toBe(
          '\n<!--inkling-card-begin: html-->\n<div style="color:red">\n<!--inkling-card-end: html-->\n',
        )
      }),
    )

    it(
      'renders html entities',
      editorTest(async function () {
        const htmlNode = $createHtmlNode({ html: '<p>&lt;pre&gt;Test&lt;/pre&gt;</p>' })
        const result = htmlNode.exportDOM(editor, exportOptions)
        expect(result.type).toBe('value')
        const element = result.element as HTMLTextAreaElement

        expect(element.value).toBe(
          '\n<!--inkling-card-begin: html-->\n<p>&lt;pre&gt;Test&lt;/pre&gt;</p>\n<!--inkling-card-end: html-->\n',
        )
      }),
    )

    it(
      'handles single-quote attributes',
      editorTest(async function () {
        const htmlNode = $createHtmlNode({
          html: '<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>',
        })
        const result = htmlNode.exportDOM(editor, exportOptions)
        expect(result.type).toBe('value')
        const element = result.element as HTMLTextAreaElement

        expect(element.value).toBe(
          '\n<!--inkling-card-begin: html-->\n<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>\n<!--inkling-card-end: html-->\n',
        )
      }),
    )

    it(
      'wraps uniqueid replacement strings when emailUniqueid feature is enabled',
      editorTest(async function () {
        const htmlNode = $createHtmlNode({
          html: '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">',
        })
        const result = htmlNode.exportDOM(editor, { ...exportOptions, feature: { emailUniqueid: true } })
        expect(result.type).toBe('value')
        const element = result.element as HTMLTextAreaElement

        expect(element.value).toBe(
          '\n<!--inkling-card-begin: html-->\n<img src="https://ads.example.com/banner.jpg?id=%%{uniqueid}%%" alt="Ad">\n<!--inkling-card-end: html-->\n',
        )
      }),
    )

    it(
      'does not wrap uniqueid replacement strings when emailUniqueid feature is disabled',
      editorTest(async function () {
        const htmlNode = $createHtmlNode({
          html: '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">',
        })
        const result = htmlNode.exportDOM(editor, { ...exportOptions, feature: { emailUniqueid: false } })
        expect(result.type).toBe('value')
        const element = result.element as HTMLTextAreaElement

        expect(element.value).toBe(
          '\n<!--inkling-card-begin: html-->\n<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">\n<!--inkling-card-end: html-->\n',
        )
      }),
    )

    describe('visibility rendering', function () {
      describe('with old visibility settings', function () {
        function testWebRender(visibility: Record<string, unknown>) {
          const htmlNode = $createHtmlNode({ html: '<div>Test</div>', visibility })
          const result = htmlNode.exportDOM(editor, exportOptions)
          expect(result.type).toBe('value')
          const element = result.element as HTMLTextAreaElement
          expect(element.value).toBe(
            '\n<!--inkling-card-begin: html-->\n<div>Test</div>\n<!--inkling-card-end: html-->\n',
          )
        }

        function testEmailRender(visibility: Record<string, unknown>) {
          const htmlNode = $createHtmlNode({ html: '<div>Test</div>', visibility })
          const result = htmlNode.exportDOM(editor, { ...exportOptions, target: 'email' })
          const expectedContents = '<!--inkling-card-begin: html-->\n<div>Test</div>\n<!--inkling-card-end: html-->'

          if (visibility.segment) {
            expect(result.type).toBe('html')
            const element = result.element as HTMLElement
            expect(element.outerHTML).toBe(`<div data-gh-segment="${visibility.segment}">\n${expectedContents}\n</div>`)
          } else {
            expect(result.type).toBe('value')
            const element = result.element as HTMLTextAreaElement
            expect(element.value).toBe(`\n${expectedContents}\n`)
          }
        }

        function testBlankRender(visibility: Record<string, unknown>, target: string) {
          const htmlNode = $createHtmlNode({ html: '<div>Test</div>', visibility })
          const result = htmlNode.exportDOM(editor, { ...exportOptions, target })
          expect(result.type).toBe('inner')
          const element = result.element as HTMLElement
          expect(element.innerHTML).toBe('')
        }

        it(
          'renders on web but not email if showOnWeb is true and showOnEmail is false',
          editorTest(async function () {
            const visibility = { showOnEmail: false, showOnWeb: true, segment: '' }
            testWebRender(visibility)
            testBlankRender(visibility, 'email')
          }),
        )

        it(
          'renders on email and not web if showOnEmail is true and showOnWeb is false',
          editorTest(async function () {
            const visibility = { showOnEmail: true, showOnWeb: false, segment: '' }
            testEmailRender(visibility)
            testBlankRender(visibility, 'web')
          }),
        )

        it(
          'renders both on web and email if showOnEmail and showOnWeb are true',
          editorTest(async function () {
            const visibility = { showOnEmail: true, showOnWeb: true, segment: '' }
            testWebRender(visibility)
            testEmailRender(visibility)
          }),
        )
      })

      describe('with new visibility settings', function () {
        function testWebRender(visibility: Record<string, unknown>, expectedGateParams?: string | null) {
          const htmlNode = $createHtmlNode({ html: '<div>Test</div>', visibility })
          const result = htmlNode.exportDOM(editor, exportOptions)
          expect(result.type).toBe('value')
          const element = result.element as HTMLTextAreaElement
          const baseExpectedContents =
            '\n<!--inkling-card-begin: html-->\n<div>Test</div>\n<!--inkling-card-end: html-->\n'
          expect(element.value).toBe(
            expectedGateParams
              ? `\n<!--inkling-gated-block:begin ${expectedGateParams} -->${baseExpectedContents}<!--inkling-gated-block:end-->\n`
              : baseExpectedContents,
          )
        }

        function testEmailRender(visibility: Record<string, unknown>, expectedSegment: string) {
          const htmlNode = $createHtmlNode({ html: '<div>Test</div>', visibility })
          const result = htmlNode.exportDOM(editor, { ...exportOptions, target: 'email' })
          const expectedContents = '<!--inkling-card-begin: html-->\n<div>Test</div>\n<!--inkling-card-end: html-->'

          if (!expectedSegment) {
            expect(result.type).toBe('value')
            const element = result.element as HTMLTextAreaElement
            expect(element.value).toBe(`\n${expectedContents}\n`)
          } else {
            expect(result.type).toBe('outer')
            const element = result.element as HTMLElement
            expect(element.outerHTML).toBe(
              `<div data-gh-segment="${expectedSegment}" class="inkling-visibility-wrapper">\n${expectedContents}\n</div>`,
            )
          }
        }

        function testBlankRender(visibility: Record<string, unknown>, target: string) {
          const htmlNode = $createHtmlNode({ html: '<div>Test</div>', visibility })
          const result = htmlNode.exportDOM(editor, { ...exportOptions, target })
          expect(result.type).toBe('inner')
          const element = result.element as HTMLElement
          expect(element.innerHTML).toBe('')
        }

        it(
          'web: excludes gated wrapper when shown to everyone',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
              email: { memberSegment: ALL_MEMBERS_SEGMENT },
            }
            testWebRender(visibility, null)
          }),
        )

        it(
          'web: includes gated wrapper with member-only params',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT },
              email: { memberSegment: ALL_MEMBERS_SEGMENT },
            }
            testWebRender(visibility, 'nonMember:false memberSegment:"status:free,status:-free"')
          }),
        )

        it(
          'web: includes gated wrapper with anonymous-only params',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: true, memberSegment: '' },
              email: { memberSegment: ALL_MEMBERS_SEGMENT },
            }
            testWebRender(visibility, 'nonMember:true memberSegment:""')
          }),
        )

        it(
          'email: excludes content when hidden from all members',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: true, memberSegment: NO_MEMBERS_SEGMENT },
              email: { memberSegment: '' },
            }
            testBlankRender(visibility, 'email')
          }),
        )

        it(
          'email: skips segment wrapper when sent to all members',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
              email: { memberSegment: ALL_MEMBERS_SEGMENT },
            }
            testWebRender(visibility)
            testEmailRender(visibility, '')
          }),
        )

        it(
          'email: includes content with member segment wrapper',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
              email: { memberSegment: 'status:free' },
            }
            testEmailRender(visibility, 'status:free')
          }),
        )

        it(
          'handles web-only (everyone)',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
              email: { memberSegment: NO_MEMBERS_SEGMENT },
            }
            testWebRender(visibility)
            testBlankRender(visibility, 'email')
          }),
        )

        it(
          'handles web-only (members-only)',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT },
              email: { memberSegment: NO_MEMBERS_SEGMENT },
            }
            testWebRender(visibility, 'nonMember:false memberSegment:"status:free,status:-free"')
            testBlankRender(visibility, 'email')
          }),
        )

        it(
          'handles email-only (free members)',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: false, memberSegment: NO_MEMBERS_SEGMENT },
              email: { memberSegment: 'status:free' },
            }
            testBlankRender(visibility, 'web')
            testEmailRender(visibility, 'status:free')
          }),
        )

        it(
          'handles visibility for no-one',
          editorTest(async function () {
            const visibility = {
              web: { nonMember: false, memberSegment: NO_MEMBERS_SEGMENT },
              email: { memberSegment: NO_MEMBERS_SEGMENT },
            }
            testBlankRender(visibility, 'web')
            testBlankRender(visibility, 'email')
          }),
        )
      })
    })
  })

  describe('importDOM', function () {
    it(
      'parses a html node',
      editorTest(async function () {
        const document = createDocument(html`
          <span
            ><!--inkling-card-begin: html-->
            <p>here's html</p>
            <!--inkling-card-end: html--></span
          >
        `)
        const nodes = $generateNodesFromDOM(editor, document)
        expect(nodes.length).toBe(1)
        expect(nodes[0]).toBeInstanceOf(HtmlNode)
      }),
    )

    it(
      'removes the html end comment from the DOM after parsing',
      editorTest(async function () {
        const document = createDocument(html`
          <span
            ><!--inkling-card-begin: html-->
            <p>here's html</p>
            <!--inkling-card-end: html--></span
          >
        `)

        $generateNodesFromDOM(editor, document)

        const hasEndComment = Array.from(document.querySelector('span')?.childNodes || []).some((node) => {
          return node.nodeType === 8 && node.nodeValue?.trim() === 'inkling-card-end: html'
        })

        expect(hasEndComment).toBe(false)
      }),
    )

    it(
      'does not consume sibling nodes when the html end comment is missing',
      editorTest(async function () {
        const document = createDocument(html`
          <span
            ><!--inkling-card-begin: html-->
            <p>here's html</p>
            <div>keep me</div></span
          >
        `)

        const nodes = $generateNodesFromDOM(editor, document) as HtmlNode[]
        const htmlNodes = nodes.filter((node) => node instanceof HtmlNode)

        expect(htmlNodes.length).toBe(1)
        expect(htmlNodes[0].html).toBe('')
        expect(document.querySelector('p')?.outerHTML).toBe("<p>here's html</p>")
        expect(document.querySelector('div')?.outerHTML).toBe('<div>keep me</div>')
      }),
    )

    it(
      'parses html table',
      editorTest(async function () {
        const document = createDocument(html`
          <table style="float:right">
            <tr>
              <th>Month</th>
              <th>Savings</th>
            </tr>
            <tr>
              <td>January</td>
              <td>$100</td>
            </tr>
            <tr>
              <td>February</td>
              <td>$80</td>
            </tr>
          </table>
        `)
        const nodes = $generateNodesFromDOM(editor, document)
        expect(nodes.length).toBe(1)
        expect(nodes[0]).toBeInstanceOf(HtmlNode)
      }),
    )

    it(
      'parses table nested in another table',
      editorTest(async function () {
        const document = createDocument(html`
          <table id="table1">
            <tr>
              <th>title1</th>
              <th>title2</th>
              <th>title3</th>
            </tr>
            <tr>
              <td id="nested">
                <table id="table2">
                  <tr>
                    <td>cell1</td>
                    <td>cell2</td>
                    <td>cell3</td>
                  </tr>
                </table>
              </td>
              <td>cell2</td>
              <td>cell3</td>
            </tr>
            <tr>
              <td>cell4</td>
              <td>cell5</td>
              <td>cell6</td>
            </tr>
          </table>
        `)
        const nodes = $generateNodesFromDOM(editor, document)
        expect(nodes.length).toBe(1)
        expect(nodes[0]).toBeInstanceOf(HtmlNode)
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const htmlNode = $createHtmlNode(dataset)
        const json = htmlNode.exportJSON()

        expect(json).toEqual({
          type: 'html',
          version: 1,
          html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
          visibility: {
            web: {
              nonMember: true,
              memberSegment: 'status:free,status:-free',
            },
            email: {
              memberSegment: 'status:free,status:-free',
            },
          },
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
                type: 'html',
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
            const [htmlNode] = $getRoot().getChildren() as HtmlNode[]

            expect(htmlNode.html).toBe('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>')

            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))

    it('updates old visibility format to new format', () =>
      new Promise<void>((resolve, reject) => {
        const serializedState = JSON.stringify({
          root: {
            children: [
              {
                type: 'html',
                html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
                visibility: {
                  showOnEmail: true,
                  showOnWeb: true,
                },
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
            const [htmlNode] = $getRoot().getChildren() as HtmlNode[]

            expect(htmlNode.visibility as Record<string, unknown>).toEqual({
              showOnWeb: true,
              showOnEmail: true,
              web: {
                nonMember: true,
                memberSegment: 'status:free,status:-free',
              },
              email: {
                memberSegment: 'status:free,status:-free',
              },
            })

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
        const node = $createHtmlNode()
        expect(node.getTextContent()).toBe('')

        node.html = '<script>const test = true;</script>'

        expect(node.getTextContent()).toBe('<script>const test = true;</script>\n\n')
      }),
    )
  })

  describe('getIsVisibilityActive', function () {
    function testIsVisibilityActive(expected: boolean, visibility: Record<string, unknown>) {
      const node = $createHtmlNode()
      node.visibility = visibility
      expect(node.getIsVisibilityActive()).toBe(expected)
    }

    describe('with old visibility format', function () {
      it(
        'returns false when both showOnEmail and showOnWeb are true and segment is blank',
        editorTest(async function () {
          testIsVisibilityActive(false, { showOnEmail: true, showOnWeb: true, segment: '' })
        }),
      )

      it(
        'returns true when showOnEmail is false',
        editorTest(async function () {
          testIsVisibilityActive(true, { showOnEmail: false, showOnWeb: true, segment: '' })
        }),
      )

      it(
        'returns true when showOnWeb is false',
        editorTest(async function () {
          testIsVisibilityActive(true, { showOnEmail: true, showOnWeb: false, segment: '' })
        }),
      )

      it(
        'returns true when segment is not empty',
        editorTest(async function () {
          testIsVisibilityActive(true, { showOnEmail: true, showOnWeb: true, segment: 'status:-free' })
        }),
      )
    })

    describe('with new visibility format', function () {
      it(
        'returns false when shown to everyone',
        editorTest(async function () {
          testIsVisibilityActive(false, {
            web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
            email: { memberSegment: ALL_MEMBERS_SEGMENT },
          })
        }),
      )

      it(
        'returns true when hidden on web for non-members',
        editorTest(async function () {
          testIsVisibilityActive(true, {
            web: { nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT },
            email: { memberSegment: ALL_MEMBERS_SEGMENT },
          })
        }),
      )

      it(
        'returns true when hidden on web for members',
        editorTest(async function () {
          testIsVisibilityActive(true, {
            web: { nonMember: true, memberSegment: 'status:free' },
            email: { memberSegment: ALL_MEMBERS_SEGMENT },
          })
        }),
      )

      it(
        'returns true when hidden on email for all members',
        editorTest(async function () {
          testIsVisibilityActive(true, {
            web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
            email: { memberSegment: '' },
          })
        }),
      )

      it(
        'returns true when hidden on email for some members',
        editorTest(async function () {
          testIsVisibilityActive(true, {
            web: { nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT },
            email: { memberSegment: 'status:free' },
          })
        }),
      )
    })
  })
})
