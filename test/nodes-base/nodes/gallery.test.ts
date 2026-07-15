import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, LexicalEditor } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { GalleryNode, $createGalleryNode, $isGalleryNode, ImageNode } from '@/nodes/base/index'

// include ImageNode so we can make sure imported sibling nodes do not get
// processed by other lower priority nodes when skipped with dataset.hasBeenProcessed
const editorNodes = [GalleryNode, ImageNode]

describe('GalleryNode', function () {
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
      images: [
        {
          row: 0,
          fileName: 'NatGeo01.jpg',
          src: '/content/images/2018/08/NatGeo01-9.jpg',
          width: 3200,
          height: 1600,
        },
        {
          row: 0,
          fileName: 'NatGeo02.jpg',
          src: '/content/images/2018/08/NatGeo02-10.jpg',
          width: 3200,
          height: 1600,
        },
        {
          row: 0,
          fileName: 'NatGeo03.jpg',
          src: '/content/images/2018/08/NatGeo03-6.jpg',
          width: 3200,
          height: 1600,
        },
        {
          row: 1,
          fileName: 'NatGeo04.jpg',
          src: '/content/images/2018/08/NatGeo04-7.jpg',
          alt: 'Alt test',
          width: 3200,
          height: 1600,
        },
        {
          row: 1,
          fileName: 'NatGeo05.jpg',
          src: '/content/images/2018/08/NatGeo05-4.jpg',
          title: 'Title test',
          width: 3200,
          height: 1600,
        },
        {
          row: 1,
          fileName: 'NatGeo06.jpg',
          src: '/content/images/2018/08/NatGeo06-6.jpg',
          width: 3200,
          height: 1600,
        },
        {
          row: 2,
          fileName: 'NatGeo07.jpg',
          src: '/content/images/2018/08/NatGeo07-5.jpg',
          width: 3200,
          height: 1600,
        },
        {
          row: 2,
          fileName: 'NatGeo09.jpg',
          src: '/content/images/2018/08/NatGeo09-8.jpg',
          width: 3200,
          height: 1600,
          href: 'https://example.com',
        },
      ],
      caption: 'Test caption',
    }

    exportOptions = {
      imageOptimization: {
        defaultMaxWidth: 2000,
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
    'matches node with $isGalleryNode',
    editorTest(async function () {
      const node = $createGalleryNode(dataset)
      expect($isGalleryNode(node)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const galleryNode = $createGalleryNode(dataset)

        expect(galleryNode.images).toEqual(dataset.images)
        expect(galleryNode.caption).toBe(dataset.caption)
      }),
    )

    it(
      'can be created without a dataset',
      editorTest(async function () {
        const galleryNode = $createGalleryNode()

        expect(galleryNode.getDataset()).toEqual({
          images: [],
          caption: '',
        })
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({} as Record<string, unknown>)

        expect(galleryNode.images).toEqual([])
        galleryNode.images = [{ src: 'image1.jpg' }]
        expect(galleryNode.images).toEqual([{ src: 'image1.jpg' }])

        expect(galleryNode.caption).toBe('')
        galleryNode.caption = 'New caption'
        expect(galleryNode.caption).toBe('New caption')
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const galleryNode = $createGalleryNode(dataset)

        expect(galleryNode.getDataset()).toEqual(dataset)
      }),
    )
  })

  describe('getType', function () {
    it(
      'returns the correct node type',
      editorTest(async function () {
        expect(GalleryNode.getType()).toBe('gallery')
      }),
    )
  })

  describe('clone', function () {
    it(
      'returns a copy of the current node',
      editorTest(async function () {
        const galleryNode = $createGalleryNode(dataset)
        const galleryNodeDataset = galleryNode.getDataset()
        const clone = GalleryNode.clone(galleryNode) as GalleryNode
        const cloneDataset = clone.getDataset()

        expect(cloneDataset).toEqual({ ...galleryNodeDataset })
      }),
    )
  })

  describe('urlTransformMap', function () {
    it(
      'contains the expected URL mapping',
      editorTest(async function () {
        expect(GalleryNode.urlTransformMap).toEqual({
          caption: 'html',
          images: {
            src: 'url',
            caption: 'html',
          },
        })
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns false',
      editorTest(async function () {
        const galleryNode = $createGalleryNode(dataset)
        expect(galleryNode.hasEditMode()).toBe(false)
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
                type: 'gallery',
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
            const [galleryNode] = $getRoot().getChildren() as GalleryNode[]

            expect(galleryNode.images).toEqual(dataset.images)
            expect(galleryNode.caption).toBe(dataset.caption)

            resolve()
          } catch (e) {
            reject(e)
          }
        })
      }))
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        const galleryNode = $createGalleryNode(dataset)
        const json = galleryNode.exportJSON()

        expect(json).toEqual({
          type: 'gallery',
          version: 1,
          images: dataset.images,
          caption: dataset.caption,
        })
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses gallery card',
      editorTest(async function () {
        const document = createDocument(`
                <!--inkling-card-begin: gallery-->
                <figure class="inkling-card inkling-gallery-card inkling-width-wide">
                    <div class="inkling-gallery-container">
                        <div class="inkling-gallery-row">
                            <div class="inkling-gallery-image" style="flex: 1.5 1 0%;">
                                <a href="https://example.com/1">
                                    <img src="http://localhost:2368/content/images/2019/06/jklm4567.jpeg" width="1200" height="800">
                                </a>
                            </div>
                            <div class="inkling-gallery-image" style="flex: 1.5 1 0%;">
                                <img src="http://localhost:2368/content/images/2019/06/qurt6789.jpeg" width="1200" height="800"></div>
                            </div>
                            <div class="inkling-gallery-row"><div class="inkling-gallery-image" style="flex: 1.50094 1 0%;">
                                <a href="https://example.com/3">
                                    <img src="http://localhost:2368/content/images/2019/06/zyxw3456.jpeg" width="1600" height="1066">
                                </a>
                            </div>
                            <div class="inkling-gallery-image" style="flex: 0.666667 1 0%;">
                                <img src="http://localhost:2368/content/images/2019/06/1234abcd.jpeg" width="800" height="1200">
                            </div>
                        </div>
                    </div>
                    <figcaption>My <em>exciting</em> caption</figcaption>
                </figure>
                <!--inkling-card-end: gallery-->
            `)

        const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
        expect(nodes.length).toBe(1)

        expect(nodes[0].images).toEqual([
          {
            fileName: 'jklm4567.jpeg',
            row: 0,
            src: 'http://localhost:2368/content/images/2019/06/jklm4567.jpeg',
            width: 1200,
            height: 800,
            href: 'https://example.com/1',
          },
          {
            fileName: 'qurt6789.jpeg',
            row: 0,
            src: 'http://localhost:2368/content/images/2019/06/qurt6789.jpeg',
            width: 1200,
            height: 800,
          },
          {
            fileName: 'zyxw3456.jpeg',
            row: 0,
            src: 'http://localhost:2368/content/images/2019/06/zyxw3456.jpeg',
            width: 1600,
            height: 1066,
            href: 'https://example.com/3',
          },
          {
            fileName: '1234abcd.jpeg',
            row: 1,
            src: 'http://localhost:2368/content/images/2019/06/1234abcd.jpeg',
            width: 800,
            height: 1200,
          },
        ])

        expect(nodes[0].caption).toBe('My <em>exciting</em> caption')
      }),
    )

    it(
      'parses Medium gallery',
      editorTest(async function () {
        // Medium Export HTML <div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg"></div></figure></div><div data-paragraph-count="2"><figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg"></div></figure><figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;"><div class="aspectRatioPlaceholder is-locked"><img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg"></div></figure></div>
        const document = createDocument(`
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 50%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="qurt6789.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg">
                        </div>
                    </figure>
                </div>
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 69.22%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="1234abcd.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg">
                        </div>
                    </figure>
                </div>
            `)

        const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
        expect(nodes.length).toBe(1)

        expect(nodes[0].images).toEqual([
          {
            fileName: 'jklm4567.jpeg',
            row: 0,
            src: 'https://cdn-images-1.medium.com/max/600/jklm4567.jpeg',
            width: 1200,
            height: 800,
          },
          {
            fileName: 'qurt6789.jpeg',
            row: 0,
            src: 'https://cdn-images-1.medium.com/max/600/qurt6789.jpeg',
            width: 1200,
            height: 800,
          },
          {
            fileName: 'zyxw3456.jpeg',
            row: 0,
            src: 'https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg',
            width: 1200,
            height: 800,
          },
          {
            fileName: '1234abcd.jpeg',
            row: 1,
            src: 'https://cdn-images-1.medium.com/max/400/1234abcd.jpeg',
            width: 800,
            height: 1200,
          },
        ])

        expect(nodes[0].caption).toBe('')
      }),
    )

    it(
      'handles Medium galleries with multiple captions',
      editorTest(async function () {
        const document = createDocument(`
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--h3" style="width: 69.22%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="jklm4567.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/600/jklm4567.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 30.78%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="qurt6789.jpeg" data-width="800" data-height="1200" src="https://cdn-images-1.medium.com/max/600/qurt6789.jpeg">
                        </div>
                        <figcaption class="imageCaption" style="width: 324.886%; left: -224.886%;">First Caption</figcaption>
                    </figure>
                </div>
                <div data-paragraph-count="2">
                    <figure class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 49.983%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="zyxw3456.jpeg" data-width="1200" data-height="800" src="https://cdn-images-1.medium.com/max/800/zyxw3456.jpeg">
                        </div>
                    </figure>
                    <figure class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50.017%;">
                        <div class="aspectRatioPlaceholder is-locked">
                            <img class="graf-image" data-image-id="1234abcd.jpeg" data-width="1600" data-height="1066" src="https://cdn-images-1.medium.com/max/400/1234abcd.jpeg">
                        </div>
                        <figcaption class="imageCaption" style="width: 199.932%; left: -99.932%;">End Caption</figcaption>
                    </figure>
                </div>
            `)

        const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
        expect(nodes.length).toBe(1)

        expect(nodes[0].caption).toBe('First Caption / End Caption')
      }),
    )

    describe('Squarespace galleries', function () {
      // Three different variations of galleries:
      // stacked, grid, and slideshow
      // stacked: <div class="sqs-gallery-container sqs-gallery-block-stacked"><div class="sqs-gallery"><div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 1</h3></div></div><div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image"><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="meta" id="8793002jf84od" data-type="image"><div class="meta-inside"><h3 class="meta-title">Image caption 2</h3></div></div></div></div>
      // slideshow: <div class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom"><div class="sqs-gallery"><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test.jpg" data-image-dimensions="2500x1663" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567890" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-1.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-1.jpg" data-image-dimensions="800x600" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567891" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-2.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-2.jpg" data-image-dimensions="600x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567892" data-type="image" /></div><div class="slide content-fill" data-type="image" data-click-through-url><noscript><img src="https://example.com/test-3.jpg" alt="image alt text"></noscript><img class="thumb-image" data-src="https://example.com/test-3.jpg" data-image-dimensions="800x800" data-image-focal-point="0.5,0.5" alt="image alt text" data-load="false" data-image-id="1234567893" data-type="image" /></div></div></div>

      it(
        'parses a stacked gallery into gallery card',
        editorTest(async function () {
          const document = createDocument(html`
            <div class="sqs-gallery-container sqs-gallery-block-stacked">
              <div class="sqs-gallery">
                <div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image">
                  <noscript>
                    <img src="https://example.com/test.jpg" alt="image alt text" />
                  </noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test.jpg"
                    data-image-dimensions="2500x1663"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text"
                    data-load="false"
                    data-image-id="1234567890"
                    data-type="image"
                  />
                </div>
                <div class="meta" id="8793002jf84od" data-type="image"></div>
                <div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image">
                  <noscript>
                    <img src="https://example.com/test-1.jpg" alt="image alt text 1" />
                  </noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-1.jpg"
                    data-image-dimensions="800x600"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 1"
                    data-load="false"
                    data-image-id="1234567891"
                    data-type="image"
                  />
                </div>
                <div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image">
                  <noscript>
                    <img src="https://example.com/test-2.jpg" alt="image alt text 2" />
                  </noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-2.jpg"
                    data-image-dimensions="600x800"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 2"
                    data-load="false"
                    data-image-id="1234567892"
                    data-type="image"
                  />
                </div>
                <div class="meta" id="8793002jf84od" data-type="image"></div>
              </div>
            </div>
          `)

          const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
          expect(nodes.length).toBe(1)

          expect(nodes[0].getType()).toBe('gallery')

          const images = nodes[0].images

          expect(images).toBeInstanceOf(Array)
          expect(images).toHaveLength(3)
          expect(images).toEqual([
            {
              fileName: 'test.jpg',
              row: 0,
              src: 'https://example.com/test.jpg',
              width: 2500,
              height: 1663,
              alt: 'image alt text',
            },
            {
              fileName: 'test-1.jpg',
              row: 0,
              src: 'https://example.com/test-1.jpg',
              width: 800,
              height: 600,
              alt: 'image alt text 1',
            },
            {
              fileName: 'test-2.jpg',
              row: 0,
              src: 'https://example.com/test-2.jpg',
              width: 600,
              height: 800,
              alt: 'image alt text 2',
            },
          ])

          expect(nodes[0].caption).toBe('')
        }),
      )

      it(
        'can handle multiple captions',
        editorTest(async function () {
          const document = createDocument(html`
            <div class="sqs-gallery-container sqs-gallery-block-stacked">
              <div class="sqs-gallery">
                <div class="image-wrapper" id="1234567890" data-type="image" data-animation-role="image">
                  <noscript><img src="https://example.com/test.jpg" alt="image alt text" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test.jpg"
                    data-image-dimensions="2500x1663"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text"
                    data-load="false"
                    data-image-id="1234567890"
                    data-type="image"
                  />
                </div>
                <div class="meta" id="8793002jf84od" data-type="image">
                  <div class="meta-inside">
                    <h3 class="meta-title">Image caption 1</h3>
                  </div>
                </div>
                <div class="image-wrapper" id="1234567891" data-type="image" data-animation-role="image">
                  <noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-1.jpg"
                    data-image-dimensions="800x600"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 1"
                    data-load="false"
                    data-image-id="1234567891"
                    data-type="image"
                  />
                </div>
                <div class="image-wrapper" id="1234567892" data-type="image" data-animation-role="image">
                  <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-2.jpg"
                    data-image-dimensions="600x800"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 2"
                    data-load="false"
                    data-image-id="1234567892"
                    data-type="image"
                  />
                </div>
                <div class="meta" id="8793002jf84od" data-type="image">
                  <div class="meta-inside">
                    <h3 class="meta-title">Image caption 2</h3>
                  </div>
                </div>
              </div>
            </div>
          `)

          const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
          expect(nodes.length).toBe(1)

          const images = nodes[0].images
          expect(images).toBeInstanceOf(Array)
          expect(images).toHaveLength(3)
          expect(images).toEqual([
            {
              fileName: 'test.jpg',
              row: 0,
              src: 'https://example.com/test.jpg',
              width: 2500,
              height: 1663,
              alt: 'image alt text',
            },
            {
              fileName: 'test-1.jpg',
              row: 0,
              src: 'https://example.com/test-1.jpg',
              width: 800,
              height: 600,
              alt: 'image alt text 1',
            },
            {
              fileName: 'test-2.jpg',
              row: 0,
              src: 'https://example.com/test-2.jpg',
              width: 600,
              height: 800,
              alt: 'image alt text 2',
            },
          ])

          expect(nodes[0].caption).toEqual('Image caption 1 / Image caption 2')
        }),
      )

      it(
        'parses a slideshow gallery into gallery card',
        editorTest(async function () {
          const document = createDocument(html`
            <div
              class="sqs-gallery-container sqs-gallery-block-slideshow sqs-gallery-block-show-meta sqs-gallery-block-meta-position-bottom"
            >
              <div class="sqs-gallery">
                <div class="slide content-fill" data-type="image" data-click-through-url>
                  <noscript><img src="https://example.com/test.jpg" alt="image alt text" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test.jpg"
                    data-image-dimensions="2500x1663"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text"
                    data-load="false"
                    data-image-id="1234567890"
                    data-type="image"
                  />
                </div>
                <div class="slide content-fill" data-type="image" data-click-through-url>
                  <noscript><img src="https://example.com/test-1.jpg" alt="image alt text 1" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-1.jpg"
                    data-image-dimensions="800x600"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 1"
                    data-load="false"
                    data-image-id="1234567891"
                    data-type="image"
                  />
                </div>
                <div class="slide content-fill" data-type="image" data-click-through-url>
                  <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 2" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-2.jpg"
                    data-image-dimensions="600x800"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 2"
                    data-load="false"
                    data-image-id="1234567892"
                    data-type="image"
                  />
                </div>
                <div class="slide content-fill" data-type="image" data-click-through-url>
                  <noscript><img src="https://example.com/test-3.jpg" alt="image alt text 3" /></noscript>
                  <img
                    class="thumb-image"
                    data-src="https://example.com/test-3.jpg"
                    data-image-dimensions="800x800"
                    data-image-focal-point="0.5,0.5"
                    alt="image alt text 3"
                    data-load="false"
                    data-image-id="1234567893"
                    data-type="image"
                  />
                </div>
              </div>
            </div>
          `)

          const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
          expect(nodes.length).toBe(1)

          const images = nodes[0].images
          expect(images).toBeInstanceOf(Array)
          expect(images).toHaveLength(4)
          expect(images).toEqual([
            {
              fileName: 'test.jpg',
              row: 0,
              src: 'https://example.com/test.jpg',
              width: 2500,
              height: 1663,
              alt: 'image alt text',
            },
            {
              fileName: 'test-1.jpg',
              row: 0,
              src: 'https://example.com/test-1.jpg',
              width: 800,
              height: 600,
              alt: 'image alt text 1',
            },
            {
              fileName: 'test-2.jpg',
              row: 0,
              src: 'https://example.com/test-2.jpg',
              width: 600,
              height: 800,
              alt: 'image alt text 2',
            },
            {
              fileName: 'test-3.jpg',
              row: 1,
              src: 'https://example.com/test-3.jpg',
              width: 800,
              height: 800,
              alt: 'image alt text 3',
            },
          ])

          expect(nodes[0].caption).toBe('')
        }),
      )

      it(
        'parses a grid gallery into gallery card',
        editorTest(async function () {
          const document = createDocument(html`
            <div
              class="sqs-gallery-container sqs-gallery-block-grid sqs-gallery-aspect-ratio-standard sqs-gallery-thumbnails-per-row-1"
            >
              <div class="sqs-gallery">
                <div class="slide" data-type="image" data-animation-role="image">
                  <div class="margin-wrapper">
                    <a
                      data-title
                      data-description
                      data-lightbox-theme
                      href="https://example.com/test-1.jpg"
                      role="button"
                      class="image-slide-anchor js-gallery-lightbox-opener content-fit"
                    >
                      <span class="v6-visually-hidden">View fullsize</span>
                      <noscript><img src="https://example.com/test-1.jpg" alt="image alt text" /></noscript>
                      <img
                        class="thumb-image"
                        data-src="https://example.com/test-1.jpg"
                        data-image-dimensions="800x600"
                        data-image-focal-point="0.5,0.5"
                        alt="image alt text"
                        data-load="false"
                        data-image-id="1234567891"
                        data-type="image"
                      />
                    </a>
                  </div>
                </div>
                <div class="slide" data-type="image" data-animation-role="image">
                  <div class="margin-wrapper">
                    <a
                      data-title
                      data-description
                      data-lightbox-theme
                      href="https://example.com/test-2.jpg"
                      role="button"
                      class="image-slide-anchor js-gallery-lightbox-opener content-fit"
                    >
                      <span class="v6-visually-hidden">View fullsize</span>
                      <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 1" /></noscript>
                      <img
                        class="thumb-image"
                        data-src="https://example.com/test-2.jpg"
                        data-image-dimensions="600x800"
                        data-image-focal-point="0.5,0.5"
                        alt="image alt text 1"
                        data-load="false"
                        data-image-id="1234567892"
                        data-type="image"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `)

          const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
          expect(nodes.length).toBe(1)

          const images = nodes[0].images
          expect(images).toBeInstanceOf(Array)
          expect(images).toHaveLength(2)
          expect(images).toEqual([
            {
              fileName: 'test-1.jpg',
              row: 0,
              src: 'https://example.com/test-1.jpg',
              width: 800,
              height: 600,
              alt: 'image alt text',
            },
            {
              fileName: 'test-2.jpg',
              row: 0,
              src: 'https://example.com/test-2.jpg',
              width: 600,
              height: 800,
              alt: 'image alt text 1',
            },
          ])

          expect(nodes[0].caption).toBe('')
        }),
      )

      it(
        'ignores summary item galleries',
        editorTest(async function () {
          const document = createDocument(html`
            <div
              class="summary-item-thing sqs-gallery-container sqs-gallery-block-grid sqs-gallery-aspect-ratio-standard sqs-gallery-thumbnails-per-row-1"
            >
              <div class="sqs-gallery">
                <div class="slide" data-type="image" data-animation-role="image">
                  <div class="margin-wrapper">
                    <a
                      data-title
                      data-description
                      data-lightbox-theme
                      href="https://example.com/test-1.jpg"
                      role="button"
                      class="image-slide-anchor js-gallery-lightbox-opener content-fit"
                    >
                      <span class="v6-visually-hidden">View fullsize</span>
                      <noscript><img src="https://example.com/test-1.jpg" alt="image alt text" /></noscript>
                      <img
                        class="thumb-image"
                        data-src="https://example.com/test-1.jpg"
                        data-image-dimensions="800x600"
                        data-image-focal-point="0.5,0.5"
                        alt="image alt text"
                        data-load="false"
                        data-image-id="1234567891"
                        data-type="image"
                      />
                    </a>
                  </div>
                </div>
                <div class="slide" data-type="image" data-animation-role="image">
                  <div class="margin-wrapper">
                    <a
                      data-title
                      data-description
                      data-lightbox-theme
                      href="https://example.com/test-2.jpg"
                      role="button"
                      class="image-slide-anchor js-gallery-lightbox-opener content-fit"
                    >
                      <span class="v6-visually-hidden">View fullsize</span>
                      <noscript><img src="https://example.com/test-2.jpg" alt="image alt text 1" /></noscript>
                      <img
                        class="thumb-image"
                        data-src="https://example.com/test-2.jpg"
                        data-image-dimensions="600x800"
                        data-image-focal-point="0.5,0.5"
                        alt="image alt text 1"
                        data-load="false"
                        data-image-id="1234567892"
                        data-type="image"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `)

          const nodes = $generateNodesFromDOM(editor, document) as GalleryNode[]
          expect(nodes.some((node) => node.getType() === 'gallery')).toBe(false)
        }),
      )
    })
  })

  describe('exportDOM', function () {
    it(
      'renders empty span with no images',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({ images: [], caption: null as unknown as string })
        const { element } = galleryNode.exportDOM(editor, exportOptions)

        expect((element as HTMLElement).outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'renders empty span no valid images',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          images: [{ src: 'undefined' }],
          caption: null as unknown as string,
        })
        const { element } = galleryNode.exportDOM(editor, exportOptions)

        expect((element as HTMLElement).outerHTML).toBe('<span></span>')
      }),
    )

    describe('media URL policy', function () {
      const galleryImage = (overrides: Record<string, unknown>) => ({
        row: 0,
        fileName: 'NatGeo01.jpg',
        src: '/content/images/2018/08/NatGeo01-9.jpg',
        width: 3200,
        height: 1600,
        ...overrides,
      })

      const allowedMediaSources = [
        'https://example.com/image.png',
        '/relative/path/image.png',
        'data:image/png;base64,AAAA',
        'blob:https://example.com/9b1d4f2a',
      ]

      allowedMediaSources.forEach((src) => {
        it(
          `renders gallery items with allowed media source ${src}`,
          editorTest(async function () {
            const galleryNode = $createGalleryNode({
              images: [galleryImage({ src })],
              caption: '',
            })
            const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })

            expect((element as HTMLElement).querySelector('img')!.getAttribute('src')).toBe(src)
          }),
        )
      })

      it(
        'excludes images with unsupported media sources from a mixed gallery',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [galleryImage({}), galleryImage({ fileName: 'Bad.jpg', src: 'unsupported-scheme:payload' })],
            caption: '',
          })
          const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })
          const el = element as HTMLElement
          const output = el.outerHTML

          expect(output).not.toContain('unsupported-scheme:payload')
          const images = el.querySelectorAll('img')
          expect(images.length).toBe(1)
          expect(images[0].getAttribute('src')).toBe('/content/images/2018/08/NatGeo01-9.jpg')
        }),
      )

      it(
        'leaves no empty row when the rejected image was the only row member',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              galleryImage({}),
              galleryImage({ row: 1, fileName: 'Bad.jpg', src: 'unsupported-scheme:payload' }),
            ],
            caption: '',
          })
          const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })
          const el = element as HTMLElement
          const rows = el.querySelectorAll('.inkling-gallery-row')

          expect(rows.length).toBe(1)
          expect(rows[0].querySelectorAll('img').length).toBe(1)
          expect(rows[0].querySelector('img')!.getAttribute('src')).toBe('/content/images/2018/08/NatGeo01-9.jpg')
        }),
      )

      it(
        'renders an empty span when every image source is unsupported',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [galleryImage({ fileName: 'Bad.jpg', src: 'unsupported-scheme:payload' })],
            caption: '',
          })
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          expect((element as HTMLElement).outerHTML).toBe('<span></span>')
        }),
      )
    })

    it(
      'sanitizes caption HTML',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          ...dataset,
          caption: 'Gallery \u003cscript\u003ealert(1)\u003c/script\u003e \u003cimg src=x onerror=alert(1)\u003e',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })
        const html = (element as HTMLElement).outerHTML

        expect(html).not.toContain('\u003cscript')
        expect(html).not.toContain('onerror')
        expect(html).toContain('Gallery')
      }),
    )

    it(
      'does not link images with unsafe hrefs',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          ...dataset,
          caption: '',
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: '/content/images/2018/08/NatGeo01-9.jpg',
              width: 3200,
              height: 1600,
              href: 'javascript:alert(1)',
            },
          ],
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })
        const html = (element as HTMLElement).outerHTML

        expect((element as HTMLElement).querySelector('a') ?? null).toBeNull()
        expect(html).toContain('/content/images/2018/08/NatGeo01-9.jpg')
      }),
    )

    it(
      'renders',
      editorTest(async function () {
        const galleryNode = $createGalleryNode(dataset)
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-gallery-card inkling-width-wide inkling-card-hascaption">
              <div class="inkling-gallery-container">
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-9.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo02-10.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo03-6.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo04-7.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt="Alt test"
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo05-4.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                      title="Title test"
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo06-6.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo07-5.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <a href="https://example.com"
                      ><img
                        src="/content/images/2018/08/NatGeo09-8.jpg"
                        width="3200"
                        height="1600"
                        loading="lazy"
                        alt=""
                    /></a>
                  </div>
                </div>
              </div>
              <figcaption>Test caption</figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'renders images with alt text',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: '/content/images/2018/08/NatGeo01-9.jpg',
              width: 3200,
              height: 1600,
              alt: 'alt test',
            },
          ],
          caption: 'Test caption',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-gallery-card inkling-width-wide inkling-card-hascaption">
              <div class="inkling-gallery-container">
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-9.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt="alt test"
                    />
                  </div>
                </div>
              </div>
              <figcaption>Test caption</figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'renders images with blank alt text',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: '/content/images/2018/08/NatGeo01-9.jpg',
              width: 3200,
              height: 1600,
            },
          ],
          caption: 'Test caption',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-gallery-card inkling-width-wide inkling-card-hascaption">
              <div class="inkling-gallery-container">
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-9.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
              </div>
              <figcaption>Test caption</figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'skips invalid images',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: '/content/images/2018/08/NatGeo01-9.jpg',
              width: 3200,
              height: 1600,
            },
            {
              row: 0,
              fileName: 'NatGeo02.jpg',
              src: '/content/images/2018/08/NatGeo02-10.jpg',
            },
            null as unknown,
            7 as unknown,
            {
              row: 0,
              fileName: 'NatGeoBad.jpg',
              src: '/content/images/2018/08/NatGeoBad.jpg',
              width: '3200',
              height: 1600,
            } as unknown,
            {
              row: '0',
              fileName: 'NatGeoRowBad.jpg',
              src: '/content/images/2018/08/NatGeoRowBad.jpg',
              width: 3200,
              height: 1600,
            } as unknown,
            {
              row: -1,
              fileName: 'NatGeoNegativeRow.jpg',
              src: '/content/images/2018/08/NatGeoNegativeRow.jpg',
              width: 3200,
              height: 1600,
            } as unknown,
            {
              row: 0.5,
              fileName: 'NatGeoFractionalRow.jpg',
              src: '/content/images/2018/08/NatGeoFractionalRow.jpg',
              width: 3200,
              height: 1600,
            } as unknown,
            {
              row: 0,
              fileName: 'NatGeoZeroWidth.jpg',
              src: '/content/images/2018/08/NatGeoZeroWidth.jpg',
              width: 0,
              height: 1600,
            } as unknown,
            {
              row: 0,
              fileName: 'NatGeoZeroHeight.jpg',
              src: '/content/images/2018/08/NatGeoZeroHeight.jpg',
              width: 3200,
              height: 0,
            } as unknown,
            {
              row: 0,
              fileName: 'NatGeo03.jpg',
              src: '/content/images/2018/08/NatGeo03-6.jpg',
              width: 3200,
              height: 1600,
            },
          ],
          caption: 'Test caption',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, canTransformImage: () => false })

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-gallery-card inkling-width-wide inkling-card-hascaption">
              <div class="inkling-gallery-container">
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-9.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo03-6.jpg"
                      width="3200"
                      height="1600"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
              </div>
              <figcaption>Test caption</figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'outputs width/height matching default max image width',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: '/content/images/2018/08/NatGeo01-9.jpg',
              width: 3200,
              height: 1600,
            },
            {
              row: 0,
              fileName: 'external.jpg',
              src: 'https://example.com/external.jpg',
              width: 2500,
              height: 1800,
            },
          ],
        })

        const { element } = galleryNode.exportDOM(editor, exportOptions)

        const output = (element as HTMLElement).outerHTML

        // local is resized
        expect(output).toMatch(/width="2000"/)
        expect(output).toMatch(/height="1000"/)
        expect(output).not.toMatch(/width="3200"/)
        expect(output).not.toMatch(/height="1600"/)

        // external is not
        expect(output).toMatch(/width="2500"/)
        expect(output).toMatch(/height="1800"/)
      }),
    )

    it(
      'renders all 9 images in a 3x3 grid',
      editorTest(async function () {
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              src: '/content/images/2018/08/NatGeo01-1.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-1.jpg',
            },
            {
              row: 0,
              src: '/content/images/2018/08/NatGeo01-2.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-2.jpg',
            },
            {
              row: 0,
              src: '/content/images/2018/08/NatGeo01-3.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-3.jpg',
            },
            {
              row: 1,
              src: '/content/images/2018/08/NatGeo01-4.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-4.jpg',
            },
            {
              row: 1,
              src: '/content/images/2018/08/NatGeo01-5.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-5.jpg',
            },
            {
              row: 1,
              src: '/content/images/2018/08/NatGeo01-6.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-6.jpg',
            },
            {
              row: 2,
              src: '/content/images/2018/08/NatGeo01-7.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-7.jpg',
            },
            {
              row: 2,
              src: '/content/images/2018/08/NatGeo01-8.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-8.jpg',
            },
            {
              row: 2,
              src: '/content/images/2018/08/NatGeo01-9.jpg',
              width: 3200,
              height: 1600,
              fileName: 'NatGeo01-9.jpg',
            },
          ],
          caption: '',
        })

        // skip srcset
        delete (exportOptions.imageOptimization as Record<string, unknown>).contentImageSizes
        const { element } = galleryNode.exportDOM(editor, exportOptions)

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-gallery-card inkling-width-wide">
              <div class="inkling-gallery-container">
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-1.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-2.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-3.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-4.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-5.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-6.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
                <div class="inkling-gallery-row">
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-7.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-8.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                  <div class="inkling-gallery-image">
                    <img
                      src="/content/images/2018/08/NatGeo01-9.jpg"
                      width="2000"
                      height="1000"
                      loading="lazy"
                      alt=""
                    />
                  </div>
                </div>
              </div>
            </figure>
          `,
        )
      }),
    )

    describe('srcset', function () {
      it(
        'is included when image src is relative',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'NatGeo01.jpg',
                src: '/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
              {
                row: 0,
                fileName: 'NatGeo02.jpg',
                src: '/subdir/support/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
            ],
          })

          delete (exportOptions.imageOptimization as Record<string, unknown>).defaultMaxWidth
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          await expectPrettifiedHtml(
            (element as HTMLElement).outerHTML,
            html`
              <figure class="inkling-card inkling-gallery-card inkling-width-wide">
                <div class="inkling-gallery-container">
                  <div class="inkling-gallery-row">
                    <div class="inkling-gallery-image">
                      <img
                        src="/content/images/2018/08/NatGeo01-9.jpg"
                        width="3200"
                        height="1600"
                        loading="lazy"
                        alt=""
                        srcset="
                          /content/images/size/w600/2018/08/NatGeo01-9.jpg   600w,
                          /content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w,
                          /content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w,
                          /content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w
                        "
                        sizes="(min-width: 720px) 720px"
                      />
                    </div>
                    <div class="inkling-gallery-image">
                      <img
                        src="/subdir/support/content/images/2018/08/NatGeo01-9.jpg"
                        width="3200"
                        height="1600"
                        loading="lazy"
                        alt=""
                        srcset="
                          /subdir/support/content/images/size/w600/2018/08/NatGeo01-9.jpg   600w,
                          /subdir/support/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w,
                          /subdir/support/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w,
                          /subdir/support/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w
                        "
                        sizes="(min-width: 720px) 720px"
                      />
                    </div>
                  </div>
                </div>
              </figure>
            `,
          )
        }),
      )

      it(
        'is included when image src is absolute or __INKLING_URL__',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'NatGeo01.jpg',
                src: 'https://localhost:2368/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
              {
                row: 0,
                fileName: 'NatGeo02.jpg',
                src: '__INKLING_URL__/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
            ],
          })

          delete (exportOptions.imageOptimization as Record<string, unknown>).defaultMaxWidth
          exportOptions.siteUrl = 'https://localhost:2368'
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          await expectPrettifiedHtml(
            (element as HTMLElement).outerHTML,
            html`
              <figure class="inkling-card inkling-gallery-card inkling-width-wide">
                <div class="inkling-gallery-container">
                  <div class="inkling-gallery-row">
                    <div class="inkling-gallery-image">
                      <img
                        src="https://localhost:2368/content/images/2018/08/NatGeo01-9.jpg"
                        width="3200"
                        height="1600"
                        loading="lazy"
                        alt=""
                        srcset="
                          https://localhost:2368/content/images/size/w600/2018/08/NatGeo01-9.jpg   600w,
                          https://localhost:2368/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w,
                          https://localhost:2368/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w,
                          https://localhost:2368/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w
                        "
                        sizes="(min-width: 720px) 720px"
                      />
                    </div>
                    <div class="inkling-gallery-image">
                      <img
                        src="__INKLING_URL__/content/images/2018/08/NatGeo01-9.jpg"
                        width="3200"
                        height="1600"
                        loading="lazy"
                        alt=""
                        srcset="
                          __INKLING_URL__/content/images/size/w600/2018/08/NatGeo01-9.jpg   600w,
                          __INKLING_URL__/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w,
                          __INKLING_URL__/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w,
                          __INKLING_URL__/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w
                        "
                        sizes="(min-width: 720px) 720px"
                      />
                    </div>
                  </div>
                </div>
              </figure>
            `,
          )
        }),
      )

      it(
        'is omitted when target === email',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'NatGeo01.jpg',
                src: '/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
            ],
          })

          delete (exportOptions.imageOptimization as Record<string, unknown>).defaultMaxWidth
          exportOptions.target = 'email'
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          expect((element as HTMLElement).outerHTML).not.toContain('srcset=')
        }),
      )

      it(
        'is omitted when no contentImageSizes are passed as options',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'NatGeo01.jpg',
                src: '/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
            ],
          })

          delete (exportOptions.imageOptimization as Record<string, unknown>).contentImageSizes
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          expect((element as HTMLElement).outerHTML).not.toContain('srcset=')
        }),
      )

      it(
        'is omitted when `srcsets: false` is passed as an options',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'NatGeo01.jpg',
                src: '/content/images/2018/08/NatGeo01-9.jpg',
                width: 3200,
                height: 1600,
              },
            ],
          })

          ;(exportOptions.imageOptimization as Record<string, unknown>).srcsets = false
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          expect((element as HTMLElement).outerHTML).not.toContain('srcset=')
        }),
      )
    })

    describe('sizes', function () {
      it(
        'is included for images over 720px',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'standard.jpg',
                src: '/content/images/2018/08/standard.jpg',
                width: 720,
                height: 1600,
              },
              {
                row: 0,
                fileName: 'small.jpg',
                src: '/subdir/support/content/images/2018/08/small.jpg',
                width: 640,
                height: 1600,
              },
            ],
          })

          const { element } = galleryNode.exportDOM(editor, exportOptions)

          const output = (element as HTMLElement).outerHTML
          const sizes = output.match(/sizes="(.*?)"/g)

          expect(sizes!.length).toBe(1)

          expect(output).toMatch(/standard\.jpg 720w" sizes="\(min-width: 720px\) 720px"/)
        }),
      )

      it(
        'uses "wide" media query for large single-image galleries',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'standard.jpg',
                src: '/content/images/2018/08/standard.jpg',
                width: 2000,
                height: 1600,
              },
            ],
          })

          const { element } = galleryNode.exportDOM(editor, exportOptions)

          expect((element as HTMLElement).outerHTML).toMatch(
            /standard\.jpg 2000w" sizes="\(min-width: 1200px\) 1200px"/,
          )
        }),
      )

      it(
        'uses "standard" media query for medium single-image galleries',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'standard.jpg',
                src: '/content/images/2018/08/standard.jpg',
                width: 1000,
                height: 1600,
              },
            ],
          })

          const { element } = galleryNode.exportDOM(editor, exportOptions)

          expect((element as HTMLElement).outerHTML).toMatch(/standard\.jpg 1000w" sizes="\(min-width: 720px\) 720px"/)
        }),
      )

      it(
        'is omitted when srcsets are not available',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'standard.jpg',
                src: '/content/images/2018/08/standard.jpg',
                width: 720,
                height: 1600,
              },
              {
                row: 0,
                fileName: 'small.jpg',
                src: '/subdir/support/content/images/2018/08/small.jpg',
                width: 640,
                height: 1600,
              },
            ],
          })

          ;(exportOptions.imageOptimization as Record<string, unknown>).srcsets = false
          const { element } = galleryNode.exportDOM(editor, exportOptions)

          const output = (element as HTMLElement).outerHTML
          const sizes = output.match(/sizes="(.*?)"/g)

          expect(sizes ?? null).toBeNull()
        }),
      )
    })

    describe('email target', function () {
      beforeEach(function () {
        exportOptions.target = 'email'
      })

      it(
        'adds width/height and uses resized images',
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'standard.jpg',
                src: '/content/images/2018/08/standard.jpg',
                width: 720,
                height: 1600,
              },
              {
                row: 0,
                fileName: 'small.jpg',
                src: '/subdir/support/content/images/2018/08/small.jpg',
                width: 300,
                height: 800,
              },
              {
                row: 1,
                fileName: 'photo.jpg',
                src: '/content/images/2018/08/photo.jpg',
                width: 2000,
                height: 1600,
              },
            ],
          })

          const { element } = galleryNode.exportDOM(editor, exportOptions)
          const output = (element as HTMLElement).outerHTML

          // 2 images wider than 600px template width resized to fit
          expect(output.match(/width="600"/g)!.length).toBe(2)
          // 1 image smaller than template width
          expect(output).toMatch(/width="300"/)

          expect(output).toMatch(/height="1333"/)
          expect(output).toMatch(/height="800"/)
          expect(output).toMatch(/height="480"/)

          // original because image is < 1600
          expect(output).toMatch(/\/content\/images\/2018\/08\/standard\.jpg/)
          // original because image is < 300
          expect(output).toMatch(/\/subdir\/support\/content\/images\/2018\/08\/small\.jpg/)
          // resized because image is > 1600
          expect(output).toMatch(/\/content\/images\/size\/w1600\/2018\/08\/photo\.jpg/)
        }),
      )

      it(
        "resizes width/height attributes but uses original image when local image can't be transformed",
        editorTest(async function () {
          const galleryNode = $createGalleryNode({
            images: [
              {
                row: 0,
                fileName: 'image.png',
                src: '/content/images/2020/06/image.png',
                width: 3000,
                height: 2000,
              },
            ],
          })

          exportOptions.canTransformImage = () => false

          const { element } = galleryNode.exportDOM(editor, exportOptions)
          const output = (element as HTMLElement).outerHTML

          expect(output).not.toMatch(/width="3000"/)
          expect(output).toMatch(/width="600"/)
          expect(output).not.toMatch(/height="2000"/)
          expect(output).toMatch(/height="400"/)
          expect(output).not.toMatch(/\/content\/images\/size\/w1600\/2020\/06\/image\.png/)
          expect(output).toMatch(/\/content\/images\/2020\/06\/image\.png/)
        }),
      )
    })

    it(
      'resizes CDN gallery images to the max width when imageBaseUrl is configured',
      editorTest(async function () {
        const cdnUrl = 'https://cdn.example.com/c/uuid'
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: `${cdnUrl}/content/images/2018/08/NatGeo01-9.jpg`,
              width: 3200,
              height: 1600,
            },
          ],
          caption: '',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, imageBaseUrl: cdnUrl })
        const img = (element as HTMLElement).querySelector('img')!

        // defaultMaxWidth is 2000 in exportOptions; width 3200 resizes to 2000x1000
        expect(img.getAttribute('width')).toBe('2000')
        expect(img.getAttribute('height')).toBe('1000')
      }),
    )

    it(
      'uses a retina CDN src for email gallery images when imageBaseUrl is configured',
      editorTest(async function () {
        const cdnUrl = 'https://cdn.example.com/c/uuid'
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: `${cdnUrl}/content/images/2018/08/NatGeo01-9.jpg`,
              width: 3200,
              height: 1600,
            },
          ],
          caption: '',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, target: 'email', imageBaseUrl: cdnUrl })
        const img = (element as HTMLElement).querySelector('img')!

        // first available size >= 2x600 is w1600
        expect(img.getAttribute('src')).toBe(`${cdnUrl}/content/images/size/w1600/2018/08/NatGeo01-9.jpg`)
      }),
    )

    it(
      'generates srcset for CDN gallery images when imageBaseUrl is configured',
      editorTest(async function () {
        const cdnUrl = 'https://cdn.example.com/c/uuid'
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: `${cdnUrl}/content/images/2018/08/NatGeo01-9.jpg`,
              width: 3200,
              height: 1600,
            },
          ],
          caption: '',
        })
        const { element } = galleryNode.exportDOM(editor, { ...exportOptions, imageBaseUrl: cdnUrl })
        const html = (element as HTMLElement).outerHTML

        expect(html).toContain(`${cdnUrl}/content/images/size/w600/2018/08/NatGeo01-9.jpg`)
        expect(html).toContain('srcset')
      }),
    )

    it(
      'does not generate srcset for CDN gallery images when imageBaseUrl is not configured',
      editorTest(async function () {
        const cdnUrl = 'https://cdn.example.com/c/uuid'
        const galleryNode = $createGalleryNode({
          images: [
            {
              row: 0,
              fileName: 'NatGeo01.jpg',
              src: `${cdnUrl}/content/images/2018/08/NatGeo01-9.jpg`,
              width: 3200,
              height: 1600,
            },
          ],
          caption: '',
        })
        const { element } = galleryNode.exportDOM(editor, exportOptions)

        expect((element as HTMLElement).outerHTML).not.toContain('srcset')
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createGalleryNode({} as Record<string, unknown>)
        expect(node.getTextContent()).toBe('')

        node.caption = 'Test caption'
        expect(node.getTextContent()).toBe('Test caption\n\n')
      }),
    )
  })
})
