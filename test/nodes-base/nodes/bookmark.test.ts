import 'should'
import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import Prettier from '@prettier/sync'
import { $getRoot } from 'lexical'

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
      $isBookmarkNode(bookmarkNode).should.be.true()
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)

        const metadata = dataset.metadata as Record<string, unknown>
        bookmarkNode.url.should.equal(dataset.url)
        bookmarkNode.icon.should.equal(metadata.icon)
        bookmarkNode.title.should.equal(metadata.title)
        bookmarkNode.description.should.equal(metadata.description)
        bookmarkNode.author.should.equal(metadata.author)
        bookmarkNode.publisher.should.equal(metadata.publisher)
        bookmarkNode.thumbnail.should.equal(metadata.thumbnail)
        bookmarkNode.caption.should.equal(dataset.caption)
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode()

        bookmarkNode.url.should.equal('')
        bookmarkNode.url = 'https://inkling.local/'
        bookmarkNode.url.should.equal('https://inkling.local/')

        bookmarkNode.icon.should.equal('')
        bookmarkNode.icon = 'https://inkling.local/favicon.ico'
        bookmarkNode.icon.should.equal('https://inkling.local/favicon.ico')

        bookmarkNode.title.should.equal('')
        bookmarkNode.title = 'Inkling: The Creator Economy Platform'
        bookmarkNode.title.should.equal('Inkling: The Creator Economy Platform')

        bookmarkNode.description.should.equal('')
        bookmarkNode.description = 'doing kewl stuff'
        bookmarkNode.description.should.equal('doing kewl stuff')

        bookmarkNode.author.should.equal('')
        bookmarkNode.author = 'inkling'
        bookmarkNode.author.should.equal('inkling')

        bookmarkNode.publisher.should.equal('')
        bookmarkNode.publisher = 'Inkling - The Professional Publishing Platform'
        bookmarkNode.publisher.should.equal('Inkling - The Professional Publishing Platform')

        bookmarkNode.thumbnail.should.equal('')
        bookmarkNode.thumbnail = 'https://inkling.local/images/meta/inkling.png'
        bookmarkNode.thumbnail.should.equal('https://inkling.local/images/meta/inkling.png')

        bookmarkNode.caption.should.equal('')
        bookmarkNode.caption = 'caption here'
        bookmarkNode.caption.should.equal('caption here')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)
        const bookmarkNodeDataset = bookmarkNode.getDataset()

        bookmarkNodeDataset.should.deepEqual({
          ...dataset,
        })
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        BookmarkNode.getType().should.equal('bookmark')
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

        cloneDataset.should.deepEqual({ ...bookmarkNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        BookmarkNode.urlTransformMap.should.deepEqual({
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
        bookmarkNode.hasEditMode().should.be.true()
      }),
    )
  })

  describe('isEmpty', function () {
    it(
      'returns true if url is empty',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode(dataset)

        bookmarkNode.isEmpty().should.be.false()
        bookmarkNode.url = ''
        bookmarkNode.isEmpty().should.be.true()
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

        await element.outerHTML.should.prettifyTo(prettyExpectedHtml)
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

        element.innerHTML.should.containEql('<!--[if !mso !vml]-->')
        element.innerHTML.should.containEql('<figure class="inkling-card inkling-bookmark-card')
        element.innerHTML.should.containEql('<!--[if vml]>')
        element.innerHTML.should.containEql('<table class="inkling-card inkling-bookmark-card--outlook"')
      }),
    )

    it(
      'renders an empty span with a missing src',
      editorTest(async function () {
        const bookmarkNode = $createBookmarkNode()
        const result = bookmarkNode.exportDOM(editor, exportOptions)
        const element = result.element as HTMLElement

        element.outerHTML.should.equal('<span></span>')
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
        element.innerHTML.should.containEql(
          'Inkling: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.',
        )
        element.innerHTML.should.containEql('doing "kewl" stuff')
        element.innerHTML.should.containEql("fa'ker")
        element.innerHTML.should.containEql('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;')

        // Check that caption is sanitized before insertion
        element.innerHTML.should.containEql(
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
        element.innerHTML.should.containEql('<!--[if !mso !vml]-->')

        // Check that text fields are escaped
        element.innerHTML.should.containEql(
          'Inkling: Independent technology &lt;script&gt;alert("XSS")&lt;/script&gt; for modern publishing.',
        )
        element.innerHTML.should.containEql('doing "kewl" stuff')
        element.innerHTML.should.containEql("fa'ker")
        element.innerHTML.should.containEql('Fake &lt;script&gt;alert("XSS")&lt;/script&gt;')

        // Check that caption is escaped
        element.innerHTML.should.containEql(
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

        element.outerHTML.should.equal('<span></span>')
      }),
    )

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
        webHtml.should.not.containEql('<img src=x onerror=alert(1)>')
        webHtml.should.not.containEql('onerror=alert(1)')

        const emailResult = bookmarkNode.exportDOM(editor, { ...exportOptions, target: 'email' })
        const emailHtml = (emailResult.element as HTMLElement).innerHTML
        emailHtml.should.containEql('&lt;img src=x onerror=alert(1)&gt;')
        emailHtml.should.not.containEql('<img src=x onerror=alert(1)>')
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

        element.innerHTML.should.containEql('Fish &amp; Chips &lt;3')
        element.innerHTML.should.not.containEql('&amp;amp;')
        element.innerHTML.should.not.containEql('&amp;lt;')
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

        element.innerHTML.should.containEql('href="/x&quot;')
        ;(element.querySelector('svg') === null).should.be.true()
        element.querySelectorAll('a').forEach((anchor) => {
          anchor.getAttribute('href')!.should.equal('/x"><svg/onload=alert(1)>')
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

        json.should.deepEqual({
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

            bookmarkNode.url.should.equal(dataset.url)
            bookmarkNode.icon.should.equal((dataset.metadata as Record<string, unknown>).icon)
            bookmarkNode.title.should.equal((dataset.metadata as Record<string, unknown>).title)
            bookmarkNode.description.should.equal((dataset.metadata as Record<string, unknown>).description)
            bookmarkNode.author.should.equal((dataset.metadata as Record<string, unknown>).author)
            bookmarkNode.publisher.should.equal((dataset.metadata as Record<string, unknown>).publisher)
            bookmarkNode.thumbnail.should.equal((dataset.metadata as Record<string, unknown>).thumbnail)
            bookmarkNode.caption.should.equal(dataset.caption)

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
        BookmarkNode.getType().should.equal('bookmark')
      }),
    )

    it(
      'urlTransformMap',
      editorTest(async function () {
        BookmarkNode.urlTransformMap.should.deepEqual({
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

        nodes.length.should.equal(1)
        const node = nodes[0] as BookmarkNode
        node.url.should.equal(dataset.url)
        node.icon.should.equal((dataset.metadata as Record<string, unknown>).icon)
        node.title.should.equal((dataset.metadata as Record<string, unknown>).title)
        node.description.should.equal((dataset.metadata as Record<string, unknown>).description)
        node.author.should.equal((dataset.metadata as Record<string, unknown>).author)
        node.publisher.should.equal((dataset.metadata as Record<string, unknown>).publisher)
        node.thumbnail.should.equal((dataset.metadata as Record<string, unknown>).thumbnail)
        node.caption.should.equal(dataset.caption)
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

          nodes.length.should.equal(1)
          const bookmarkNode = nodes[0] as BookmarkNode

          bookmarkNode.url.should.equal('https://slack.engineering/typescript-at-slack-a81307fa288d')
          bookmarkNode.title.should.equal('TypeScript at Slack')
          bookmarkNode.description.should.equal('Or, How I Learned to Stop Worrying &amp; Trust the Compiler')
          bookmarkNode.publisher.should.equal('slack.engineering')
          bookmarkNode.thumbnail.should.equal(
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

          nodes.length.should.equal(1)
          const bookmarkNode = nodes[0] as BookmarkNode

          bookmarkNode.url.should.equal('https://slack.engineering/typescript-at-slack-a81307fa288d')
          bookmarkNode.title.should.equal('')
          bookmarkNode.description.should.equal('Or, How I Learned to Stop Worrying &amp; Trust the Compiler')
          bookmarkNode.publisher.should.equal('slack.engineering')
          bookmarkNode.thumbnail.should.equal(
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

          nodes.length.should.equal(1)
          const bookmarkNode = nodes[0] as BookmarkNode

          bookmarkNode.url.should.equal('https://slack.engineering/typescript-at-slack-a81307fa288d')
          bookmarkNode.title.should.equal('TypeScript at Slack')
          bookmarkNode.description.should.equal('Or, How I Learned to Stop Worrying &amp; Trust the Compiler')
          bookmarkNode.publisher.should.containEql('slack.engineering')
          bookmarkNode.thumbnail.should.equal(
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
        node.getTextContent().should.equal('')

        node.title = 'Test'
        node.description = 'Test description'
        node.url = 'https://example.com'
        node.caption = 'Test <strong>caption</strong>'

        node
          .getTextContent()
          .should.equal('Test\nTest description\nhttps://example.com\nTest <strong>caption</strong>\n\n')
      }),
    )
  })
})
