import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { HeaderNode, $createHeaderNode, $isHeaderNode } from '@/nodes/base/index'

const editorNodes = [HeaderNode]

describe('HeaderNode', function () {
  describe('v2', function () {
    let editor: LexicalEditor
    let dataset: Record<string, unknown>
    let exportOptions: Record<string, unknown>

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
        expect($isHeaderNode(headerNode)).toBe(true)
      }),
    )

    describe('data access', function () {
      it(
        'has getters for all properties',
        editorTest(function () {
          const node = $createHeaderNode(dataset)
          expect(node.version).toBe(2)
          expect(node.backgroundImageSrc).toBe('https://example.com/image.jpg')
          expect(node.buttonEnabled).toBe(true)
          expect(node.buttonText).toBe('The button')
          expect(node.buttonUrl).toBe('https://example.com/')
          expect(node.header).toBe('This is the header card')
          expect(node.subheader).toBe('hello')
          expect(node.alignment).toBe('center')
          expect(node.backgroundColor).toBe('#F0F0F0')
          expect(node.backgroundSize).toBe('cover')
          expect(node.textColor).toBe('#000000')
          expect(node.buttonColor).toBe('#000000')
          expect(node.buttonTextColor).toBe('#FFFFFF')
          expect(node.layout).toBe('full')
          expect(node.swapped).toBe(false)
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

          expect(node.backgroundImageSrc).toBe('https://example.com/image2.jpg')
          expect(node.buttonEnabled).toBe(false)
          expect(node.buttonText).toBe('The button 2')
          expect(node.buttonUrl).toBe('https://example.com/2')
          expect(node.header).toBe('This is the header card 2')
          expect(node.subheader).toBe('hello 2')
          expect(node.alignment).toBe('left')
          expect(node.backgroundColor).toBe('#F0F0F1')
          expect(node.backgroundSize).toBe('contain')
          expect(node.textColor).toBe('#000001')
          expect(node.buttonColor).toBe('#000001')
          expect(node.buttonTextColor).toBe('#FFFFFF')
          expect(node.layout).toBe('full')
          expect(node.swapped).toBe(true)
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
          expect(nodes.length).toBe(1)
          const node = nodes[0]
          expect(node.backgroundColor).toBe('accent')
          expect(node.buttonColor).toBe('#abcdef')
          expect(node.alignment).toBe('center')
          expect(node.backgroundImageSrc).toBe('https://example.com/image.jpg')
          expect(node.layout).toBe('split')
          expect(node.textColor).toBe('#abcdef')
          expect(node.header).toBe('Header')
          expect(node.subheader).toBe('Subheader')
          expect(node.buttonEnabled).toBe(true)
          expect(node.buttonUrl).toBe('https://example.com')
          expect(node.buttonText).toBe('Button')
          expect(node.buttonTextColor).toBe('#abcdef')
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
          expect(headerNodes.length).toBe(0)
        }),
      )
    })

    describe('getType', function () {
      it(
        'returns correct node type',
        editorTest(function () {
          const node = $createHeaderNode(dataset)
          expect(node.getType()).toBe('header')
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
          expect(cloneDataset).toEqual({ ...headerNodeDataset })
        }),
      )
    })

    describe('urlTransformMap', function () {
      it(
        'contains the expected URL mapping',
        editorTest(function () {
          expect(HeaderNode.urlTransformMap).toEqual({
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
          expect(headerNode.hasEditMode()).toBe(true)
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
          const renderedHtml = el.outerHTML.replace(/\s/g, '')
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
          const cleanedExpectedHtml = expectedHtml.replace(/\s/g, '')
          expect(renderedHtml).toBe(cleanedExpectedHtml)
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
          expect(element).toBeDefined()
          expect(element).not.toBeNull()
          expect((element as HTMLElement).querySelector('.inkling-header-card-heading') ?? null).toBeNull()
          expect((element as HTMLElement).querySelector('.inkling-header-card-subheading') ?? null).toBeNull()
          expect((element as HTMLElement).querySelector('.inkling-header-card-button') ?? null).toBeNull()
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
          const renderedHtml = el.outerHTML.replace(/\s/g, '')
          const expectedHtml = `
                <div class="inkling-card inkling-header-card inkling-v2 inkling-width-full inkling-content-wide " style="background-color: #000000;" data-background-color="#000000">
                    <div class="inkling-header-card-content">
                        <div class="inkling-header-card-text inkling-align-center">
                        <h2 id="hello-world" class="inkling-header-card-heading" style="color: #FFFFFF;" data-text-color="#FFFFFF">hello world</h2>
                        </div>
                    </div>
                </div>
                `

          const cleanedExpectedHtml = expectedHtml.replace(/\s/g, '')
          expect(renderedHtml).toBe(cleanedExpectedHtml)
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
          const renderedHtml = el.outerHTML.replace(/\s/g, '')
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

          const cleanedExpectedHtml = expectedHtml.replace(/\s/g, '')
          expect(renderedHtml).toBe(cleanedExpectedHtml)
        }),
      )

      it(
        'escapes user text and drops unsafe URLs in exported HTML',
        editorTest(function () {
          const payload = {
            version: 2,
            backgroundImageSrc: 'javascript:alert(1)',
            buttonEnabled: true,
            buttonText: '<em>Button</em>',
            buttonUrl: 'https://example.com/',
            header: '<script>alert(1)</script>',
            subheader: '<img src=x onerror=alert(1)>',
            alignment: 'center',
            backgroundColor: '#F0F0F0',
            backgroundSize: 'cover',
            textColor: '#000000',
            buttonColor: '#000000',
            buttonTextColor: '#FFFFFF',
            layout: 'full',
            swapped: false,
          }
          const node = $createHeaderNode(payload)
          const { element } = node.exportDOM(editor, exportOptions)
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
          expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
          expect(html).toContain('&lt;em&gt;Button&lt;/em&gt;')
          expect(html).not.toContain('<script>alert(1)</script>')
          expect(html).not.toContain('javascript:alert(1)')
          expect((element as HTMLElement).querySelector('.inkling-header-card-button')).toBeDefined()
          expect((element as HTMLElement).querySelector('.inkling-header-card-button')).not.toBeNull()
        }),
      )

      it(
        'falls back to the default text color when textColor breaks out of its attribute',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            textColor: 'red"><img src=x onerror=alert(1)>',
          })
          const { element } = node.exportDOM(editor, exportOptions)
          const el = element as HTMLElement
          const html = el.outerHTML

          expect(html).not.toContain('onerror')
          expect(html).not.toContain('<img src=x')
          const heading = el.querySelector('.inkling-header-card-heading') as HTMLElement
          expect(heading).toBeDefined()
          expect(heading).not.toBeNull()
          expect(heading.getAttribute('data-text-color')!).toBe('#000000')
          expect(heading.getAttribute('style')!).toContain('color: #000000')
        }),
      )

      it(
        'falls back to transparent when backgroundColor is a url() value',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundColor: 'url(https://evil.example/x)',
          })
          const { element } = node.exportDOM(editor, exportOptions)
          const el = element as HTMLElement
          const html = el.outerHTML

          expect(html).not.toContain('evil.example')
          expect(html).not.toContain('url(')
          expect(el.getAttribute('data-background-color')!).toBe('transparent')
        }),
      )

      it(
        'falls back to transparent when buttonColor contains attacker content',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            buttonColor: 'expression(alert(1))',
          })
          const { element } = node.exportDOM(editor, exportOptions)
          const el = element as HTMLElement
          const html = el.outerHTML

          expect(html).not.toContain('expression')
          const button = el.querySelector('.inkling-header-card-button') as HTMLElement
          expect(button).toBeDefined()
          expect(button).not.toBeNull()
          expect(button.getAttribute('data-button-color')!).toBe('transparent')
          expect(button.getAttribute('style')!).toContain('background-color: transparent')
        }),
      )

      it(
        'renders picker-produced color formats unchanged',
        editorTest(function () {
          for (const color of ['#aabbcc', '#abc', 'rgb(1, 2, 3)', 'rgba(1, 2, 3, 0.5)', 'white']) {
            const node = $createHeaderNode({
              ...dataset,
              textColor: color,
              buttonTextColor: color,
              buttonColor: color,
              backgroundColor: color,
            })
            const { element } = node.exportDOM(editor, exportOptions)
            const el = element as HTMLElement

            expect(el.getAttribute('data-background-color')!).toBe(color)
            const heading = el.querySelector('.inkling-header-card-heading') as HTMLElement
            expect(heading.getAttribute('data-text-color')!).toBe(color)
            const button = el.querySelector('.inkling-header-card-button') as HTMLElement
            expect(button.getAttribute('data-button-color')!).toBe(color)
            expect(button.getAttribute('data-button-text-color')!).toBe(color)
          }
        }),
      )

      it(
        'preserves the accent sentinel for background and button colors',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundColor: 'accent',
            buttonColor: 'accent',
          })
          const { element } = node.exportDOM(editor, exportOptions)
          const el = element as HTMLElement

          expect(el.getAttribute('data-background-color')!).toBe('accent')
          expect(el.className).toContain('inkling-style-accent')
          const button = el.querySelector('.inkling-header-card-button') as HTMLElement
          expect(button).toBeDefined()
          expect(button).not.toBeNull()
          expect(button.getAttribute('data-button-color')!).toBe('accent')
          expect(button.className).toContain('inkling-style-accent')
          expect(button.getAttribute('style')!).not.toContain('background-color')
        }),
      )

      it(
        'sanitizes color values in the email renderer',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundImageSrc: '',
            textColor: 'red"><img src=x onerror=alert(1)>',
            backgroundColor: 'url(https://evil.example/x)',
          })
          const { element } = node.exportDOM(editor, { ...exportOptions, target: 'email' })
          const html = (element as HTMLElement).outerHTML

          expect(html).not.toContain('onerror')
          expect(html).not.toContain('<img src=x')
          expect(html).not.toContain('evil.example')
          expect(html).toContain('color:#000000')
          expect(html).toContain('background-color: transparent')
        }),
      )
    })

    describe('email target full output', function () {
      it(
        'pins the full modern email output (useModernButton)',
        editorTest(async function () {
          const headerNode = $createHeaderNode(dataset)
          const { element } = headerNode.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            feature: { emailCustomization: true },
          })

          await expectPrettifiedHtml(
            (element as HTMLElement).outerHTML,
            html`
              <div
                class="inkling-header-card inkling-v2 inkling-header-card-light-bg"
                style="color:#000000; text-align: center; background-image: url(https://example.com/image.jpg); background-size: cover; background-position: center center; "
              >
                <table
                  border="0"
                  cellpadding="0"
                  cellspacing="0"
                  width="100%"
                  style="color:#000000; text-align: center; background-image: url(https://example.com/image.jpg); background-size: cover; background-position: center center; "
                >
                  <tbody>
                    <tr>
                      <!--[if mso]>
                        <td class="inkling-header-card-content" style="padding: 0;">
                    <![endif]-->
                      <!--[if !mso]><!--><td class="inkling-header-card-content" style=""><!--<![endif]-->
                        <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                            <v:fill src="https://example.com/image.jpg" color="#F0F0F0" type="frame" aspect="atleast" focusposition="0.5,0.5" />
                            <v:textbox inset="30pt,30pt,30pt,30pt" style="mso-fit-shape-to-text:true;">
                    <![endif]-->
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tbody>
                            <tr>
                              <td align="center">
                                <h2 class="inkling-header-card-heading" style="color:#000000;">
                                  This is the header card
                                </h2>
                              </td>
                            </tr>
                            <tr>
                              <td class="inkling-header-card-subheading-wrapper" align="center">
                                <p class="inkling-header-card-subheading" style="color:#000000;">hello</p>
                              </td>
                            </tr>
                            <tr>
                              <td class="inkling-header-button-wrapper">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                  <tbody>
                                    <tr>
                                      <td align="center" style="background-color: #000000;">
                                        <a href="https://example.com/" style="color: #ffffff;">The button</a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <!--[if mso]>
            </v:textbox>
        </v:rect>
        <![endif]-->
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
        'pins the full legacy email output (no customization flags)',
        editorTest(async function () {
          const headerNode = $createHeaderNode(dataset)
          const { element } = headerNode.exportDOM(editor, { ...exportOptions, target: 'email' })

          await expectPrettifiedHtml(
            (element as HTMLElement).outerHTML,
            // duplicated `#000000` is current renderer output (header-renderer.ts
            // concatenates buttonStyle + buttonAccent) — pinned verbatim for plan 040
            html`
              <div
                class="inkling-header-card inkling-v2 inkling-header-card-light-bg"
                style="color:#000000; text-align: center; background-image: url(https://example.com/image.jpg); background-size: cover; background-position: center center; "
              >
                <div class="inkling-header-card-content" style="">
                  <h2 class="inkling-header-card-heading" style="color:#000000;">This is the header card</h2>
                  <p class="inkling-header-card-subheading" style="color:#000000;">hello</p>
                  <a
                    class="inkling-header-card-button"
                    href="https://example.com/"
                    style="color: #FFFFFF; background-color: #000000; #000000"
                    >The button</a
                  >
                </div>
              </div>
            `,
          )
        }),
      )
    })

    describe('email target (Outlook compatibility)', function () {
      const emailOptions = () => ({
        ...exportOptions,
        target: 'email',
        feature: { emailCustomization: true },
      })

      it(
        'adds a dark/light background class based on the text color',
        editorTest(function () {
          const darkNode = $createHeaderNode({ ...dataset, backgroundImageSrc: '', textColor: '#FFFFFF' })
          const { element: darkElement } = darkNode.exportDOM(editor, emailOptions())
          expect((darkElement as HTMLElement).className).toContain('inkling-header-card-dark-bg')

          const lightNode = $createHeaderNode({ ...dataset, backgroundImageSrc: '', textColor: '#000000' })
          const { element: lightElement } = lightNode.exportDOM(editor, emailOptions())
          expect((lightElement as HTMLElement).className).toContain('inkling-header-card-light-bg')
        }),
      )

      it(
        'adds the background class to the legacy (non-customization) email output too',
        editorTest(function () {
          const node = $createHeaderNode({ ...dataset, backgroundImageSrc: '', textColor: '#FFFFFF' })
          const { element } = node.exportDOM(editor, { ...exportOptions, target: 'email' })
          expect((element as HTMLElement).className).toContain('inkling-header-card-dark-bg')
        }),
      )

      it(
        'renders a VML background image for Outlook in split layout',
        editorTest(function () {
          const node = $createHeaderNode({ ...dataset, layout: 'split', backgroundSize: 'contain' })
          const { element } = node.exportDOM(editor, emailOptions())
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('<!--[if mso]>')
          expect(html).toContain('urn:schemas-microsoft-com:vml')
          expect(html).toContain('size="225pt,120pt"')
          expect(html).toContain('src="https://example.com/image.jpg"')
          expect(html).toContain('bgcolor="#F0F0F0"')
        }),
      )

      it(
        'wraps the content in a VML image rect when a background image is used without split layout',
        editorTest(function () {
          const node = $createHeaderNode({ ...dataset, layout: 'full' })
          const { element } = node.exportDOM(editor, emailOptions())
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('mso-fit-shape-to-text:true;')
          expect(html).toContain('</v:textbox>')
          expect(html).toContain('</v:rect>')
          // non-Outlook clients still get a plain td without padding overrides
          expect(html).toContain('<!--[if !mso]><!-->')
        }),
      )

      it(
        'omits VML content wrappers when there is no background image',
        editorTest(function () {
          const node = $createHeaderNode({ ...dataset, backgroundImageSrc: '' })
          const { element } = node.exportDOM(editor, emailOptions())
          const html = (element as HTMLElement).outerHTML

          expect(html).not.toContain('urn:schemas-microsoft-com:vml')
          expect(html).toContain('inkling-header-card-content')
        }),
      )

      it(
        'does not interpolate an unsafe background image src into VML',
        editorTest(function () {
          const node = $createHeaderNode({ ...dataset, backgroundImageSrc: 'javascript:alert(1)' })
          const { element } = node.exportDOM(editor, emailOptions())
          const html = (element as HTMLElement).outerHTML

          expect(html).not.toContain('javascript:')
          expect(html).not.toContain('urn:schemas-microsoft-com:vml')
        }),
      )
    })

    describe('email target with design options', function () {
      it(
        'renders outline button with empty feature bag',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundImageSrc: '',
            buttonColor: '#FF0000',
          })
          const { element } = node.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            feature: {},
            design: { buttonStyle: 'outline' },
          })
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('class="inkling-header-button-wrapper"')
          expect(html).toContain('background-color: transparent')
          expect(html).toContain('border: 1px solid currentColor')
          expect(html).toContain('color: #FF0000')
        }),
      )

      it(
        'renders fill button with empty feature bag',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundImageSrc: '',
            buttonColor: '#FF0000',
          })
          const { element } = node.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            feature: {},
            design: { buttonStyle: 'fill' },
          })
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('class="inkling-header-button-wrapper"')
          expect(html).toContain('background-color: #FF0000')
        }),
      )

      it(
        'chooses white text for a dark custom fill',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundImageSrc: '',
            buttonColor: '#000000',
          })
          const { element } = node.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            design: { buttonStyle: 'fill' },
          })
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('background-color: #000000')
          expect(html).toContain('color: #FFFFFF')
        }),
      )

      it(
        'chooses black text for a light custom fill',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundImageSrc: '',
            buttonColor: '#FFFFFF',
          })
          const { element } = node.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            design: { buttonStyle: 'fill' },
          })
          const html = (element as HTMLElement).outerHTML

          expect(html).toContain('background-color: #FFFFFF')
          expect(html).toContain('color: #000000')
        }),
      )

      it(
        'resolves accent color to a concrete value',
        editorTest(function () {
          const node = $createHeaderNode({
            ...dataset,
            backgroundImageSrc: '',
            buttonColor: 'accent',
            accentColor: '#FF0000',
          })
          const { element } = node.exportDOM(editor, {
            ...exportOptions,
            target: 'email',
            design: { buttonStyle: 'fill' },
          })
          const html = (element as HTMLElement).outerHTML

          expect(html).not.toContain('color: accent')
          expect(html).toContain('background-color: #FF0000')
        }),
      )
    })
  })
})
