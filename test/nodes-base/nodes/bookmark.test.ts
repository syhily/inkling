import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import Prettier from '@prettier/sync'
import { $getRoot } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { BookmarkNode, $createBookmarkNode, $isBookmarkNode, type BookmarkData } from '@/nodes/base/index'

const editorNodes = [BookmarkNode]

describe('BookmarkNode', function () {
  let editor: LexicalEditor
  let dataset: BookmarkData
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
      url: 'https://inkling.local/',
      metadata: {
        icon: 'https://inkling.local/favicon.ico',
        title: 'Inkling: The Creator Economy Platform',
        description: 'doing kewl stuff',
        author: 'inkling',
        publisher: 'Inkling - The Professional Publishing Platform',
        thumbnail: 'https://inkling.local/images/meta/inkling.png',
      },
      caption: 'caption here',
    }

    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isBookmarkNode',
    editorTest(async function () {
      const bookmarkNode = $createBookmarkNode(dataset)
      expect($isBookmarkNode(bookmarkNode)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)

        const metadata = dataset.metadata as Record<string, unknown>
        expect(bookmarkNode.url).toBe(dataset.url)
        expect(bookmarkNode.icon).toBe(metadata.icon)
        expect(bookmarkNode.title).toBe(metadata.title)
        expect(bookmarkNode.description).toBe(metadata.description)
        expect(bookmarkNode.author).toBe(metadata.author)
        expect(bookmarkNode.publisher).toBe(metadata.publisher)
        expect(bookmarkNode.thumbnail).toBe(metadata.thumbnail)
        expect(bookmarkNode.caption).toBe(dataset.caption)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode()

        expect(bookmarkNode.url).toBe('')
        bookmarkNode.url = 'https://inkling.local/'
        expect(bookmarkNode.url).toBe('https://inkling.local/')

        expect(bookmarkNode.icon).toBe('')
        bookmarkNode.icon = 'https://inkling.local/favicon.ico'
        expect(bookmarkNode.icon).toBe('https://inkling.local/favicon.ico')

        expect(bookmarkNode.title).toBe('')
        bookmarkNode.title = 'Inkling: The Creator Economy Platform'
        expect(bookmarkNode.title).toBe('Inkling: The Creator Economy Platform')

        expect(bookmarkNode.description).toBe('')
        bookmarkNode.description = 'doing kewl stuff'
        expect(bookmarkNode.description).toBe('doing kewl stuff')

        expect(bookmarkNode.author).toBe('')
        bookmarkNode.author = 'inkling'
        expect(bookmarkNode.author).toBe('inkling')

        expect(bookmarkNode.publisher).toBe('')
        bookmarkNode.publisher = 'Inkling - The Professional Publishing Platform'
        expect(bookmarkNode.publisher).toBe('Inkling - The Professional Publishing Platform')

        expect(bookmarkNode.thumbnail).toBe('')
        bookmarkNode.thumbnail = 'https://inkling.local/images/meta/inkling.png'
        expect(bookmarkNode.thumbnail).toBe('https://inkling.local/images/meta/inkling.png')

        expect(bookmarkNode.caption).toBe('')
        bookmarkNode.caption = 'caption here'
        expect(bookmarkNode.caption).toBe('caption here')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        const bookmarkNodeDataset = bookmarkNode.getDataset()

        expect(bookmarkNodeDataset).toEqual({
          ...dataset,
        })
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        expect(BookmarkNode.getType()).toBe('bookmark')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        const bookmarkNodeDataset = bookmarkNode.getDataset()
        const clone = BookmarkNode.clone(bookmarkNode) as BookmarkNode
        const cloneDataset = clone.getDataset()

        expect(cloneDataset).toEqual({ ...bookmarkNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        expect(BookmarkNode.urlTransformMap).toEqual({
          url: 'url',
          'metadata.icon': 'url',
          'metadata.thumbnail': 'url',
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        expect(bookmarkNode.hasEditMode()).toBe(true)
      }),
    )
  })

  describe('isEmpty', function () {
    it(
      'returns true if url is empty',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)

        expect(bookmarkNode.isEmpty()).toBe(false)
        bookmarkNode.url = ''
        expect(bookmarkNode.isEmpty()).toBe(true)
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'creates an bookmark card',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        const result = bookmarkNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement
        const metadata = dataset.metadata as Record<string, unknown>

        const expectedHtml = `
                <figure class="inkling-card inkling-bookmark-card inkling-card-hascaption">
                    <a class="inkling-bookmark-container" href="${dataset.url}">
                        <div class="inkling-bookmark-content">
                            <div class="inkling-bookmark-title">${metadata.title}</div>
                            <div class="inkling-bookmark-description">${metadata.description}</div>
                            <div class="inkling-bookmark-metadata">
                                <img class="inkling-bookmark-icon" src="${metadata.icon}" alt="">
                                <span class="inkling-bookmark-author">${metadata.publisher}</span>
                                <span class="inkling-bookmark-publisher">${metadata.author}</span>
                            </div>
                        </div>
                        <div class="inkling-bookmark-thumbnail">
                            <img src="${metadata.thumbnail}" alt="" onerror="this.style.display = 'none'">
                        </div>
                    </a>
                    <figcaption>${dataset.caption}</figcaption>
                </figure>
            `

        const prettyExpectedHtml = Prettier.format(expectedHtml, { parser: 'html' })

        await expectPrettifiedHtml(element.outerHTML, prettyExpectedHtml)
      }),
    )

    it(
      'renders email target',
      editorTest(async function () {
        const options = {
          target: 'email',
        }
        const bookmarkNode = $createBookmarkNode(dataset)
        const result = bookmarkNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement

        expect(element.innerHTML).toContain('<!--[if !mso !vml]-->')
        expect(element.innerHTML).toContain('<figure class="inkling-card inkling-bookmark-card')
        expect(element.innerHTML).toContain('<!--[if vml]>')
        expect(element.innerHTML).toContain('<table class="inkling-card inkling-bookmark-card--outlook"')
      }),
    )

    it(
      'pins the full email output',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        const result = bookmarkNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const element = result.element as HTMLElement

        await expectPrettifiedHtml(
          element.outerHTML,
          html`
            <div>
              <!--[if !mso !vml]-->
              <figure class="inkling-card inkling-bookmark-card inkling-card-hascaption">
                <a class="inkling-bookmark-container" href="https://inkling.local/">
                  <div class="inkling-bookmark-content">
                    <div class="inkling-bookmark-title">Inkling: The Creator Economy Platform</div>
                    <div class="inkling-bookmark-description">doing kewl stuff</div>
                    <div class="inkling-bookmark-metadata">
                      <img class="inkling-bookmark-icon" src="https://inkling.local/favicon.ico" alt="" /><span
                        class="inkling-bookmark-author"
                        src="Inkling - The Professional Publishing Platform"
                        >Inkling - The Professional Publishing Platform</span
                      ><span class="inkling-bookmark-publisher" src="inkling">inkling</span>
                    </div>
                  </div>
                  <div
                    class="inkling-bookmark-thumbnail"
                    style="background-image: url('https://inkling.local/images/meta/inkling.png')"
                  >
                    <img
                      src="https://inkling.local/images/meta/inkling.png"
                      alt=""
                      onerror="this.style.display='none'"
                    />
                  </div>
                </a>
                <figcaption>caption here</figcaption>
              </figure>
              <!--[endif]-->
              <!--[if vml]>
                <table
                  class="inkling-card inkling-bookmark-card--outlook"
                  style="margin: 0; padding: 0; width: 100%; border: 1px solid #e5eff5; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; border-collapse: collapse; border-spacing: 0;"
                  width="100%"
                >
                  <tr>
                    <td width="100%" style="padding: 20px;">
                      <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                        <tr>
                          <td class="inkling-bookmark-title--outlook">
                            <a
                              href="https://inkling.local/"
                              style="text-decoration: none; color: #15212A; font-size: 15px; line-height: 1.5em; font-weight: 600;"
                            >
                              Inkling: The Creator Economy Platform
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div class="inkling-bookmark-description--outlook">
                              <a
                                href="https://inkling.local/"
                                style="text-decoration: none; margin-top: 12px; color: #738A94; font-size: 13px; line-height: 1.5em; font-weight: 400;"
                              >
                                doing kewl stuff
                              </a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            class="inkling-bookmark-metadata--outlook"
                            style="padding-top: 14px; color: #15212A; font-size: 13px; font-weight: 400; line-height: 1.5em;"
                          >
                            <table style="margin: 0; padding: 0; border-collapse: collapse; border-spacing: 0;">
                              <tr>
                                <td
                                  valign="middle"
                                  class="inkling-bookmark-icon--outlook"
                                  style="padding-right: 8px; font-size: 0; line-height: 1.5em;"
                                >
                                  <a href="https://inkling.local/" style="text-decoration: none; color: #15212A;">
                                    <img src="https://inkling.local/favicon.ico" width="22" height="22" alt=" " />
                                  </a>
                                </td>

                                <td valign="middle" class="inkling-bookmark-byline--outlook">
                                  <a href="https://inkling.local/" style="text-decoration: none; color: #15212A;">
                                    Inkling - The Professional Publishing Platform &nbsp;&#x2022;&nbsp; inkling
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <div class="inkling-bookmark-spacer--outlook" style="height: 1.5em;">&nbsp;</div>
              <![endif]-->
            </div>
          `,
        )
      }),
    )

    it(
      'renders an empty span with a missing src',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode()
        const result = bookmarkNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        expect(element.outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'escapes HTML for text fields in web',
      editorTest(async function () {
        dataset = {
          url: 'https://www.fake.org/',
          metadata: {
            icon: 'https://www.fake.org/favicon.ico',
            title: 'Inkling: Independent technology <script>alert("XSS")</script> for modern publishing.',
            description: 'doing "kewl" stuff',
            author: "fa'ker",
            publisher: 'Fake <script>alert("XSS")</script>',
            thumbnail: 'https://fake.org/image.png',
          },
          caption:
            '<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>',
        }
        const bookmarkNode = $createBookmarkNode(dataset)
        const result = bookmarkNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        // Check that text fields are escaped
        expect(element.innerHTML).toContain(
          'Inkling: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.',
        )
        expect(element.innerHTML).toContain('doing "kewl" stuff')
        expect(element.innerHTML).toContain("fa'ker")
        expect(element.innerHTML).toContain('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;')

        // Check that caption is sanitized before insertion
        expect(element.innerHTML).toContain(
          '<p><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>',
        )
      }),
    )

    it(
      'escapes HTML for text fields in email',
      editorTest(async function () {
        const options = {
          target: 'email',
        }
        dataset = {
          url: 'https://www.fake.org/',
          metadata: {
            icon: 'https://www.fake.org/favicon.ico',
            title: 'Inkling: Independent technology <script>alert("XSS")</script> for modern publishing.',
            description: 'doing "kewl" stuff',
            author: "fa'ker",
            publisher: 'Fake <script>alert("XSS")</script>',
            thumbnail: 'https://fake.org/image.png',
          },
          caption:
            '<p dir="ltr"><span style="white-space: pre-wrap;">This is a </span><b><strong style="white-space: pre-wrap;">caption</strong></b></p>',
        }
        const bookmarkNode = $createBookmarkNode(dataset)
        const result = bookmarkNode.exportDOM(editor, { ...exportOptions, ...options })
        const element = result.element as HTMLElement

        // Check that email template is used
        expect(element.innerHTML).toContain('<!--[if !mso !vml]-->')

        // Check that text fields are escaped
        expect(element.innerHTML).toContain(
          'Inkling: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.',
        )
        expect(element.innerHTML).toContain('doing "kewl" stuff')
        expect(element.innerHTML).toContain("fa'ker")
        expect(element.innerHTML).toContain('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;')

        // Check that caption is escaped
        expect(element.innerHTML).toContain(
          '&lt;p dir="ltr"&gt;&lt;span style="white-space: pre-wrap;"&gt;This is a &lt;/span&gt;&lt;b&gt;&lt;strong style="white-space: pre-wrap;"&gt;caption&lt;/strong&gt;&lt;/b&gt;&lt;/p&gt;',
        )
      }),
    )

    it(
      'drops a bookmark with an unsafe URL',
      editorTest(function () {
        const bookmarkNode = $createBookmarkNode({
          url: 'javascript:alert(1)',
          metadata: {
            icon: '',
            title: '',
            description: '',
            author: '',
            publisher: '',
            thumbnail: '',
          },
          caption: '',
        })
        const result = bookmarkNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        expect(element.outerHTML).toBe('<span></span>')
      }),
    )

    describe('media URL policy', function () {
      const allowedMediaSources = [
        'https://example.com/icon.png',
        '/relative/path/icon.png',
        'data:image/png;base64,AAAA',
        'blob:https://example.com/9b1d4f2a',
      ]

      allowedMediaSources.forEach((src) => {
        it(
          `renders optional media for allowed media source ${src}`,
          editorTest(async function () {
            const bookmarkNode = $createBookmarkNode({
              ...dataset,
              metadata: { ...(dataset.metadata as Record<string, unknown>), icon: src, thumbnail: src },
            })
            const { element } = bookmarkNode.exportDOM(editor, exportOptions)
            const el = element as HTMLElement

            expect(el.querySelector('img.inkling-bookmark-icon')!.getAttribute('src')).toBe(src)
            expect(el.querySelector('.inkling-bookmark-thumbnail img')!.getAttribute('src')).toBe(src)
          }),
        )
      })

      it(
        'omits unsupported optional media in web output',
        editorTest(async function () {
          const bookmarkNode = $createBookmarkNode({
            ...dataset,
            metadata: {
              ...(dataset.metadata as Record<string, unknown>),
              icon: 'unsupported-scheme:payload',
              thumbnail: 'unsupported-scheme:payload',
            },
          })
          const { element } = bookmarkNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement
          const output = el.outerHTML

          expect(output).not.toContain('unsupported-scheme:payload')
          expect(el.querySelector('img.inkling-bookmark-icon')).toBeNull()
          expect(el.querySelector('.inkling-bookmark-thumbnail')).toBeNull()
          expect(el.querySelector('.inkling-bookmark-title')!.textContent).toBe('Inkling: The Creator Economy Platform')
          expect(el.querySelector('a.inkling-bookmark-container')!.getAttribute('href')).toBe('https://inkling.local/')
        }),
      )

      it(
        'omits unsupported optional media in email output',
        editorTest(async function () {
          const bookmarkNode = $createBookmarkNode({
            ...dataset,
            metadata: {
              ...(dataset.metadata as Record<string, unknown>),
              icon: 'unsupported-scheme:payload',
              thumbnail: 'unsupported-scheme:payload',
            },
          })
          const { element } = bookmarkNode.exportDOM(editor, { ...exportOptions, target: 'email' })
          const el = element as HTMLElement

          expect(el.innerHTML).not.toContain('unsupported-scheme:payload')
          expect(el.innerHTML).toContain('inkling-bookmark-title')
        }),
      )
    })

    it(
      'sanitizes a malicious caption in web and email',
      editorTest(function () {
        const maliciousCaption = '<img src=x onerror=alert(1)>'
        const bookmarkNode = $createBookmarkNode({
          url: 'https://www.fake.org/',
          metadata: {
            icon: '',
            title: '',
            description: '',
            author: '',
            publisher: '',
            thumbnail: '',
          },
          caption: maliciousCaption,
        })

        const webResult = bookmarkNode.exportDOM(editor, exportOptions)
        const webHtml = (webResult.element as HTMLElement).outerHTML
        expect(webHtml).not.toContain('<img src=x onerror=alert(1)>')
        expect(webHtml).not.toContain('onerror=alert(1)')

        const emailResult = bookmarkNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const emailHtml = (emailResult.element as HTMLElement).innerHTML
        expect(emailHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
        expect(emailHtml).not.toContain('<img src=x onerror=alert(1)>')
      }),
    )

    it(
      'does not double-escape the description in email',
      editorTest(function () {
        const bookmarkNode = $createBookmarkNode({
          url: 'https://www.fake.org/',
          metadata: {
            icon: '',
            title: '',
            description: 'Fish & Chips <3',
            author: '',
            publisher: '',
            thumbnail: '',
          },
          caption: '',
        })
        const result = bookmarkNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const element = result.element as HTMLElement

        expect(element.innerHTML).toContain('Fish &amp; Chips &lt;3')
        expect(element.innerHTML).not.toContain('&amp;amp;')
        expect(element.innerHTML).not.toContain('&amp;lt;')
      }),
    )

    it(
      'escapes a quote-containing URL in email templates',
      editorTest(function () {
        const bookmarkNode = $createBookmarkNode({
          url: '/x"><svg/onload=alert(1)>',
          metadata: {
            icon: '',
            title: 'title',
            description: '',
            author: '',
            publisher: '',
            thumbnail: '',
          },
          caption: '',
        })
        const result = bookmarkNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const element = result.element as HTMLElement

        expect(element.innerHTML).toContain('href="/x&quot;')
        expect(element.querySelector('svg') === null).toBe(true)
        element.querySelectorAll('a').forEach((anchor) => {
          expect(anchor.getAttribute('href')!).toBe('/x"><svg/onload=alert(1)>')
        })
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        const json = bookmarkNode.exportJSON()
        const metadata = dataset.metadata as Record<string, unknown>

        expect(json).toEqual({
          type: 'bookmark',
          version: 1,
          url: dataset.url,
          metadata: {
            icon: metadata.icon,
            title: metadata.title,
            description: metadata.description,
            author: metadata.author,
            publisher: metadata.publisher,
            thumbnail: metadata.thumbnail,
          },
          caption: dataset.caption,
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
                type: 'bookmark',
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
            const [bookmarkNode] = $getRoot().getChildren() as BookmarkNode[]

            expect(bookmarkNode.url).toBe(dataset.url)
            expect(bookmarkNode.icon).toBe((dataset.metadata as Record<string, unknown>).icon)
            expect(bookmarkNode.title).toBe((dataset.metadata as Record<string, unknown>).title)
            expect(bookmarkNode.description).toBe((dataset.metadata as Record<string, unknown>).description)
            expect(bookmarkNode.author).toBe((dataset.metadata as Record<string, unknown>).author)
            expect(bookmarkNode.publisher).toBe((dataset.metadata as Record<string, unknown>).publisher)
            expect(bookmarkNode.thumbnail).toBe((dataset.metadata as Record<string, unknown>).thumbnail)
            expect(bookmarkNode.caption).toBe(dataset.caption)

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
        expect(BookmarkNode.getType()).toBe('bookmark')
      }),
    )

    it(
      'urlTransformMap',
      editorTest(async function () {
        expect(BookmarkNode.urlTransformMap).toEqual({
          url: 'url',
          'metadata.icon': 'url',
          'metadata.thumbnail': 'url',
        })
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses bookmark card',
      editorTest(async function () {
        const metadata = dataset.metadata as Record<string, unknown>
        const document = createDocument(html`
          <figure class="inkling-card inkling-bookmark-card inkling-card-hascaption">
            <a class="inkling-bookmark-container" href="${dataset.url}">
              <div class="inkling-bookmark-content">
                <div class="inkling-bookmark-title">${metadata.title}</div>
                <div class="inkling-bookmark-description">${metadata.description}</div>
                <div class="inkling-bookmark-metadata">
                  <img class="inkling-bookmark-icon" src="${metadata.icon}" alt="" />
                  <span class="inkling-bookmark-author">${metadata.publisher}</span>
                  <span class="inkling-bookmark-publisher">${metadata.author}</span>
                </div>
              </div>
              <div class="inkling-bookmark-thumbnail">
                <img src="${metadata.thumbnail}" alt="" onerror="this.style.display = 'none'" />
              </div>
            </a>
            <figcaption>${dataset.caption}</figcaption>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document)

        expect(nodes.length).toBe(1)
        const node = nodes[0] as BookmarkNode
        expect(node.url).toBe(dataset.url)
        expect(node.icon).toBe((dataset.metadata as Record<string, unknown>).icon)
        expect(node.title).toBe((dataset.metadata as Record<string, unknown>).title)
        expect(node.description).toBe((dataset.metadata as Record<string, unknown>).description)
        expect(node.author).toBe((dataset.metadata as Record<string, unknown>).author)
        expect(node.publisher).toBe((dataset.metadata as Record<string, unknown>).publisher)
        expect(node.thumbnail).toBe((dataset.metadata as Record<string, unknown>).thumbnail)
        expect(node.caption).toBe(dataset.caption)
      }),
    )

    // mixtape embeds parse into bookmark cards
    describe('mixtapes', function () {
      // Mobiledoc {\"version\":\"0.3.1\",\"atoms\":[],\"cards\":[[\"bookmark\",{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"metadata\":{\"url\":\"https://slack.engineering/typescript-at-slack-a81307fa288d\",\"title\":\"TypeScript at Slack\",\"description\":\"When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…\",\"author\":\"Felix Rieseberg\",\"publisher\":\"Several People Are Coding\",\"thumbnail\":\"https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png\",\"icon\":\"https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png\"},\"type\":\"bookmark\"}]],\"markups\":[],\"sections\":[[10,0],[1,\"p\",[]]]}
      // Inkling HTML <figure class="inkling-card inkling-bookmark-card"><a class="inkling-bookmark-container" href="https://slack.engineering/typescript-at-slack-a81307fa288d"><div class="inkling-bookmark-content"><div class="inkling-bookmark-title">TypeScript at Slack</div><div class="inkling-bookmark-description">When Brendan Eich created the very first version of JavaScript for Netscape Navigator 2.0 in merely ten days, it’s likely that he did not expect how far the Slack Desktop App would take his…</div><div class="inkling-bookmark-metadata"><img class="inkling-bookmark-icon" src="https://cdn-images-1.medium.com/fit/c/152/152/1*8I-HPL0bfoIzGied-dzOvA.png"><span class="inkling-bookmark-author">Felix Rieseberg</span><span class="inkling-bookmark-publisher">Several People Are Coding</span></div></div><div class="inkling-bookmark-thumbnail"><img src="https://miro.medium.com/max/1200/1*-h1bH8gB3I7gPh5AG1HmsQ.png"></div></a></figure>
      // Medium Export HTML <div class="graf graf--mixtapeEmbed graf-after--p"><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" data-href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="markup--anchor markup--mixtapeEmbed-anchor" title="https://slack.engineering/typescript-at-slack-a81307fa288d"><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br><em class="markup--em markup--mixtapeEmbed-em">Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em>slack.engineering</a><a href="https://slack.engineering/typescript-at-slack-a81307fa288d" class="js-mixtapeImage mixtapeImage u-ignoreBlock" data-media-id="abc123" data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png" style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"></a></div>

      it(
        'parses mixtape block with all data',
        editorTest(async function () {
          const document = createDocument(
            html`<div class="graf graf--mixtapeEmbed graf-after--p">
              <a
                href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                data-href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                class="markup--anchor markup--mixtapeEmbed-anchor"
                title="https://slack.engineering/typescript-at-slack-a81307fa288d"
                ><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong><br /><em
                  class="markup--em markup--mixtapeEmbed-em"
                  >Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em
                >slack.engineering</a
              ><a
                href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                class="js-mixtapeImage mixtapeImage u-ignoreBlock"
                data-media-id="abc123"
                data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png"
                style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"
              ></a>
            </div>`,
          )
          const nodes = $generateNodesFromDOM(editor, document)

          expect(nodes.length).toBe(1)
          const bookmarkNode = nodes[0] as BookmarkNode

          expect(bookmarkNode.url).toBe('https://slack.engineering/typescript-at-slack-a81307fa288d')
          expect(bookmarkNode.title).toBe('TypeScript at Slack')
          expect(bookmarkNode.description).toBe('Or, How I Learned to Stop Worrying &amp; Trust the Compiler')
          expect(bookmarkNode.publisher).toBe('slack.engineering')
          expect(bookmarkNode.thumbnail).toBe(
            'https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png',
          )
        }),
      )

      it(
        'parses mixtape with missing title',
        editorTest(async function () {
          const document = createDocument(
            html`<div class="graf graf--mixtapeEmbed graf-after--mixtapeEmbed">
              <a
                href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                data-href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                class="markup--anchor markup--mixtapeEmbed-anchor"
                title="https://slack.engineering/typescript-at-slack-a81307fa288d"
                ><br /><em class="markup--em markup--mixtapeEmbed-em"
                  >Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em
                >slack.engineering</a
              ><a
                href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                class="js-mixtapeImage mixtapeImage u-ignoreBlock"
                data-media-id="abc123"
                data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png"
                style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"
              ></a>
            </div>`,
          )
          const nodes = $generateNodesFromDOM(editor, document)

          expect(nodes.length).toBe(1)
          const bookmarkNode = nodes[0] as BookmarkNode

          expect(bookmarkNode.url).toBe('https://slack.engineering/typescript-at-slack-a81307fa288d')
          expect(bookmarkNode.title).toBe('')
          expect(bookmarkNode.description).toBe('Or, How I Learned to Stop Worrying &amp; Trust the Compiler')
          expect(bookmarkNode.publisher).toBe('slack.engineering')
          expect(bookmarkNode.thumbnail).toBe(
            'https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png',
          )
        }),
      )

      it(
        'parses mixtape when title and description are nested descendants',
        editorTest(async function () {
          const document = createDocument(
            html`<div class="graf graf--mixtapeEmbed graf-after--p">
              <a
                href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                data-href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                class="markup--anchor markup--mixtapeEmbed-anchor"
                title="https://slack.engineering/typescript-at-slack-a81307fa288d"
                ><span><strong class="markup--strong markup--mixtapeEmbed-strong">TypeScript at Slack</strong></span
                ><br /><span
                  ><em class="markup--em markup--mixtapeEmbed-em"
                    >Or, How I Learned to Stop Worrying &amp; Trust the Compiler</em
                  ></span
                >slack.engineering</a
              ><a
                href="https://slack.engineering/typescript-at-slack-a81307fa288d"
                class="js-mixtapeImage mixtapeImage u-ignoreBlock"
                data-media-id="abc123"
                data-thumbnail-img-id="1*-h1bH8gB3I7gPh5AG1HmsQ.png"
                style="background-image: url(https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png);"
              ></a>
            </div>`,
          )
          const nodes = $generateNodesFromDOM(editor, document)

          expect(nodes.length).toBe(1)
          const bookmarkNode = nodes[0] as BookmarkNode

          expect(bookmarkNode.url).toBe('https://slack.engineering/typescript-at-slack-a81307fa288d')
          expect(bookmarkNode.title).toBe('TypeScript at Slack')
          expect(bookmarkNode.description).toBe('Or, How I Learned to Stop Worrying &amp; Trust the Compiler')
          expect(bookmarkNode.publisher).toContain('slack.engineering')
          expect(bookmarkNode.thumbnail).toBe(
            'https://cdn-images-1.medium.com/fit/c/160/160/1*-h1bH8gB3I7gPh5AG1HmsQ.png',
          )
        }),
      )
    })
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createBookmarkNode()
        expect(node.getTextContent()).toBe('')

        node.title = 'Test'
        node.description = 'Test description'
        node.url = 'https://example.com'
        node.caption = 'Test <strong>caption</strong>'

        expect(node.getTextContent()).toBe(
          'Test\nTest description\nhttps://example.com\nTest <strong>caption</strong>\n\n',
        )
      }),
    )
  })
})
