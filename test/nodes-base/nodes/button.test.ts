import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { ButtonNode, $createButtonNode, $isButtonNode } from '@/nodes/base/index'

const editorNodes = [ButtonNode]

describe('ButtonNode', function () {
  let editor: LexicalEditor
  let dataset: { buttonText: string; buttonUrl: string; alignment: string }
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
      buttonText: 'click me',
      buttonUrl: 'http://blog.com/post1',
      alignment: 'center',
    }
    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isButtonNode',
    editorTest(async function () {
      const buttonNode = $createButtonNode(dataset)
      expect($isButtonNode(buttonNode)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)

        expect(buttonNode.buttonUrl).toBe(dataset.buttonUrl)
        expect(buttonNode.buttonText).toBe(dataset.buttonText)
        expect(buttonNode.alignment).toBe(dataset.alignment)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const buttonNode = $createButtonNode()

        expect(buttonNode.buttonUrl).toBe('')
        buttonNode.buttonUrl = 'http://someblog.com/somepost'
        expect(buttonNode.buttonUrl).toBe('http://someblog.com/somepost')

        expect(buttonNode.buttonText).toBe('')
        buttonNode.buttonText = 'button text'
        expect(buttonNode.buttonText).toBe('button text')

        expect(buttonNode.alignment).toBe('center')
        buttonNode.alignment = 'left'
        expect(buttonNode.alignment).toBe('left')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const buttonNodeDataset = buttonNode.getDataset()

        expect(buttonNodeDataset).toEqual({
          ...dataset,
        })
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        expect(ButtonNode.getType()).toBe('button')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const buttonNodeDataset = buttonNode.getDataset()
        const clone = ButtonNode.clone(buttonNode) as ButtonNode
        const cloneDataset = clone.getDataset()

        expect(cloneDataset).toEqual({ ...buttonNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        expect(ButtonNode.urlTransformMap).toEqual({
          buttonUrl: 'url',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        expect(buttonNode.hasEditMode()).toBe(true)
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'creates a button card',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const result = buttonNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        await expectPrettifiedHtml(
          element.outerHTML,
          html`<div class="inkling-card inkling-button-card inkling-align-center">
            <a href="http://blog.com/post1" class="inkling-btn inkling-btn-accent">click me</a>
          </div>`,
        )
      }),
    )

    it(
      'renders for email target',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const options = {
          target: 'email',
        }
        const result = buttonNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement
        const output = element.outerHTML

        expect(output).not.toContain('inkling-card')
        expect(output).toContain('<div class="btn btn-accent">')
        expect(output).toContain('<table border="0" cellspacing="0" cellpadding="0"')
        expect(output).toContain('<td align="center">')
      }),
    )

    it(
      'pins the full legacy email output',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const result = buttonNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const element = result.element as HTMLElement

        // legacy email wraps the button table in a <p> element
        expect(element.tagName).toBe('P')
        await expectPrettifiedHtml(
          element.innerHTML,
          html`
            <div class="btn btn-accent">
              <table border="0" cellspacing="0" cellpadding="0" align="center">
                <tbody>
                  <tr>
                    <td align="center">
                      <a href="http://blog.com/post1">click me</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          `,
        )
      }),
    )

    it(
      'renders for email target (emailCustomization)',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const options = {
          target: 'email',
          feature: {
            emailCustomization: true,
          },
        }
        const result = buttonNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement
        const output = element.innerHTML

        await expectPrettifiedHtml(
          output,
          html`
            <table border="0" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td>
                    <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0" align="center">
                      <tbody>
                        <tr>
                          <td align="center">
                            <a href="http://blog.com/post1">click me</a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          `,
        )
      }),
    )

    it(
      'renders for email target (emailCustomizationAlpha)',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const options = {
          target: 'email',
          feature: {
            emailCustomizationAlpha: true,
          },
        }
        const result = buttonNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement
        const output = element.innerHTML

        await expectPrettifiedHtml(
          output,
          html`
            <table border="0" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td>
                    <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0" align="center">
                      <tbody>
                        <tr>
                          <td align="center">
                            <a href="http://blog.com/post1">click me</a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          `,
        )
      }),
    )

    it(
      'renders for email target with explicit design outline',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const result = buttonNode.exportDOM(editor, {
          ...exportOptions,
          target: 'email',
          design: { buttonStyle: 'outline' },
        })
        const element = result.element as HTMLElement
        const output = element.innerHTML

        await expectPrettifiedHtml(
          output,
          html`
            <table border="0" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td>
                    <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0" align="center">
                      <tbody>
                        <tr>
                          <td align="center">
                            <a href="http://blog.com/post1">click me</a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          `,
        )
      }),
    )

    it(
      'renders an empty span with a missing buttonUrl',
      editorTest(async function () {
        const buttonNode = $createButtonNode()
        const result = buttonNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        expect(element.outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'rejects an unsafe button URL',
      editorTest(function () {
        const buttonNode = $createButtonNode({
          buttonText: 'click me',
          buttonUrl: 'javascript:alert(1)',
          alignment: 'center',
        })
        const result = buttonNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        expect(element.outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'rejects an unsafe button URL for the email target',
      editorTest(function () {
        const buttonNode = $createButtonNode({
          buttonText: 'click me',
          buttonUrl: 'javascript:alert(1)',
          alignment: 'center',
        })
        const result = buttonNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const element = result.element as HTMLElement

        expect(element.outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'escapes button text markup',
      editorTest(function () {
        const buttonNode = $createButtonNode({
          buttonText: '<script>alert(1)</script>',
          buttonUrl: 'https://example.com/',
          alignment: 'center',
        })
        const result = buttonNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        expect(element.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
        expect(element.innerHTML).not.toContain('<script>alert(1)</script>')
      }),
    )

    it(
      'escapes a quote-containing button URL in email templates',
      editorTest(function () {
        const buttonNode = $createButtonNode({
          buttonText: 'click me',
          buttonUrl: '#/portal/"quoted"',
          alignment: 'center',
        })

        for (const feature of [{ emailCustomization: true }, { emailCustomizationAlpha: true }, {}]) {
          const result = buttonNode.exportDOM(editor, { ...exportOptions, target: 'email', feature })
          const element = result.element as HTMLElement

          expect(element.innerHTML).toContain('href="#/portal/&quot;quoted&quot;"')
          expect(element.querySelectorAll('a').length).toBe(1)
        }
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const json = buttonNode.exportJSON()

        expect(json).toEqual({
          type: 'button',
          version: 1,
          buttonUrl: dataset.buttonUrl,
          buttonText: dataset.buttonText,
          alignment: dataset.alignment,
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
                type: 'button',
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
            const [buttonNode] = $getRoot().getChildren() as ButtonNode[]

            expect(buttonNode.buttonUrl).toBe(dataset.buttonUrl)
            expect(buttonNode.buttonText).toBe(dataset.buttonText)
            expect(buttonNode.alignment).toBe(dataset.alignment)

            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('static properties', function () {
    it(
      'getType',
      editorTest(async function () {
        expect(ButtonNode.getType()).toBe('button')
      }),
    )

    it(
      'urlTransformMap',
      editorTest(async function () {
        expect(ButtonNode.urlTransformMap).toEqual({
          buttonUrl: 'url',
        })
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses button card',
      editorTest(async function () {
        const document = createDocument(html`
          <div class="inkling-card inkling-button-card inkling-align-center">
            <a href="http://someblog.com/somepost" class="inkling-btn inkling-btn-accent">click me</a>
          </div>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ButtonNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].buttonUrl).toBe('http://someblog.com/somepost')
        expect(nodes[0].buttonText).toBe('click me')
        expect(nodes[0].alignment).toBe('center')
      }),
    )

    it(
      'preserves relative urls in content',
      editorTest(async function () {
        const document = createDocument(html`
          <div class="inkling-card inkling-button-card inkling-align-center">
            <a href="#/portal/signup" class="inkling-btn inkling-btn-accent">Subscribe 1</a>
          </div>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ButtonNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].buttonUrl).toBe('#/portal/signup')
        expect(nodes[0].buttonText).toBe('Subscribe 1')
        expect(nodes[0].alignment).toBe('center')
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createButtonNode()
        node.buttonText = 'Testing'
        node.buttonUrl = 'http://someblog.com/somepost'

        // button nodes don't have text content
        expect(node.getTextContent()).toBe('')
      }),
    )
  })
})
