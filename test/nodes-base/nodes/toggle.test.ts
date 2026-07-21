import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { BaseToggleNode, $createBaseToggleNode, $isToggleNode } from '@/nodes/base/index'

const editorNodes = [BaseToggleNode]

describe('BaseToggleNode', function () {
  let editor: LexicalEditor
  let dataset: { heading: string; content: string }
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
      heading: 'Toggle Heading',
      content: 'Collapsible content',
    }

    exportOptions = {
      exportFormat: 'html',
      dom,
    }
  })

  it(
    'matches node with $isToggleNode',
    editorTest(async function () {
      const toggleNode = $createBaseToggleNode(dataset)
      expect($isToggleNode(toggleNode)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const toggleNode = $createBaseToggleNode(dataset)

        expect(toggleNode.heading).toBe(dataset.heading)
        expect(toggleNode.content).toBe(dataset.content)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const toggleNode = $createBaseToggleNode()

        expect(toggleNode.heading).toBe('')
        toggleNode.heading = 'Heading'
        expect(toggleNode.heading).toBe('Heading')

        expect(toggleNode.content).toBe('')
        toggleNode.content = 'Content'
        expect(toggleNode.content).toBe('Content')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const toggleNode = $createBaseToggleNode(dataset)
        const toggleNodeDataset = toggleNode.getDataset()

        expect(toggleNodeDataset).toEqual({
          ...dataset,
        })
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        expect(BaseToggleNode.getType()).toBe('toggle')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const toggleNode = $createBaseToggleNode(dataset)
        const toggleNodeDataset = toggleNode.getDataset()
        const clone = BaseToggleNode.clone(toggleNode) as BaseToggleNode
        const cloneDataset = clone.getDataset()

        expect(cloneDataset).toEqual({ ...toggleNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        expect(BaseToggleNode.urlTransformMap).toEqual({
          heading: 'html',
          content: 'html',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const toggleNode = $createBaseToggleNode(dataset)
        expect(toggleNode.hasEditMode()).toBe(true)
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const toggleNode = $createBaseToggleNode(dataset)
        const json = toggleNode.exportJSON()

        expect(json).toEqual({
          type: 'toggle',
          version: 1,
          heading: dataset.heading,
          content: dataset.content,
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
                type: 'toggle',
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
            const [toggleNode] = $getRoot().getChildren() as BaseToggleNode[]

            expect(toggleNode.heading).toBe(dataset.heading)
            expect(toggleNode.content).toBe(dataset.content)

            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('exportDOM', function () {
    it(
      'renders',
      editorTest(async function () {
        const payload = {
          heading: 'Heading',
          content: 'Content',
        }
        const toggleNode = $createBaseToggleNode(payload)
        const result = toggleNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        await expectPrettifiedHtml(
          element.outerHTML,
          html`
            <div class="inkling-card inkling-toggle-card" data-inkling-toggle-state="close">
              <div class="inkling-toggle-heading">
                <h4 class="inkling-toggle-heading-text">Heading</h4>
                <button class="inkling-toggle-card-icon" aria-label="Expand toggle to read content">
                  <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                  </svg>
                </button>
              </div>
              <div class="inkling-toggle-content">Content</div>
            </div>
          `,
        )
      }),
    )

    it(
      'renders for email target',
      editorTest(async function () {
        const payload = {
          heading: 'Heading',
          content: 'Content',
        }

        const options = {
          target: 'email',
          postUrl: 'https://example.com/my-post',
        }
        const toggleNode = $createBaseToggleNode(payload)
        const result = toggleNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement

        await expectPrettifiedHtml(
          element.outerHTML,
          html`
            <div
              style="background: transparent;
                border: 1px solid rgba(124, 139, 154, 0.25); border-radius: 4px; padding: 20px; margin-bottom: 1.5em;"
            >
              <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">Heading</h4>
              <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;">Content</div>
            </div>
          `,
        )
      }),
    )

    it(
      'renders for email target (emailCustomizationAlpha)',
      editorTest(async function () {
        const payload = {
          heading: 'Heading',
          content: 'Content',
        }

        const options = {
          target: 'email',
          postUrl: 'https://example.com/my-post',
          feature: {
            emailCustomizationAlpha: true,
          },
        }
        const toggleNode = $createBaseToggleNode(payload)
        const result = toggleNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement

        await expectPrettifiedHtml(
          element.outerHTML,
          html`
            <table cellspacing="0" cellpadding="0" border="0" width="100%" class="inkling-toggle-card">
              <tbody>
                <tr>
                  <td class="inkling-toggle-heading">
                    <h4>Heading</h4>
                  </td>
                </tr>
                <tr>
                  <td class="inkling-toggle-content">Content</td>
                </tr>
              </tbody>
            </table>
          `,
        )
      }),
    )

    it(
      'renders for email target (emailCustomization)',
      editorTest(async function () {
        const payload = {
          heading: 'Heading',
          content: 'Content',
        }

        const options = {
          target: 'email',
          postUrl: 'https://example.com/my-post',
          feature: {
            emailCustomization: true,
          },
        }
        const toggleNode = $createBaseToggleNode(payload)
        const result = toggleNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement

        await expectPrettifiedHtml(
          element.outerHTML,
          html`
            <table cellspacing="0" cellpadding="0" border="0" width="100%" class="inkling-toggle-card">
              <tbody>
                <tr>
                  <td class="inkling-toggle-heading">
                    <h4>Heading</h4>
                  </td>
                </tr>
                <tr>
                  <td class="inkling-toggle-content">Content</td>
                </tr>
              </tbody>
            </table>
          `,
        )
      }),
    )

    describe('sanitized heading and content output (plan 040 Step 4)', function () {
      // The toggle renderer interpolates heading/content into HTML strings.
      // Plan 040 Step 4 routes both through the render context: the heading
      // is escaped (context.escapeText) and the nested-editor content is
      // DOMPurify-sanitized (context.sanitizeCaption), so markup-bearing
      // inputs are neutralized while benign inputs render byte-identically.
      // A standalone leading <script> parses into the document <head> inside
      // sanitizeHtml's placeholder pass, so the pinned content below
      // sanitizes to an empty string. Before/after evidence: the Step-4 fix
      // commit message.
      const adversarialPayload = {
        heading: '<script>alert(1)</script>',
        content: '<script>alert(2)</script>',
      }

      it(
        'escapes the heading and sanitizes the content in web output',
        editorTest(async function () {
          const toggleNode = $createBaseToggleNode(adversarialPayload)
          const result = toggleNode.exportDOM(editor, exportOptions)
          const element = result.element as HTMLElement

          await expectPrettifiedHtml(
            element.outerHTML,
            html`
              <div class="inkling-card inkling-toggle-card" data-inkling-toggle-state="close">
                <div class="inkling-toggle-heading">
                  <h4 class="inkling-toggle-heading-text">&lt;script&gt;alert(1)&lt;/script&gt;</h4>
                  <button class="inkling-toggle-card-icon" aria-label="Expand toggle to read content">
                    <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                    </svg>
                  </button>
                </div>
                <div class="inkling-toggle-content"></div>
              </div>
            `,
          )
        }),
      )

      it(
        'escapes the heading and sanitizes the content in legacy email output',
        editorTest(async function () {
          const toggleNode = $createBaseToggleNode(adversarialPayload)
          const result = toggleNode.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            postUrl: 'https://example.com/my-post',
          })
          const element = result.element as HTMLElement

          await expectPrettifiedHtml(
            element.outerHTML,
            html`
              <div
                style="background: transparent; border: 1px solid rgba(124, 139, 154, 0.25); border-radius: 4px; padding: 20px; margin-bottom: 1.5em;"
              >
                <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">
                  &lt;script&gt;alert(1)&lt;/script&gt;
                </h4>
                <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;"></div>
              </div>
            `,
          )
        }),
      )

      it(
        'escapes the heading and sanitizes the content in email customization output',
        editorTest(async function () {
          const toggleNode = $createBaseToggleNode(adversarialPayload)
          const result = toggleNode.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            postUrl: 'https://example.com/my-post',
            feature: { emailCustomizationAlpha: true },
          })
          const element = result.element as HTMLElement

          await expectPrettifiedHtml(
            element.outerHTML,
            html`
              <table cellspacing="0" cellpadding="0" border="0" width="100%" class="inkling-toggle-card">
                <tbody>
                  <tr>
                    <td class="inkling-toggle-heading">
                      <h4>&lt;script&gt;alert(1)&lt;/script&gt;</h4>
                    </td>
                  </tr>
                  <tr>
                    <td class="inkling-toggle-content"></td>
                  </tr>
                </tbody>
              </table>
            `,
          )
        }),
      )
    })

    it(
      'renders heading',
      editorTest(async function () {
        const payload = {
          heading: 'Heading',
          content: 'Content',
        }

        const toggleNode = $createBaseToggleNode(payload)
        const result = toggleNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement
        expect(element.outerHTML).toContain('<h4 class="inkling-toggle-heading-text">Heading</h4>')
      }),
    )

    it(
      'renders content',
      editorTest(async function () {
        const payload = {
          heading: 'Heading',
          content: 'Content',
        }

        const toggleNode = $createBaseToggleNode(payload)
        const result = toggleNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement
        expect(element.outerHTML).toContain('<div class="inkling-toggle-content">Content</div>')
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses toggle card',
      editorTest(async function () {
        const document = createDocument(html`
          <div class="inkling-card inkling-toggle-card" data-inkling-toggle-state="close">
            <div class="inkling-toggle-heading">
              <h4 class="inkling-toggle-heading-text">Heading</h4>
              <button class="inkling-toggle-card-icon" aria-label="Expand toggle to read content">
                <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path>
                </svg>
              </button>
            </div>
            <div class="inkling-toggle-content">Content</div>
          </div>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as BaseToggleNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].heading).toBe('Heading')
        expect(nodes[0].content).toBe('Content')
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createBaseToggleNode()
        expect(node.getTextContent()).toBe('')

        node.heading = 'header'
        expect(node.getTextContent()).toBe('header\n\n')

        node.content = 'content'
        expect(node.getTextContent()).toBe('header\ncontent\n\n')
      }),
    )
  })
})
