import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'

import { $createHeaderNode, HeaderNode, type HeaderNodeDataset } from '@/nodes/HeaderNode'

const editorNodes = [HeaderNode]

describe('HeaderNode v2', function () {
  let editor: LexicalEditor
  let dataset: HeaderNodeDataset

  const editorTest = (testFn: () => void) =>
    function (): Promise<void> {
      return new Promise((resolve, reject) => {
        editor.update(() => {
          try {
            testFn()
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })
    }

  beforeEach(function () {
    editor = createHeadlessEditor({ nodes: editorNodes })

    dataset = {
      version: 2,
      size: 'small',
      style: 'dark',
      buttonEnabled: false,
      buttonUrl: '',
      buttonText: '',
      header:
        '<span style="white-space: pre-wrap;">Hello header</span><br><span style="white-space: pre-wrap;">On two lines, even.</span>',
      subheader:
        '<p dir="ltr"><span style="white-space: pre-wrap;">Subheadings are awesome</span><br><span style="white-space: pre-wrap;">I like them a lot.</span></p>',
      backgroundImageSrc: '',
      accentColor: '#ff0095',
      alignment: 'center',
      backgroundColor: '#000000',
      backgroundImageWidth: null,
      backgroundImageHeight: null,
      backgroundSize: 'cover',
      textColor: '#FFFFFF',
      buttonColor: '#ffffff',
      buttonTextColor: '#000000',
      layout: 'full',
      swapped: false,
    }
  })

  describe('Content load and export testing', function () {
    it(
      'handles titles with extra br',
      editorTest(function () {
        dataset.header = '<span>Product title!</span> <br><span>Hello part 2</span>'
        const headerNode = $createHeaderNode(dataset)
        const json = headerNode.exportJSON()
        const heading = json.header
        expect(heading).toEqual(
          '<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>',
        )
      }),
    )
    it(
      'loads and unwraps headers when wrapped with p',
      editorTest(function () {
        dataset.header = '<p><span>Product title!</span> <br><span>Hello part 2</span></p>'
        const headerNode = $createHeaderNode(dataset)
        const json = headerNode.exportJSON()
        const heading = json.header
        expect(heading).toEqual(
          '<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>',
        )
      }),
    )
    it(
      'allows br tags in subheaders',
      editorTest(function () {
        dataset.subheader = '<span>Product title!</span> <br><span>Hello part 2</span>'
        const headerNode = $createHeaderNode(dataset)
        const json = headerNode.exportJSON()
        const subheading = json.subheader
        expect(subheading).toEqual(
          '<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>',
        )
      }),
    )
    it(
      'can handle subheaders that are wrapped in p tags',
      editorTest(function () {
        dataset.subheader = '<p><span>Product title!</span> <br><span>Hello part 2</span></p>'
        const headerNode = $createHeaderNode(dataset)
        const json = headerNode.exportJSON()
        const subheading = json.subheader
        expect(subheading).toEqual(
          '<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>',
        )
      }),
    )
  })

  describe('Dataset property round-tripping', function () {
    it(
      'preserves layout, swapped and backgroundSize fields',
      editorTest(function () {
        dataset.layout = 'split'
        dataset.swapped = true
        dataset.backgroundSize = 'contain'
        const headerNode = $createHeaderNode(dataset)
        const json = headerNode.exportJSON()
        expect(json.layout).toEqual('split')
        expect(json.swapped).toEqual(true)
        expect(json.backgroundSize).toEqual('contain')
      }),
    )

    it(
      'uses the default property values when fields are omitted',
      editorTest(function () {
        const minimalDataset = {
          version: 2,
          header: '<span>Hello</span>',
          subheader: '',
        }
        const headerNode = $createHeaderNode(minimalDataset)
        const json = headerNode.exportJSON()
        expect(json.layout).toEqual('full')
        expect(json.swapped).toEqual(false)
        expect(json.backgroundSize).toEqual('cover')
        expect(json.buttonEnabled).toEqual(false)
        expect(json.alignment).toEqual('center')
      }),
    )

    it(
      'reports the correct card width based on layout',
      editorTest(function () {
        dataset.layout = 'split'
        const headerNode = $createHeaderNode(dataset)
        expect(headerNode.getCardWidth()).toEqual('full')

        headerNode.layout = 'wide'
        expect(headerNode.getCardWidth()).toEqual('wide')
      }),
    )
  })
})
