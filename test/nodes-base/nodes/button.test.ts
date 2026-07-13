import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot } from 'lexical'

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
      $isButtonNode(buttonNode).should.be.true()
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)

        buttonNode.buttonUrl.should.equal(dataset.buttonUrl)
        buttonNode.buttonText.should.equal(dataset.buttonText)
        buttonNode.alignment.should.equal(dataset.alignment)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const buttonNode = $createButtonNode()

        buttonNode.buttonUrl.should.equal('')
        buttonNode.buttonUrl = 'http://someblog.com/somepost'
        buttonNode.buttonUrl.should.equal('http://someblog.com/somepost')

        buttonNode.buttonText.should.equal('')
        buttonNode.buttonText = 'button text'
        buttonNode.buttonText.should.equal('button text')

        buttonNode.alignment.should.equal('center')
        buttonNode.alignment = 'left'
        buttonNode.alignment.should.equal('left')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const buttonNodeDataset = buttonNode.getDataset()

        buttonNodeDataset.should.deepEqual({
          ...dataset,
        })
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        ButtonNode.getType().should.equal('button')
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

        cloneDataset.should.deepEqual({ ...buttonNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        ButtonNode.urlTransformMap.should.deepEqual({
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
        buttonNode.hasEditMode().should.be.true()
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

        await element.outerHTML.should.prettifyTo(
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

        output.should.not.containEql('inkling-card')
        output.should.containEql('<div class="btn btn-accent">')
        output.should.containEql('<table border="0" cellspacing="0" cellpadding="0"')
        output.should.containEql('<td align="center">')
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

        await output.should.prettifyTo(html`
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
        `)
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

        await output.should.prettifyTo(html`
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
        `)
      }),
    )

    it(
      'renders an empty span with a missing buttonUrl',
      editorTest(async function () {
        const buttonNode = $createButtonNode()
        const result = buttonNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        element.outerHTML.should.equal('<span></span>')
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

        element.outerHTML.should.equal('<span></span>')
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

        element.outerHTML.should.equal('<span></span>')
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

        element.innerHTML.should.containEql('&lt;script&gt;alert(1)&lt;/script&gt;')
        element.innerHTML.should.not.containEql('<script>alert(1)</script>')
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const buttonNode = $createButtonNode(dataset)
        const json = buttonNode.exportJSON()

        json.should.deepEqual({
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

            buttonNode.buttonUrl.should.equal(dataset.buttonUrl)
            buttonNode.buttonText.should.equal(dataset.buttonText)
            buttonNode.alignment.should.equal(dataset.alignment)

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
        ButtonNode.getType().should.equal('button')
      }),
    )

    it(
      'urlTransformMap',
      editorTest(async function () {
        ButtonNode.urlTransformMap.should.deepEqual({
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
        nodes.length.should.equal(1)
        nodes[0].buttonUrl.should.equal('http://someblog.com/somepost')
        nodes[0].buttonText.should.equal('click me')
        nodes[0].alignment.should.equal('center')
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
        nodes.length.should.equal(1)
        nodes[0].buttonUrl.should.equal('#/portal/signup')
        nodes[0].buttonText.should.equal('Subscribe 1')
        nodes[0].alignment.should.equal('center')
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
        node.getTextContent().should.equal('')
      }),
    )
  })
})
