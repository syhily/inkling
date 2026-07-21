import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, type LexicalEditor } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { dom, createDocument, html } from '#/nodes-base/test-utils/index'
import { BaseFileNode, $createBaseFileNode, $isFileNode } from '@/nodes/base/index'

const editorNodes = [BaseFileNode]

describe('BaseFileNode', function () {
  let editor: LexicalEditor
  let dataset: Record<string, unknown>
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
      src: '/content/files/2023/03/IMG_0196.jpeg',
      fileTitle: 'Cool image to download',
      fileSize: 123456,
      fileCaption: 'This is a description',
      fileName: 'IMG_0196.jpeg',
    }
    exportOptions = {
      exportFormat: 'html',
      dom,
    }
  })

  it(
    'can match node with BaseFileNode',
    editorTest(function () {
      const node = $createBaseFileNode(dataset)
      expect($isFileNode(node)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters from all properties',
      editorTest(function () {
        const node = $createBaseFileNode(dataset)
        expect(node.src).toBe(dataset.src)
        expect(node.fileTitle).toBe(dataset.fileTitle)
        expect(node.fileSize).toBe(dataset.fileSize)
        expect(node.fileCaption).toBe(dataset.fileCaption)
        expect(node.fileName).toBe(dataset.fileName)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(function () {
        const node = $createBaseFileNode(dataset)
        node.src = '/content/files/2023/03/IMG_0196.jpeg'
        expect(node.src).toBe('/content/files/2023/03/IMG_0196.jpeg')
        node.fileTitle = 'new title'
        expect(node.fileTitle).toBe('new title')
        node.fileSize = 123456
        expect(node.fileSize).toBe(123456)
        expect(node.formattedFileSize).toBe('121 KB')
        node.fileCaption = 'new description'
        expect(node.fileCaption).toBe('new description')
        node.fileName = 'IMG_0196.jpeg'
        expect(node.fileName).toBe('IMG_0196.jpeg')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(function () {
        const node = $createBaseFileNode(dataset)
        const fileNodeDataset = node.getDataset()
        expect(fileNodeDataset).toEqual(dataset)
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'creates a file card',
      editorTest(function () {
        const fileNode = $createBaseFileNode(dataset)
        const { element } = fileNode.exportDOM(editor, exportOptions)
        expect((element as HTMLElement).outerHTML).toBe(
          `<div class="inkling-card inkling-file-card"><a class="inkling-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download=""><div class="inkling-file-card-contents"><div class="inkling-file-card-title">Cool image to download</div><div class="inkling-file-card-caption">This is a description</div><div class="inkling-file-card-metadata"><div class="inkling-file-card-filename">IMG_0196.jpeg</div><div class="inkling-file-card-filesize">121 KB</div></div></div><div class="inkling-file-card-icon"><svg viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>download-circle</title><polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline><line class="a" x1="12" y1="6.75" x2="12" y2="18"></line><circle class="a" cx="12" cy="12" r="11.25"></circle></svg></div></a></div>`,
        )
      }),
    )

    it(
      'does not create an anchor for unsafe src URLs',
      editorTest(function () {
        const fileNode = $createBaseFileNode({ ...dataset, src: 'javascript:alert(1)' })
        const { element } = fileNode.exportDOM(editor, exportOptions)
        const html = (element as HTMLElement).outerHTML

        expect(html).not.toContain('href="javascript:')
        expect(html).toContain('inkling-file-card-container')
        expect(html).toContain('Cool image to download')
      }),
    )

    describe('email template', function () {
      beforeEach(function () {
        exportOptions.target = 'email'
        exportOptions.postUrl = 'https://example.com/post'
      })

      it(
        'renders complete email template with all fields',
        editorTest(function () {
          const fileNode = $createBaseFileNode(dataset)
          const { element } = fileNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          // Check basic structure
          expect(el.tagName).toBe('TABLE')
          expect(el.className).toBe('inkling-file-card')

          // Check title is present and linked
          const titleLink = el.querySelector('.inkling-file-title')!
          expect(titleLink.textContent!).toBe('Cool image to download')
          expect(titleLink.closest('a')!.href).toBe('https://example.com/post')

          // Check caption is present and linked
          const descriptionLink = el.querySelector('.inkling-file-description')!
          expect(descriptionLink.textContent!).toBe('This is a description')
          expect(descriptionLink.closest('a')!.href).toBe('https://example.com/post')

          // Check metadata
          const metaLink = el.querySelector('.inkling-file-meta')!
          expect(metaLink.innerHTML).toContain('IMG_0196.jpeg')
          expect(metaLink.innerHTML).toContain('121 KB')

          // Check icon
          const icon = el.querySelector('img') as HTMLImageElement
          expect(icon.src).toBe('https://static.inkling.local/v4.0.0/images/download-icon-darkmode.png')
          expect(icon.style.height).toBe('24px')
        }),
      )

      it(
        'pins the full email output byte-for-byte',
        editorTest(async function () {
          const fileNode = $createBaseFileNode(dataset)
          const { element } = fileNode.exportDOM(editor, exportOptions)

          await expectPrettifiedHtml(
            (element as HTMLElement).outerHTML,
            html`
              <table cellspacing="0" cellpadding="4" border="0" class="inkling-file-card" width="100%">
                <tbody>
                  <tr>
                    <td>
                      <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tbody>
                          <tr>
                            <td valign="middle" style="vertical-align: middle;">
                              <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td>
                                      <a href="https://example.com/post" class="inkling-file-title"
                                        >Cool image to download</a
                                      >
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td>
                                      <a href="https://example.com/post" class="inkling-file-description"
                                        >This is a description</a
                                      >
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td>
                                      <a href="https://example.com/post" class="inkling-file-meta"
                                        ><span class="inkling-file-name">IMG_0196.jpeg</span> • 121 KB</a
                                      >
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                            <td width="80" valign="middle" class="inkling-file-thumbnail">
                              <a
                                href="https://example.com/post"
                                style="display: block; top: 0; right: 0; bottom: 0; left: 0;"
                                ><img
                                  src="https://static.inkling.local/v4.0.0/images/download-icon-darkmode.png"
                                  style="margin-top: 6px; height: 24px; width: 24px; max-width: 24px;"
                              /></a>
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
        'renders email template without title and caption',
        editorTest(function () {
          const minimalDataset = {
            src: '/content/files/2023/03/IMG_0196.jpeg',
            fileName: 'IMG_0196.jpeg',
            fileSize: 123456,
          }
          const fileNode = $createBaseFileNode(minimalDataset)
          const { element } = fileNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          // Should not have title
          expect(el.querySelector('.inkling-file-title') ?? null).toBeNull()

          // Should not have caption
          expect(el.querySelector('.inkling-file-description') ?? null).toBeNull()

          // Should have smaller icon
          const icon = el.querySelector('img') as HTMLImageElement
          expect(icon.style.height).toBe('20px')
        }),
      )

      it(
        'properly escapes HTML in all fields',
        editorTest(function () {
          const datasetWithHtml = {
            ...dataset,
            fileTitle: 'Title with <script>alert("xss")</script>',
            fileCaption: 'Caption with <strong>html</strong>',
            fileName: 'file<.html',
          }
          const fileNode = $createBaseFileNode(datasetWithHtml)
          const { element } = fileNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          const elHtml = el.innerHTML
          expect(elHtml).not.toContain('<script>')
          expect(elHtml).not.toContain('<strong>')
          expect(elHtml).toContain('file&lt;.html')
          expect(elHtml).toContain('Title with ')
          expect(elHtml).toContain('Caption with ')
        }),
      )
      it(
        'does not link fields when the href is unsafe',
        editorTest(function () {
          exportOptions.postUrl = 'javascript:alert(1)'
          const fileNode = $createBaseFileNode(dataset)
          const { element } = fileNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          const titleLink = el.querySelector('.inkling-file-title')
          expect(titleLink!.closest('a') ?? null).toBeNull()

          const descriptionLink = el.querySelector('.inkling-file-description')
          expect(descriptionLink!.closest('a') ?? null).toBeNull()

          const metaLink = el.querySelector('.inkling-file-meta')
          expect(metaLink!.closest('a') ?? null).toBeNull()
        }),
      )
    })
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(function () {
        expect(BaseFileNode.getType()).toBe('file')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(function () {
        const fileNode = $createBaseFileNode(dataset)
        const fileNodeDataset = fileNode.getDataset()
        const clone = BaseFileNode.clone(fileNode) as BaseFileNode
        const cloneDataset = clone.getDataset()

        expect(cloneDataset).toEqual({ ...fileNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(function () {
        expect(BaseFileNode.urlTransformMap).toEqual({
          src: 'url',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(function () {
        const fileNode = $createBaseFileNode(dataset)
        expect(fileNode.hasEditMode()).toBe(true)
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses a file card',
      editorTest(function () {
        const document = createDocument(`
                <div class="inkling-card inkling-file-card">
                    <a class="inkling-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download="">
                        <div class="inkling-file-card-contents">
                            <div class="inkling-file-card-title">Cool image to download</div>
                            <div class="inkling-file-card-caption">This is a description</div>
                            <div class="inkling-file-card-metadata">
                                <div class="inkling-file-card-filename">IMG_0196.jpeg</div>
                                <div class="inkling-file-card-filesize">121 KB</div>
                            </div>
                        </div>
                        <div class="inkling-file-card-icon">
                            <svg viewBox="0 0 24 24">
                                <defs>
                                    <style>
                                        .a {
                                            fill: none;
                                            stroke: currentColor;
                                            stroke-linecap: round;
                                            stroke-linejoin: round;
                                            stroke-width: 1.5px;
                                        }
                                    </style>
                                </defs>
                                <title>download-circle</title>
                                <polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline>
                                <line class="a" x1="12" y1="6.75" x2="12" y2="18"></line>
                                <circle class="a" cx="12" cy="12" r="11.25"></circle>
                            </svg>
                        </div>
                    </a>
                </div>
            `)
        const nodes = $generateNodesFromDOM(editor, document) as BaseFileNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('/content/files/2023/03/IMG_0196.jpeg')
        expect(nodes[0].fileTitle).toBe('Cool image to download')
        expect(nodes[0].fileCaption).toBe('This is a description')
        expect(nodes[0].fileName).toBe('IMG_0196.jpeg')
        expect(nodes[0].fileSize).toBe(123904) // ~121 KB
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
                type: 'file',
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
            const [fileNode] = $getRoot().getChildren() as BaseFileNode[]
            expect(fileNode.src).toBe('/content/files/2023/03/IMG_0196.jpeg')
            expect(fileNode.fileTitle).toBe('Cool image to download')
            expect(fileNode.fileCaption).toBe('This is a description')
            expect(fileNode.fileName).toBe('IMG_0196.jpeg')
            expect(fileNode.fileSize).toBe(123456)
            expect(fileNode.formattedFileSize).toBe('121 KB') // ~121 KB
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('exportJSON', function () {
    it(
      'exports all data',
      editorTest(function () {
        const fileNode = $createBaseFileNode(dataset)
        const json = fileNode.exportJSON()
        expect(json).toEqual({
          type: 'file',
          version: 1,
          ...dataset,
        })
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(function () {
        const node = $createBaseFileNode()
        expect(node.getTextContent()).toBe('')

        node.fileTitle = 'Testing'
        expect(node.getTextContent()).toBe('Testing\n\n')

        node.fileCaption = 'Test caption'
        expect(node.getTextContent()).toBe('Testing\nTest caption\n\n')
      }),
    )
  })
})
