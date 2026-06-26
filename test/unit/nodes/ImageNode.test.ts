import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { ImageNode, $createImageNode, $isImageNode, INSERT_IMAGE_COMMAND } from '@/nodes/ImageNode'

const editorNodes = [ImageNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('ImageNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isImageNode', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png' })
      expect($isImageNode(imageNode)).toBe(true)
    })
  })

  it('exposes triggerFileDialog setter', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png' })
      expect(imageNode.__triggerFileDialog).toBe(false)

      imageNode.triggerFileDialog = true
      expect(imageNode.__triggerFileDialog).toBe(true)
    })
  })

  it('includes transient properties in getDataset', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png', previewSrc: 'blob://preview' })
      imageNode.triggerFileDialog = true

      const dataset = imageNode.getDataset()
      expect(dataset.__previewSrc).toBe('blob://preview')
      expect(dataset.__triggerFileDialog).toBe(true)
      expect(dataset.src).toBe('/image.png')
    })
  })

  it('guards against a missing editor when exporting caption JSON', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png', caption: 'A caption' })
      const json = imageNode.exportJSON()
      expect(json.caption).toBe('A caption')
    })
  })

  it('exports caption as HTML when a caption editor exists', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png' })
      imageNode.__captionEditor = createHeadlessEditor({
        nodes: editorNodes,
        onError: () => {},
      })

      imageNode.__captionEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const paragraph = root.append($createParagraphNode())
          paragraph.append($createTextNode('Hello caption'))
        },
        { onUpdate: () => {} },
      )

      const json = imageNode.exportJSON()
      expect(json.caption).toContain('Hello caption')
    })
  })

  it('exposes a static kgMenu entry', () => {
    expect(ImageNode.kgMenu[0].label).toBe('Image')
    expect(ImageNode.kgMenu[0].insertCommand).toBe(INSERT_IMAGE_COMMAND)
  })

  it('returns the image icon', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png' })
      expect(typeof imageNode.getIcon()).toBe('function')
    })
  })

  it('creates a div DOM element', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png' })
      const element = imageNode.createDOM()
      expect(element.tagName).toBe('DIV')
    })
  })

  it('supports reading and writing previewSrc', async () => {
    await updateEditor(editor, () => {
      const imageNode = $createImageNode({ src: '/image.png' })
      imageNode.previewSrc = 'blob://preview'
      expect(imageNode.previewSrc).toBe('blob://preview')
    })
  })
})
