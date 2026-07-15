import { createHeadlessEditor } from '@lexical/headless'
import { $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, LexicalEditor } from 'lexical'

import { expectPrettifiedHtml } from '#/nodes-base/test-utils/assertions'
import { createDocument, dom, html } from '#/nodes-base/test-utils/index'
import { VideoNode, $createVideoNode, $isVideoNode, type ExportDOMOptions } from '@/nodes/base/index'

const editorNodes = [VideoNode]

describe('VideoNode', function () {
  let editor: LexicalEditor
  let dataset: Record<string, unknown>
  let exportOptions: ExportDOMOptions

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
      src: '/content/images/2022/11/inkling-lexical.mp4',
      caption: 'This is a <b>caption</b>',
      fileName: 'inkling-lexical.mp4',
      mimeType: 'video/mp4',
      width: 200,
      height: 100,
      duration: 60,
      thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
      customThumbnailSrc: '/content/images/2022/11/inkling-lexical-custom.jpg',
      thumbnailWidth: 100,
      thumbnailHeight: 50,
    }

    exportOptions = {
      dom,
    }
  })

  it(
    'matches node with $isVideoNode',
    editorTest(async function () {
      const videoNode = $createVideoNode(dataset)
      expect($isVideoNode(videoNode)).toBe(true)
    }),
  )

  describe('data access', function () {
    it(
      'has getters for all properties',
      editorTest(async function () {
        const videoNode = $createVideoNode(dataset)

        expect(videoNode.src).toBe(dataset.src)
        expect(videoNode.caption).toBe(dataset.caption)
        expect(videoNode.fileName).toBe(dataset.fileName)
        expect(videoNode.mimeType).toBe(dataset.mimeType)
        expect(videoNode.width!).toBe(dataset.width)
        expect(videoNode.height!).toBe(dataset.height)
        expect(videoNode.duration).toBe(dataset.duration)
        expect(videoNode.thumbnailSrc).toBe(dataset.thumbnailSrc)
        expect(videoNode.customThumbnailSrc).toBe(dataset.customThumbnailSrc)
        expect(videoNode.thumbnailWidth!).toBe(dataset.thumbnailWidth)
        expect(videoNode.thumbnailHeight!).toBe(dataset.thumbnailHeight)
        expect(videoNode.cardWidth).toBe('regular')
        expect(videoNode.loop).toBe(false)
      }),
    )

    it(
      'can be created without a dataset',
      editorTest(async function () {
        const videoNode = $createVideoNode()

        expect(videoNode.getDataset()).toEqual({
          src: '',
          caption: '',
          fileName: '',
          mimeType: '',
          width: null,
          height: null,
          duration: 0,
          thumbnailSrc: '',
          customThumbnailSrc: '',
          thumbnailWidth: null,
          thumbnailHeight: null,
          cardWidth: 'regular',
          loop: false,
        })
      }),
    )

    it(
      'has setters for all properties',
      editorTest(async function () {
        const videoNode = $createVideoNode({} as Record<string, unknown>)

        expect(videoNode.src).toBe('')
        videoNode.src = '/content/images/2022/12/inkling-lexical.mp4'
        expect(videoNode.src).toBe('/content/images/2022/12/inkling-lexical.mp4')

        expect(videoNode.caption).toBe('')
        videoNode.caption = 'Caption'
        expect(videoNode.caption).toBe('Caption')

        expect(videoNode.fileName).toBe('')
        videoNode.fileName = 'inkling-lexical.mp4'
        expect(videoNode.fileName).toBe('inkling-lexical.mp4')

        expect(videoNode.mimeType).toBe('')
        videoNode.mimeType = 'video/mp4'
        expect(videoNode.mimeType).toBe('video/mp4')

        expect(videoNode.width).toBe(null)
        videoNode.width = 600
        expect(videoNode.width).toBe(600)

        expect(videoNode.height).toBe(null)
        videoNode.height = 700
        expect(videoNode.height).toBe(700)

        expect(videoNode.duration).toBe(0)
        videoNode.duration = 70
        expect(videoNode.duration).toBe(70)

        expect(videoNode.thumbnailSrc).toBe('')
        videoNode.thumbnailSrc = '/content/images/2022/12/inkling-lexical.png'
        expect(videoNode.thumbnailSrc).toBe('/content/images/2022/12/inkling-lexical.png')

        expect(videoNode.customThumbnailSrc).toBe('')
        videoNode.customThumbnailSrc = '/content/images/2022/12/inkling-lexical-custom.png'
        expect(videoNode.customThumbnailSrc).toBe('/content/images/2022/12/inkling-lexical-custom.png')

        expect(videoNode.thumbnailWidth).toBe(null)
        videoNode.thumbnailWidth = 100
        expect(videoNode.thumbnailWidth).toBe(100)

        expect(videoNode.thumbnailHeight).toBe(null)
        videoNode.thumbnailHeight = 200
        expect(videoNode.thumbnailHeight).toBe(200)

        expect(videoNode.cardWidth).toBe('regular')
        videoNode.cardWidth = 'wide'
        expect(videoNode.cardWidth).toBe('wide')

        expect(videoNode.loop).toBe(false)
        videoNode.loop = true
        expect(videoNode.loop).toBe(true)
      }),
    )

    it(
      'has getDataset() convenience method',
      editorTest(async function () {
        const videoNode = $createVideoNode(dataset)
        const videoNodeDataset = videoNode.getDataset()

        expect(videoNodeDataset).toEqual({
          ...dataset,
          cardWidth: 'regular',
          loop: false,
        })
      }),
    )

    it(
      'can format duration',
      editorTest(async function () {
        const videoNode = $createVideoNode(dataset)

        videoNode.duration = 60
        expect(videoNode.formattedDuration).toBe('1:00')

        videoNode.duration = 30
        expect(videoNode.formattedDuration).toBe('0:30')

        videoNode.duration = 0
        expect(videoNode.formattedDuration).toBe('0:00')

        videoNode.duration = 78
        expect(videoNode.formattedDuration).toBe('1:18')
      }),
    )
  })

  describe('exportJSON', function () {
    it(
      'contains all data',
      editorTest(async function () {
        dataset.cardWidth = 'wide'

        const videoNode = $createVideoNode(dataset)
        const json = videoNode.exportJSON()

        expect(json).toEqual({
          type: 'video',
          version: 1,
          src: dataset.src,
          caption: dataset.caption,
          fileName: dataset.fileName,
          mimeType: dataset.mimeType,
          width: dataset.width,
          height: dataset.height,
          duration: dataset.duration,
          thumbnailSrc: dataset.thumbnailSrc,
          customThumbnailSrc: dataset.customThumbnailSrc,
          thumbnailWidth: dataset.thumbnailWidth,
          thumbnailHeight: dataset.thumbnailHeight,
          cardWidth: dataset.cardWidth,
          loop: false,
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
                type: 'video',
                ...dataset,
                cardWidth: 'wide',
                loop: true,
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
            const [videoNode] = $getRoot().getChildren() as VideoNode[]

            expect(videoNode.src).toBe(dataset.src)
            expect(videoNode.caption).toBe(dataset.caption)
            expect(videoNode.fileName).toBe(dataset.fileName)
            expect(videoNode.mimeType).toBe(dataset.mimeType)
            expect(videoNode.width!).toBe(dataset.width)
            expect(videoNode.height!).toBe(dataset.height)
            expect(videoNode.duration).toBe(dataset.duration)
            expect(videoNode.thumbnailSrc).toBe(dataset.thumbnailSrc)
            expect(videoNode.customThumbnailSrc).toBe(dataset.customThumbnailSrc)
            expect(videoNode.thumbnailWidth!).toBe(dataset.thumbnailWidth)
            expect(videoNode.thumbnailHeight!).toBe(dataset.thumbnailHeight)
            expect(videoNode.cardWidth).toBe('wide')
            expect(videoNode.loop).toBe(true)

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
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
        }
        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure
              class="inkling-card inkling-video-card inkling-width-regular"
              data-inkling-thumbnail="/content/images/2022/11/inkling-lexical.jpg"
              data-inkling-custom-thumbnail=""
            >
              <div class="inkling-video-container">
                <video
                  src="/content/images/2022/11/inkling-lexical.mp4"
                  poster="https://img.spacergif.org/v1/200x100/0a/spacer.png"
                  width="200"
                  height="100"
                  playsinline=""
                  preload="metadata"
                  style="background: transparent url('/content/images/2022/11/inkling-lexical.jpg') 50% 50% / cover no-repeat;"
                ></video>
                <div class="inkling-video-overlay">
                  <button class="inkling-video-large-play-icon" aria-label="Play video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                      ></path>
                    </svg>
                  </button>
                </div>
                <div class="inkling-video-player-container">
                  <div class="inkling-video-player">
                    <button class="inkling-video-play-icon" aria-label="Play video">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                        ></path>
                      </svg>
                    </button>
                    <button class="inkling-video-pause-icon inkling-video-hide" aria-label="Pause video">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                        <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                      </svg>
                    </button>
                    <span class="inkling-video-current-time">0:00</span>
                    <div class="inkling-video-time">/<span class="inkling-video-duration">1:00</span></div>
                    <input type="range" class="inkling-video-seek-slider" max="100" value="0" />
                    <button class="inkling-video-playback-rate" aria-label="Adjust playback speed">1×</button>
                    <button class="inkling-video-unmute-icon" aria-label="Unmute">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"
                        ></path>
                      </svg>
                    </button>
                    <button class="inkling-video-mute-icon inkling-video-hide" aria-label="Mute">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"
                        ></path>
                      </svg>
                    </button>
                    <input type="range" class="inkling-video-volume-slider" max="100" value="100" />
                  </div>
                </div>
              </div>
            </figure>
          `,
        )
      }),
    )

    it(
      'renders for email target',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
        }

        const options = {
          target: 'email',
          postUrl: 'https://example.com/my-post',
        }
        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, { ...exportOptions, ...options })
        const output = (element as HTMLElement).outerHTML

        expect(output).not.toContain('<video')
        expect(output).toContain('<figure class="inkling-card inkling-video-card inkling-width-regular"')
        expect(output).toContain('<a class="inkling-video-preview" href="https://example.com/my-post"')
        expect(output).toContain('background="/content/images/2022/11/inkling-lexical.jpg"')
      }),
    )

    it(
      'pins the full email output with an escaped caption',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
          caption: 'This is a <b>caption</b>',
        }

        const options = {
          target: 'email',
          postUrl: 'https://example.com/my-post',
        }
        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, { ...exportOptions, ...options })

        await expectPrettifiedHtml(
          (element as HTMLElement).outerHTML,
          html`
            <figure class="inkling-card inkling-video-card inkling-width-regular inkling-card-hascaption">
              <!--[if !mso !vml]-->
              <a
                class="inkling-video-preview"
                href="https://example.com/my-post"
                aria-label="Play video"
                style="mso-hide: all"
                ><table
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  width="100%"
                  background="/content/images/2022/11/inkling-lexical.jpg"
                  role="presentation"
                  style="background: url('/content/images/2022/11/inkling-lexical.jpg') left top / cover; mso-hide: all"
                >
                  <tbody>
                    <tr style="mso-hide: all">
                      <td width="25%" style="visibility: hidden; mso-hide: all">
                        <img
                          src="https://img.spacergif.org/v1/150x300/0a/spacer.png"
                          alt=""
                          width="100%"
                          border="0"
                          style="display:block; height: auto; opacity: 0; visibility: hidden; mso-hide: all;"
                        />
                      </td>
                      <td width="50%" align="center" valign="middle" style="vertical-align: middle; mso-hide: all;">
                        <div class="inkling-video-play-button" style="mso-hide: all">
                          <div style="mso-hide: all"></div>
                        </div>
                      </td>
                      <td width="25%" style="mso-hide: all">&nbsp;</td>
                    </tr>
                  </tbody>
                </table></a
              >
              <!--[endif]-->
              <!--[if vml]>
                <v:group
                  xmlns:v="urn:schemas-microsoft-com:vml"
                  xmlns:w="urn:schemas-microsoft-com:office:word"
                  coordsize="600,300"
                  coordorigin="0,0"
                  href="https://example.com/my-post"
                  style="width:600px;height:300px;"
                >
                  <v:rect fill="t" stroked="f" style="position:absolute;width:600;height:300;"
                    ><v:fill src="/content/images/2022/11/inkling-lexical.jpg" type="frame"
                  /></v:rect>
                  <v:oval
                    fill="t"
                    strokecolor="white"
                    strokeweight="4px"
                    style="position:absolute;left:261;top:111;width:78;height:78"
                    ><v:fill color="black" opacity="30%"
                  /></v:oval>
                  <v:shape
                    coordsize="24,32"
                    path="m,l,32,24,16,xe"
                    fillcolor="white"
                    stroked="f"
                    style="position:absolute;left:289;top:133;width:30;height:34;"
                  />
                </v:group>
              <![endif]-->
              <figcaption>This is a &lt;b&gt;caption&lt;/b&gt;</figcaption>
            </figure>
          `,
        )
      }),
    )

    it(
      'throws when rendering email without postUrl',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
        }

        const videoNode = $createVideoNode(payload)

        expect(() => videoNode.exportDOM(editor, { ...exportOptions, target: 'email' })).toThrow(
          /^renderVideoNode requires options\.postUrl when options\.target is "email"$/,
        )
      }),
    )

    it(
      'renders without invalid dimensions when width and height are null',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: null,
          height: null,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML

        expect(output).not.toContain('nullxnull')
        expect(output).not.toContain(' width="null"')
        expect(output).not.toContain(' height="null"')
        expect(output).not.toContain(' poster=')
      }),
    )

    it(
      'renders email target with fallback dimensions when width and height are null',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: null,
          height: null,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
        }

        const options = {
          target: 'email',
          postUrl: 'https://example.com/my-post',
        }
        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, { ...exportOptions, ...options })
        const output = (element as HTMLElement).outerHTML

        expect(output).not.toContain('NaN')
        expect(output).toContain('https://img.spacergif.org/v1/150x338/0a/spacer.png')
        expect(output).toContain('height:338px;')
      }),
    )

    it(
      'renders card width',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
          cardWidth: 'wide',
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML
        expect(output).toContain('inkling-card inkling-video-card inkling-width-wide')
      }),
    )

    it(
      'renders loop attribute',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
          loop: true,
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML
        expect(output).toContain('loop')
      }),
    )

    it(
      'renders caption when provided',
      editorTest(async function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
          caption: '<strong>Caption</strong>',
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML
        expect(output).toContain(
          '<figure class="inkling-card inkling-video-card inkling-width-regular inkling-card-hascaption"',
        )
        expect(output).toContain('<figcaption>&lt;strong&gt;Caption&lt;/strong&gt;</figcaption>')
      }),
    )

    it(
      'rejects an unsafe video src',
      editorTest(function () {
        const payload = {
          src: 'javascript:alert(1)',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/content/images/2022/11/inkling-lexical.jpg',
          caption: '<strong>Caption</strong>',
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)

        expect((element as HTMLElement).outerHTML).toBe('<span></span>')
      }),
    )

    it(
      'escapes caption markup and sanitizes thumbnail URLs',
      editorTest(function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: 'javascript:alert(1)',
          customThumbnailSrc: '/content/images/2022/11/inkling-lexical-custom.jpg',
          caption: '<img src=x onerror=alert(1)>',
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML

        expect(output).toContain('<figcaption>&lt;img src=x onerror=alert(1)&gt;</figcaption>')
        expect(output).not.toContain('javascript:alert(1)')
        expect(output).toContain('/content/images/2022/11/inkling-lexical-custom.jpg')
      }),
    )

    it(
      'escapes quote-containing thumbnail URLs in the web template',
      editorTest(function () {
        const payload = {
          src: '/content/images/2022/11/inkling-lexical.mp4',
          width: 200,
          height: 100,
          duration: 60,
          thumbnailSrc: '/x"><img/src=y/onerror=alert(1)>',
        }

        const videoNode = $createVideoNode(payload)
        const { element } = videoNode.exportDOM(editor, exportOptions)
        const output = (element as HTMLElement).outerHTML

        expect(output).toContain('data-inkling-thumbnail="/x&quot;')
        expect(output).toContain('&quot;')
        expect((element as HTMLElement).querySelectorAll('img').length).toBe(0)
      }),
    )
  })

  describe('hasEditMode', function () {
    it(
      'returns true',
      editorTest(async function () {
        const videoNode = $createVideoNode(dataset)
        expect(videoNode.hasEditMode()).toBe(true)
      }),
    )
  })

  describe('importDOM', function () {
    it(
      'parses video card',
      editorTest(async function () {
        const document = createDocument(html`
          <figure
            class="inkling-card inkling-video-card inkling-width-regular"
            data-inkling-thumbnail="/content/images/2022/11/inkling-lexical.jpg"
            data-inkling-custom-thumbnail=""
          >
            <div class="inkling-video-container">
              <video
                src="/content/images/2022/11/inkling-lexical.mp4"
                poster="https://img.spacergif.org/v1/200x100/0a/spacer.png"
                width="200"
                height="100"
                playsinline=""
                preload="metadata"
                style="background: transparent url('/content/images/2022/11/inkling-lexical.jpg') 50% 50% / cover no-repeat;"
              ></video>
              <div class="inkling-video-overlay">
                <button class="inkling-video-large-play-icon" aria-label="Play video">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                    ></path>
                  </svg>
                </button>
              </div>
              <div class="inkling-video-player-container">
                <div class="inkling-video-player">
                  <button class="inkling-video-play-icon" aria-label="Play video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                      ></path>
                    </svg>
                  </button>
                  <button class="inkling-video-pause-icon inkling-video-hide" aria-label="Pause video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                      <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                    </svg>
                  </button>
                  <span class="inkling-video-current-time">0:00</span>
                  <div class="inkling-video-time">/<span class="inkling-video-duration">1:00</span></div>
                  <input type="range" class="inkling-video-seek-slider" max="100" value="0" />
                  <button class="inkling-video-playback-rate" aria-label="Adjust playback speed">1×</button>
                  <button class="inkling-video-unmute-icon" aria-label="Unmute">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"
                      ></path>
                    </svg>
                  </button>
                  <button class="inkling-video-mute-icon inkling-video-hide" aria-label="Mute">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"
                      ></path>
                    </svg>
                  </button>
                  <input type="range" class="inkling-video-volume-slider" max="100" value="100" />
                </div>
              </div>
            </div>
            <figcaption>Video caption</figcaption>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as VideoNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].src).toBe('/content/images/2022/11/inkling-lexical.mp4')
        expect(nodes[0].width!).toBe(200)
        expect(nodes[0].height!).toBe(100)
        expect(nodes[0].thumbnailSrc).toBe('/content/images/2022/11/inkling-lexical.jpg')
        expect(nodes[0].customThumbnailSrc).toBe('')
        expect(nodes[0].duration).toBe(60)
        expect(nodes[0].loop).toBe(false)
        expect(nodes[0].caption).toBe('Video caption')
        expect(nodes[0].cardWidth).toBe('regular')
      }),
    )

    it(
      'parses video card without caption',
      editorTest(async function () {
        const document = createDocument(html`
          <figure
            class="inkling-card inkling-video-card inkling-width-regular"
            data-inkling-thumbnail="/content/images/2022/11/inkling-lexical.jpg"
            data-inkling-custom-thumbnail=""
          >
            <div class="inkling-video-container">
              <video
                src="/content/images/2022/11/inkling-lexical.mp4"
                poster="https://img.spacergif.org/v1/200x100/0a/spacer.png"
                width="200"
                height="100"
                playsinline=""
                preload="metadata"
                style="background: transparent url('/content/images/2022/11/inkling-lexical.jpg') 50% 50% / cover no-repeat;"
              ></video>
              <div class="inkling-video-overlay">
                <button class="inkling-video-large-play-icon" aria-label="Play video">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                    ></path>
                  </svg>
                </button>
              </div>
              <div class="inkling-video-player-container">
                <div class="inkling-video-player">
                  <button class="inkling-video-play-icon" aria-label="Play video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                      ></path>
                    </svg>
                  </button>
                  <button class="inkling-video-pause-icon inkling-video-hide" aria-label="Pause video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                      <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                    </svg>
                  </button>
                  <span class="inkling-video-current-time">0:00</span>
                  <div class="inkling-video-time">/<span class="inkling-video-duration">1:00</span></div>
                  <input type="range" class="inkling-video-seek-slider" max="100" value="0" />
                  <button class="inkling-video-playback-rate" aria-label="Adjust playback speed">1×</button>
                  <button class="inkling-video-unmute-icon" aria-label="Unmute">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"
                      ></path>
                    </svg>
                  </button>
                  <button class="inkling-video-mute-icon inkling-video-hide" aria-label="Mute">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"
                      ></path>
                    </svg>
                  </button>
                  <input type="range" class="inkling-video-volume-slider" max="100" value="100" />
                </div>
              </div>
            </div>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as VideoNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].caption).toBe('')
      }),
    )

    it(
      'parses video card with custom thumbnail',
      editorTest(async function () {
        const document = createDocument(html`
          <figure
            class="inkling-card inkling-video-card inkling-width-regular"
            data-inkling-thumbnail=""
            data-inkling-custom-thumbnail="/content/images/2022/11/inkling-lexical-custom.jpg"
          >
            <div class="inkling-video-container">
              <video
                src="/content/images/2022/11/inkling-lexical.mp4"
                poster="https://img.spacergif.org/v1/200x100/0a/spacer.png"
                width="200"
                height="100"
                playsinline=""
                preload="metadata"
                style="background: transparent url('/content/images/2022/11/inkling-lexical.jpg') 50% 50% / cover no-repeat;"
              ></video>
              <div class="inkling-video-overlay">
                <button class="inkling-video-large-play-icon" aria-label="Play video">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                    ></path>
                  </svg>
                </button>
              </div>
              <div class="inkling-video-player-container">
                <div class="inkling-video-player">
                  <button class="inkling-video-play-icon" aria-label="Play video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                      ></path>
                    </svg>
                  </button>
                  <button class="inkling-video-pause-icon inkling-video-hide" aria-label="Pause video">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                      <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                    </svg>
                  </button>
                  <span class="inkling-video-current-time">0:00</span>
                  <div class="inkling-video-time">/<span class="inkling-video-duration">1:00</span></div>
                  <input type="range" class="inkling-video-seek-slider" max="100" value="0" />
                  <button class="inkling-video-playback-rate" aria-label="Adjust playback speed">1×</button>
                  <button class="inkling-video-unmute-icon" aria-label="Unmute">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"
                      ></path>
                    </svg>
                  </button>
                  <button class="inkling-video-mute-icon inkling-video-hide" aria-label="Mute">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"
                      ></path>
                    </svg>
                  </button>
                  <input type="range" class="inkling-video-volume-slider" max="100" value="100" />
                </div>
              </div>
            </div>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as VideoNode[]
        expect(nodes.length).toBe(1)
        expect(nodes[0].thumbnailSrc).toBe('')
        expect(nodes[0].customThumbnailSrc).toBe('/content/images/2022/11/inkling-lexical-custom.jpg')
      }),
    )

    it(
      'parses video card without width and height',
      editorTest(async function () {
        const document = createDocument(html`
          <figure
            class="inkling-card inkling-video-card inkling-width-regular"
            data-inkling-thumbnail="/content/images/2022/11/inkling-lexical.jpg"
            data-inkling-custom-thumbnail=""
          >
            <div class="inkling-video-container">
              <video
                src="/content/images/2022/11/inkling-lexical.mp4"
                playsinline=""
                preload="metadata"
                style="background: transparent url('/content/images/2022/11/inkling-lexical.jpg') 50% 50% / cover no-repeat;"
              ></video>
              <div class="inkling-video-overlay"></div>
              <div class="inkling-video-player-container">
                <div class="inkling-video-player">
                  <div class="inkling-video-time">/<span class="inkling-video-duration">1:00</span></div>
                </div>
              </div>
            </div>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as VideoNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].width).toBe(null)
        expect(nodes[0].height).toBe(null)
      }),
    )

    it(
      'parses wide card width from the figure container',
      editorTest(async function () {
        const document = createDocument(html`
          <figure
            class="inkling-card inkling-video-card inkling-width-wide"
            data-inkling-thumbnail="/content/images/2022/11/inkling-lexical.jpg"
            data-inkling-custom-thumbnail=""
          >
            <div class="inkling-video-container">
              <video src="/content/images/2022/11/inkling-lexical.mp4" width="200" height="100"></video>
              <div class="inkling-video-player-container">
                <div class="inkling-video-player">
                  <div class="inkling-video-time">/<span class="inkling-video-duration">1:00</span></div>
                </div>
              </div>
            </div>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as VideoNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].cardWidth).toBe('wide')
      }),
    )

    it(
      'ignores malformed duration strings',
      editorTest(async function () {
        const document = createDocument(html`
          <figure
            class="inkling-card inkling-video-card inkling-width-regular"
            data-inkling-thumbnail="/content/images/2022/11/inkling-lexical.jpg"
            data-inkling-custom-thumbnail=""
          >
            <div class="inkling-video-container">
              <video src="/content/images/2022/11/inkling-lexical.mp4" width="200" height="100"></video>
              <div class="inkling-video-player-container">
                <div class="inkling-video-player">
                  <div class="inkling-video-time">/<span class="inkling-video-duration">abc:12</span></div>
                </div>
              </div>
            </div>
          </figure>
        `)
        const nodes = $generateNodesFromDOM(editor, document) as VideoNode[]

        expect(nodes.length).toBe(1)
        expect(nodes[0].duration).toBe(0)
      }),
    )
  })

  describe('getTextContent', function () {
    it(
      'returns contents',
      editorTest(async function () {
        const node = $createVideoNode({} as Record<string, unknown>)
        expect(node.getTextContent()).toBe('')

        node.caption = 'Test caption'
        expect(node.getTextContent()).toBe('Test caption\n\n')
      }),
    )
  })
})
