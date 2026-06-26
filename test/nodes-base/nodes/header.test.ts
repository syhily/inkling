import 'should'
import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import _ from 'lodash'

import { createDocument, dom } from '#/nodes-base/test-utils/index'
import { HeaderNode, $createHeaderNode, $isHeaderNode } from '@/nodes/base/index'

const editorNodes = [HeaderNode]

describe('HeaderNode', function () {
  describe('v2', function () {
    let editor: LexicalEditor
    let dataset: Record<string, unknown>
    let exportOptions: Record<string, unknown>

    const editorTest = (testFn: () => void) => () =>
      new Promise<void>((resolve, reject) => {
        editor.update(() => {
          try {
            testFn()
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })

    beforeEach(function () {
      editor = createHeadlessEditor({ nodes: editorNodes })

      dataset = {
        version: 2,
        backgroundImageSrc: 'https://example.com/image.jpg',
        buttonEnabled: true,
        buttonText: 'The button',
        buttonUrl: 'https://example.com/',
        header: 'This is the header card',
        subheader: 'hello',
        alignment: 'center',
        backgroundColor: '#F0F0F0',
        backgroundSize: 'cover',
        textColor: '#000000',
        buttonColor: '#000000',
        buttonTextColor: '#FFFFFF',
        layout: 'full',
        swapped: false,
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
      'matches node with $isHeaderNode',
      editorTest(function () {
        const headerNode = $createHeaderNode(dataset)
        $isHeaderNode(headerNode).should.be.true()
      }),
    )

    describe('data access', function () {
      it(
        'has getters for all properties',
        editorTest(function () {
          const node = $createHeaderNode(dataset)
          node.version.should.equal(2)
          node.backgroundImageSrc.should.equal('https://example.com/image.jpg')
          node.buttonEnabled.should.be.true()
          node.buttonText.should.equal('The button')
          node.buttonUrl.should.equal('https://example.com/')
          node.header.should.equal('This is the header card')
          node.subheader.should.equal('hello')
          node.alignment.should.equal('center')
          node.backgroundColor.should.equal('#F0F0F0')
          node.backgroundSize.should.equal('cover')
          node.textColor.should.equal('#000000')
          node.buttonColor.should.equal('#000000')
          node.buttonTextColor.should.equal('#FFFFFF')
          node.layout.should.equal('full')
          node.swapped.should.be.false()
        }),
      )

      it(
        'has setters for all properties',
        editorTest(function () {
          const node = $createHeaderNode(dataset)
          node.backgroundImageSrc = 'https://example.com/image2.jpg'
          node.buttonEnabled = false
          node.buttonText = 'The button 2'
          node.buttonUrl = 'https://example.com/2'
          node.header = 'This is the header card 2'
          node.subheader = 'hello 2'
          node.alignment = 'left'
          node.backgroundColor = '#F0F0F1'
          node.backgroundSize = 'contain'
          node.textColor = '#000001'
          node.buttonColor = '#000001'
          node.buttonTextColor = '#FFFFFF'
          node.layout = 'full'
          node.swapped = true

          node.backgroundImageSrc.should.equal('https://example.com/image2.jpg')
          node.buttonEnabled.should.be.false()
          node.buttonText.should.equal('The button 2')
          node.buttonUrl.should.equal('https://example.com/2')
          node.header.should.equal('This is the header card 2')
          node.subheader.should.equal('hello 2')
          node.alignment.should.equal('left')
          node.backgroundColor.should.equal('#F0F0F1')
          node.backgroundSize.should.equal('contain')
          node.textColor.should.equal('#000001')
          node.buttonColor.should.equal('#000001')
          node.buttonTextColor.should.equal('#FFFFFF')
          node.layout.should.equal('full')
          node.swapped.should.be.true()
        }),
      )
    })

    describe('importDOM', function () {
      it(
        'parses a header card V2',
        editorTest(function () {
          const htmlstring = `
                    <div class="inkling-card inkling-header-card inkling-v2 inkling-style-accent" data-background-color="#abcdef">
                        <picture><img class="inkling-header-card-image" src="https://example.com/image.jpg" alt="" /></picture>
                        <div class="inkling-header-card-content">
                            <div class="inkling-header-card-text inkling-align-center">
                                <h2 class="inkling-header-card-heading" data-text-color="#abcdef">Header</h2>
                                <p class="inkling-header-card-subheading" data-text-color="#abcdef">Subheader</p>
                                <a href="https://example.com" class="inkling-header-card-button" data-button-color="#abcdef" data-button-text-color="#abcdef">Button</a>
                            </div>
                        </div>
                    </div>`
          const document = createDocument(htmlstring)
          const nodes = $generateNodesFromDOM(editor, document) as HeaderNode[]
          nodes.length.should.equal(1)
          const node = nodes[0]
          node.backgroundColor.should.equal('accent')
          node.buttonColor.should.equal('#abcdef')
          node.alignment.should.equal('center')
          node.backgroundImageSrc.should.equal('https://example.com/image.jpg')
          node.layout.should.equal('split')
          node.textColor.should.equal('#abcdef')
          node.header.should.equal('Header')
          node.subheader.should.equal('Subheader')
          node.buttonEnabled.should.be.true()
          node.buttonUrl.should.equal('https://example.com')
          node.buttonText.should.equal('Button')
          node.buttonTextColor.should.equal('#abcdef')
        }),
      )

      it(
        'does not parse a v1 header',
        editorTest(function () {
          const htmlstring = `
            <div class="inkling-card inkling-header-card inkling-size-large inkling-style-image" data-inkling-background-image="https://example.com/image.jpg" style="background-image: url(https://example.com/image.jpg)">
                <h2 class="inkling-header-card-header" id="header-slug">Header</h2>
                <h3 class="inkling-header-card-subheader" id="subheader-slug">Subheader</h3>
                <a class="inkling-header-card-button" href="https://example.com">Button</a>
            </div>`

          const document = createDocument(htmlstring)
          const nodes = $generateNodesFromDOM(editor, document) as HeaderNode[]
          const headerNodes = nodes.filter((node) => $isHeaderNode(node))
          headerNodes.length.should.equal(0)
        }),
      )
    })

    describe('getType', function () {
      it(
        'returns correct node type',
        editorTest(function () {
          const node = $createHeaderNode(dataset)
          node.getType().should.equal('header')
        }),
      )
    })

    describe('clone', function () {
      it(
        'returns a copy of the current node',
        editorTest(function () {
          const headerNode = $createHeaderNode(dataset)
          const headerNodeDataset = headerNode.getDataset()
          const clone = HeaderNode.clone(headerNode) as HeaderNode
          const cloneDataset = clone.getDataset()
          cloneDataset.should.deepEqual({ ...headerNodeDataset })
        }),
      )
    })

    describe('urlTransformMap', function () {
      it(
        'contains the expected URL mapping',
        editorTest(function () {
          HeaderNode.urlTransformMap.should.deepEqual({
            buttonUrl: 'url',
            backgroundImageSrc: 'url',
            header: 'html',
            subheader: 'html',
          })
        }),
      )
    })

    describe('hasEditMode', function () {
      it(
        'returns true',
        editorTest(function () {
          const headerNode = $createHeaderNode(dataset)
          headerNode.hasEditMode().should.be.true()
        }),
      )
    })

    describe('exportDOM', function () {
      it(
        'renders version 2 html',
        editorTest(function () {
          const headerNode = $createHeaderNode(dataset)
          const { element } = headerNode.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          // Assuming outerHTML gets the full HTML string of the element
          const renderedHtml = _.replace(el.outerHTML, /\s/g, '')
          const expectedHtml = `
                <div class="inkling-card inkling-header-card inkling-v2 inkling-width-full inkling-content-wide " data-background-color="#F0F0F0">
                <picture><img class="inkling-header-card-image" src="https://example.com/image.jpg" loading="lazy" alt=""></picture>
                    <div class="inkling-header-card-content">
                        <div class="inkling-header-card-text inkling-align-center">
                            <h2 id="this-is-the-header-card" class="inkling-header-card-heading" style="color: #000000;" data-text-color="#000000">This is the header card</h2>
                            <p id="hello" class="inkling-header-card-subheading" style="color: #000000;" data-text-color="#000000">hello</p>
                            <a href="https://example.com/" class="inkling-header-card-button " style="background-color: #000000;color: #FFFFFF;" data-button-color="#000000" data-button-text-color="#FFFFFF">The button</a>
                        </div>
                    </div>
                </div>
                `
          const cleanedExpectedHtml = _.replace(expectedHtml, /\s/g, '')
          renderedHtml.should.equal(cleanedExpectedHtml)
        }),
      )

      it(
        'renders empty card when header and subheader is undefined and the button is disabled',
        editorTest(function () {
          const node = $createHeaderNode(dataset)
          node.header = null as unknown as string
          node.subheader = null as unknown as string
          node.buttonEnabled = false
          const { element } = node.exportDOM(editor, exportOptions)
          // v2 renderer has no empty check — it always returns a card element
          should.exist(element)
          should.not.exist((element as HTMLElement).querySelector('.inkling-header-card-heading'))
          should.not.exist((element as HTMLElement).querySelector('.inkling-header-card-subheading'))
          should.not.exist((element as HTMLElement).querySelector('.inkling-header-card-button'))
        }),
      )

      it(
        'renders without subheader',
        editorTest(function () {
          const payload = {
            version: 2,
            backgroundImageSrc: '',
            buttonEnabled: false,
            buttonText: 'The button',
            buttonUrl: 'https://example.com/',
            header: 'hello world',
            size: 'small',
            style: 'dark',
            subheader: '',
          }
          const node = $createHeaderNode(payload)

          const { element } = node.exportDOM(editor, exportOptions)
          const el = element as HTMLElement
          const renderedHtml = _.replace(el.outerHTML, /\s/g, '')
          const expectedHtml = `
                <div class="inkling-card inkling-header-card inkling-v2 inkling-width-full inkling-content-wide " style="background-color: #000000;" data-background-color="#000000">
                    <div class="inkling-header-card-content">
                        <div class="inkling-header-card-text inkling-align-center">
                        <h2 id="hello-world" class="inkling-header-card-heading" style="color: #FFFFFF;" data-text-color="#FFFFFF">hello world</h2>
                        </div>
                    </div>
                </div>
                `

          const cleanedExpectedHtml = _.replace(expectedHtml, /\s/g, '')
          renderedHtml.should.equal(cleanedExpectedHtml)
        }),
      )

      it(
        'renders with srcset',
        editorTest(function () {
          const payload = {
            version: 2,
            backgroundImageSrc: '/content/images/2022/11/inkling-lexical.jpg',
            backgroundImageWidth: 3840,
            backgroundImageHeight: 2160,
            buttonEnabled: false,
            buttonText: 'The button',
            buttonUrl: 'https://example.com/',
            header: 'hello world',
            size: 'small',
            style: 'dark',
            subheader: '',
          }
          const node = $createHeaderNode(payload)

          const { element } = node.exportDOM(editor, exportOptions)
          const el = element as HTMLElement
          const renderedHtml = _.replace(el.outerHTML, /\s/g, '')
          const expectedHtml = `
                <div class="inkling-card inkling-header-card inkling-v2 inkling-width-full inkling-content-wide " data-background-color="#000000">
                    <picture><img class="inkling-header-card-image" src="/content/images/2022/11/inkling-lexical.jpg" srcset="/content/images/size/w600/2022/11/inkling-lexical.jpg 600w, /content/images/size/w1000/2022/11/inkling-lexical.jpg 1000w, /content/images/size/w1600/2022/11/inkling-lexical.jpg 1600w, /content/images/size/w2400/2022/11/inkling-lexical.jpg 2400w" loading="lazy" alt=""></picture>
                    <div class="inkling-header-card-content">
                        <div class="inkling-header-card-text inkling-align-center">
                        <h2 id="hello-world" class="inkling-header-card-heading" style="color: #FFFFFF;" data-text-color="#FFFFFF">hello world</h2>
                        </div>
                    </div>
                </div>
                `

          const cleanedExpectedHtml = _.replace(expectedHtml, /\s/g, '')
          renderedHtml.should.equal(cleanedExpectedHtml)
        }),
      )
    })
  })
})
