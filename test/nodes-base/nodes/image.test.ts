import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, LexicalEditor } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { ImageNode, $createImageNode, $isImageNode } from '@/nodes/base/index'

const editorNodes = [ImageNode]

describe('ImageNode', function () {
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
    editor = createHeadlessEditor({ nodes: editorNodes })

    dataset = {
      src: '/content/images/2022/11/inkling-lexical.jpg',
      width: 3840,
      height: 2160,
      href: '',
      title: 'This is a title',
      alt: 'This is some alt text',
      caption: 'This is a <b>caption</b>',
    }

    exportOptions = {
      imageOptimization: {
        contentImageSizes: {
          w600: { width: 600 },
          w1000: { width: 1000 },
          w1600: { width: 1600 },
          w2400: { width: 2400 },
        },
      },
      canTransformImage: () => true,
      dom,
    }
  })

  it(
    'matches node with $isImageNode',
    editorTest(async function () {
      const imageNode = $createImageNode(dataset)
      expect($isImageNode(imageNode)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const imageNode = $createImageNode(dataset)

        expect(imageNode.src).toBe('/content/images/2022/11/inkling-lexical.jpg')
        expect(imageNode.width!).toBe(3840)
        expect(imageNode.height!).toBe(2160)
        expect(imageNode.title).toBe('This is a title')
        expect(imageNode.alt).toBe('This is some alt text')
        expect(imageNode.caption).toBe('This is a <b>caption</b>')
        expect(imageNode.cardWidth).toBe('regular')
        expect(imageNode.href).toBe('')
      }),
    )

    it(
      'can be created without a dataset',
      editorTest(async function () {
        const imageNode = $createImageNode()

        expect(imageNode.getDataset()).toEqual({
          src: '',
          caption: '',
          title: '',
          alt: '',
          cardWidth: 'regular',
          width: null,
          height: null,
          href: '',
        })
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const imageNode = $createImageNode({} as Record<string, unknown>)

        expect(imageNode.src).toBe('')
        imageNode.src = '/content/images/2022/11/inkling-lexical.jpg'
        expect(imageNode.src).toBe('/content/images/2022/11/inkling-lexical.jpg')

        expect(imageNode.width).toBe(null)
        imageNode.width = 3840
        expect(imageNode.width).toBe(3840)

        expect(imageNode.height).toBe(null)
        imageNode.height = 2160
        expect(imageNode.height).toBe(2160)

        expect(imageNode.title).toBe('')
        imageNode.title = 'I am a title'
        expect(imageNode.title).toBe('I am a title')

        expect(imageNode.alt).toBe('')
        imageNode.alt = 'I am alt text'
        expect(imageNode.alt).toBe('I am alt text')

        expect(imageNode.caption).toBe('')
        imageNode.caption = 'I am a <b>Caption</b>'
        expect(imageNode.caption).toBe('I am a <b>Caption</b>')

        expect(imageNode.cardWidth).toBe('regular')
        imageNode.cardWidth = 'wide'
        expect(imageNode.cardWidth).toBe('wide')

        expect(imageNode.href).toBe('')
        imageNode.href = 'https://example.com'
        expect(imageNode.href).toBe('https://example.com')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const imageNode = $createImageNode(dataset)
        const imageNodeDataset = imageNode.getDataset()

        expect(imageNodeDataset).toEqual({
          ...dataset,
          cardWidth: 'regular',
        })
      }),
    )
  })

  describe('exportDOM', function () {
    it(
      'creates a full-featured image card',
      editorTest(async function () {
        const imageNode = $createImageNode(dataset)
        const { element } = imageNode.exportDOM(editor, exportOptions)

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-image-card inkling-card-hascaption">
              <img
                src="/content/images/2022/11/inkling-lexical.jpg"
                class="inkling-image"
                alt="This is some alt text"
                loading="lazy"
                title="This is a title"
                width="3840"
                height="2160"
                srcset="
                  /content/images/size/w600/2022/11/inkling-lexical.jpg   600w,
                  /content/images/size/w1000/2022/11/inkling-lexical.jpg 1000w,
                  /content/images/size/w1600/2022/11/inkling-lexical.jpg 1600w,
                  /content/images/size/w2400/2022/11/inkling-lexical.jpg 2400w
                "
                sizes="(min-width: 720px) 720px"
              />
              <figcaption>This is a <b>caption</b></figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'sanitizes caption HTML',
      editorTest(async function () {
        const imageNode = $createImageNode({
          ...dataset,
          caption: 'Caption \u003cscript\u003ealert(1)\u003c/script\u003e \u003cimg src=x onerror=alert(1)\u003e',
        })
        const { element } = imageNode.exportDOM(editor, exportOptions)
        const html = (element as HTMLElement).outerHTML

        expect(html).not.toContain('\u003cscript')
        expect(html).not.toContain('onerror')
        expect(html).toContain('Caption')
      }),
    )

    it(
      'creates a full-featured image card with link',
      editorTest(async function () {
        const imageNode = $createImageNode({
          ...dataset,
          href: 'https://example.com',
        })
        const { element } = imageNode.exportDOM(editor, exportOptions)

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-image-card inkling-card-hascaption">
              <a href="https://example.com"
                ><img
                  src="/content/images/2022/11/inkling-lexical.jpg"
                  class="inkling-image"
                  alt="This is some alt text"
                  loading="lazy"
                  title="This is a title"
                  width="3840"
                  height="2160"
                  srcset="
                    /content/images/size/w600/2022/11/inkling-lexical.jpg   600w,
                    /content/images/size/w1000/2022/11/inkling-lexical.jpg 1000w,
                    /content/images/size/w1600/2022/11/inkling-lexical.jpg 1600w,
                    /content/images/size/w2400/2022/11/inkling-lexical.jpg 2400w
                  "
                  sizes="(min-width: 720px) 720px"
              /></a>
              <figcaption>This is a <b>caption</b></figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'drops the link when the href is unsafe',
      editorTest(async function () {
        const imageNode = $createImageNode({
          src: '/image.png',
          href: 'javascript:alert(1)',
        })
        const { element } = imageNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML

        expect(output).not.toContain('<a')
        expect(output).not.toContain('javascript:')
        expect(output).toContain('<img src="/image.png"')
      }),
    )

    it(
      'creates a minimal image card',
      editorTest(async function () {
        const imageNode = $createImageNode({ src: '/image.png' })
        const { element } = imageNode.exportDOM(editor, exportOptions)

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-image-card">
              <img src="/image.png" class="inkling-image" alt="" loading="lazy" />
            </figure>
          `,
        )
      }),
    )

    it(
      'renders an empty span with a missing src',
      editorTest(async function () {
        const imageNode = $createImageNode({} as Record<string, unknown>)
        const { element } = imageNode.exportDOM(editor, exportOptions)

        expect((element as HTMLElement).outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'renders a wide image',
      editorTest(async function () {
        dataset.cardWidth = 'wide'
        const imageNode = $createImageNode(dataset)
        const { element } = imageNode.exportDOM(editor, exportOptions)

        expect((element as HTMLElement).classList.contains('inkling-width-wide')).toBe(true)
      }),
    )

    it(
      "uses resized width and height when there's a max width",
      editorTest(async function () {
        dataset.width = 3000
        dataset.height = 6000
        // add defaultMaxWidth property to options
        ;(exportOptions.imageOptimization as Record<string, unknown>).defaultMaxWidth = 2000
        exportOptions.canTransformImage = () => true

        const imageNode = $createImageNode(dataset)
        const { element } = imageNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML

        expect(output).toContain('width="2000"')
        expect(output).toContain('height="4000"')
      }),
    )

    it(
      'uses original width and height when transform is not available',
      editorTest(async function () {
        dataset.width = 3000
        dataset.height = 6000
        exportOptions.canTransformImage = () => false

        const imageNode = $createImageNode(dataset)
        const { element } = imageNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML

        expect(output).toContain('width="3000" height="6000"')
      }),
    )

    describe('srcset attribute', function () {
      it(
        'is ommitted when target is email',
        editorTest(async function () {
          exportOptions.target = 'email'

          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, exportOptions)
          const output = (element as HTMLElement).outerHTML

          expect(output).not.toContain('srcset')
        }),
      )

      it('is included for absolute images when siteUrl has trailing slash')
      it('is omitted when no contentImageSizes are passed as options')
      it('is omitted when `srcsets: false` is passed in as an option')
      it('is omitted when canTransformImages is provided and returns false')
      it('is omitted when no width is provided')
      it('is omitted when image is smaller than minimum responsive width')
      it('omits sizes larger than image width and includes origin image width if smaller than largest responsive width')
      it('works correctly with subdirectories')
      it('works correctly with absolute subdirectories')
    })

    describe('sizes attribute', function () {
      it(
        'is added for standard images',
        editorTest(async function () {
          dataset.width = 3000
          dataset.height = 6000

          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, exportOptions)
          const output = (element as HTMLElement).outerHTML

          expect(output).toContain('sizes="(min-width: 720px) 720px"')
        }),
      )

      it(
        'is added for wide images',
        editorTest(async function () {
          dataset.width = 3000
          dataset.height = 2000
          dataset.cardWidth = 'wide'

          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, exportOptions)
          const output = (element as HTMLElement).outerHTML

          expect(output).toContain('sizes="(min-width: 1200px) 1200px"')
        }),
      )

      it('is omitted when srcset is not added')
      it('is omitted when width is missing')
      it('is included when only height is missing')
      it('is omitted for standard images when width is less than 720')
      it('is omitted for wide images when width is less than 1200')
      it('is omitted for full images')
    })

    describe('email target', function () {
      it('adds width/height and uses resized local image')
      it('adds width/height and uses original src when local image cannot be transformed')
      it('uses original image if size is smaller than "retina" size')
      it('uses original image width/height if image is smaller than 600px wide')
      it('skips width/height and resize if payload is missing dimensions')
      it('omits srcset attribute')
    })

    describe('picture element', function () {
      const pictureOptions = () => ({
        ...exportOptions,
        feature: { pictureImageFormats: true },
        canTransformImageToFormat: () => true,
      })

      it(
        'wraps the image in a picture element with avif/webp sources when the feature flag is on',
        editorTest(async function () {
          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, pictureOptions())
          const el = element as HTMLElement

          const picture = el.querySelector('picture')
          expect(picture).not.toBeNull()

          const sources = picture!.querySelectorAll('source')
          expect(sources.length).toBe(2)
          expect(sources[0].getAttribute('type')).toBe('image/avif')
          expect(sources[0].getAttribute('srcset')).toContain('/content/images/size/w600/format/avif/')
          expect(sources[0].getAttribute('sizes')).toBe('(min-width: 720px) 720px')
          expect(sources[1].getAttribute('type')).toBe('image/webp')
          expect(sources[1].getAttribute('srcset')).toContain('/content/images/size/w600/format/webp/')

          const img = picture!.querySelector('img')
          expect(img).not.toBeNull()
          expect(img!.getAttribute('src')).toBe('/content/images/2022/11/inkling-lexical.jpg')
        }),
      )

      it(
        'wraps the picture inside the link when href is set',
        editorTest(async function () {
          const imageNode = $createImageNode({ ...dataset, href: 'https://example.com' })
          const { element } = imageNode.exportDOM(editor, pictureOptions())
          const el = element as HTMLElement

          const link = el.querySelector('a[href="https://example.com"]')
          expect(link).not.toBeNull()
          expect(link!.querySelector('picture')).not.toBeNull()
        }),
      )

      it(
        'is omitted for animated (gif) images',
        editorTest(async function () {
          const imageNode = $createImageNode({ ...dataset, src: '/content/images/2022/11/animation.gif' })
          const { element } = imageNode.exportDOM(editor, pictureOptions())
          const el = element as HTMLElement

          expect(el.querySelector('picture')).toBeNull()
          expect(el.querySelector('img')).not.toBeNull()
        }),
      )

      it(
        'is omitted when canTransformImageToFormat rejects every format',
        editorTest(async function () {
          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, {
            ...exportOptions,
            feature: { pictureImageFormats: true },
            canTransformImageToFormat: () => false,
          })
          const el = element as HTMLElement

          expect(el.querySelector('picture')).toBeNull()
          expect(el.querySelector('img')).not.toBeNull()
        }),
      )

      it(
        'is omitted when the feature flag is off',
        editorTest(async function () {
          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          expect(el.querySelector('picture')).toBeNull()
        }),
      )

      it(
        'is omitted when target is email',
        editorTest(async function () {
          const imageNode = $createImageNode(dataset)
          const { element } = imageNode.exportDOM(editor, { ...pictureOptions(), target: 'email' })
          const el = element as HTMLElement

          expect(el.querySelector('picture')).toBeNull()
          expect(el.querySelector('source')).toBeNull()
        }),
      )
    })
  })

  describe('importDOM', function () {
    it(
      'parses an img element',
      editorTest(async function () {
        const document = createDocument(html`
          <img src="/image.png" alt="Alt text" title="Title text" width="3000" height="2000" />
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('/image.png')
        expect(nodes[0].alt).toBe('Alt text')
        expect(nodes[0].title).toBe('Title text')
        expect(nodes[0].width!).toBe(3000)
        expect(nodes[0].height!).toBe(2000)
      }),
    )

    it(
      'parses IMG inside FIGURE to image card without caption',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <img src="http://example.com/test.png" alt="Alt test" title="Title test" />
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].alt).toBe('Alt test')
        expect(nodes[0].title).toBe('Title test')
      }),
    )

    it(
      'parses IMG inside FIGURE to image card with caption',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <img src="http://example.com/test.png" />
            <figcaption>&nbsp; <strong>Caption test</strong></figcaption>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].caption).toBe('<strong>Caption test</strong>')
      }),
    )

    it(
      'extracts Inkling card widths',
      editorTest(async function () {
        const document = createDocument(html`
          <figure class="inkling-card inkling-width-wide">
            <img src="http://example.com/test.png" />
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].cardWidth).toBe('wide')
      }),
    )

    it(
      'extracts Medium card widths',
      editorTest(async function () {
        const document = createDocument(html`
          <figure class="graf--layoutFillWidth">
            <img src="http://example.com/test.png" />
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].cardWidth).toBe('full')
      }),
    )

    it(
      'extracts IMG dimensions from width/height attrs',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <img src="http://example.com/test.png" width="640" height="480" />
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].width!).toBe(640)
        expect(nodes[0].height!).toBe(480)
      }),
    )

    it(
      'extracts IMG dimensions from dataset',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <img src="http://example.com/test.png" width="640" height="480" />
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].width!).toBe(640)
        expect(nodes[0].height!).toBe(480)
      }),
    )

    it(
      'extracts IMG dimensions from data-image-dimensions',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <img src="http://example.com/test.png" data-image-dimensions="640x480" />
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].width!).toBe(640)
        expect(nodes[0].height!).toBe(480)
      }),
    )

    it(
      'extracts href when img wrapped in anchor tag',
      editorTest(async function () {
        const document = createDocument(html`
          <figure>
            <a href="https://example.com/link">
              <img src="http://example.com/test.png" />
            </a>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].href).toBe('https://example.com/link')
      }),
    )

    it(
      'extracts href when img wrapped in anchor tag not within figure',
      editorTest(async function () {
        const document = createDocument(html`
          <a href="https://example.com/link">
            <img src="http://example.com/test.png" />
          </a>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as ImageNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('http://example.com/test.png')
        expect(nodes[0].href).toBe('https://example.com/link')
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        dataset.cardWidth = 'wide'

        const imageNode = $createImageNode(dataset)
        const json = imageNode.exportJSON()

        expect(json).toEqual({
          type: 'image',
          version: 1,
          src: '/content/images/2022/11/inkling-lexical.jpg',
          width: 3840,
          height: 2160,
          title: 'This is a title',
          alt: 'This is some alt text',
          caption: 'This is a <b>caption</b>',
          cardWidth: 'wide',
          href: '',
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
                type: 'image',
                ...dataset,
                cardWidth: 'wide',
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
            const [imageNode] = $getRoot().getChildren() as ImageNode[]

            expect(imageNode.src).toBe('/content/images/2022/11/inkling-lexical.jpg')
            expect(imageNode.width!).toBe(3840)
            expect(imageNode.height!).toBe(2160)
            expect(imageNode.title).toBe('This is a title')
            expect(imageNode.alt).toBe('This is some alt text')
            expect(imageNode.caption).toBe('This is a <b>caption</b>')
            expect(imageNode.cardWidth).toBe('wide')

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
        const node = $createImageNode({} as Record<string, unknown>)
        expect(node.getTextContent()).toBe('')

        node.caption = 'Test caption'
        expect(node.getTextContent()).toBe('Test caption\n\n')
      }),
    )
  })
})
