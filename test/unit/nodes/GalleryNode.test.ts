import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  GalleryNode,
  $createGalleryNode,
  $isGalleryNode,
  INSERT_GALLERY_COMMAND,
  MAX_IMAGES,
  recalculateImageRows,
} from '@/nodes/GalleryNode'

const editorNodes = [GalleryNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('GalleryNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isGalleryNode', async () => {
    await updateEditor(editor, () => {
      const node = $createGalleryNode({})
      expect($isGalleryNode(node)).toBe(true)
    })
  })

  it('exposes a static cardMenu entry', () => {
    expect(GalleryNode.cardMenu[0].label).toBe('Gallery')
    expect(GalleryNode.cardMenu[0].insertCommand).toBe(INSERT_GALLERY_COMMAND)
  })

  it('returns the gallery icon', async () => {
    await updateEditor(editor, () => {
      const node = $createGalleryNode({})
      expect(typeof node.getIcon()).toBe('function')
    })
  })

  it('getDataset includes caption editor state', async () => {
    await updateEditor(editor, () => {
      const node = $createGalleryNode({ caption: 'A caption' })
      const dataset = node.getDataset()

      expect(dataset.caption).toBe('A caption')
      expect(dataset.captionEditor).toBeDefined()
      expect(dataset.captionEditorInitialState).toBeDefined()
    })
  })

  it('exports caption as html when a caption editor exists', async () => {
    await updateEditor(editor, () => {
      const node = $createGalleryNode({})
      node.__captionEditor = createHeadlessEditor({
        nodes: editorNodes,
        onError: () => {},
      })

      node.__captionEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const paragraph = root.append($createParagraphNode())
          paragraph.append($createTextNode('Hello caption'))
        },
        { onUpdate: () => {} },
      )

      const json = node.exportJSON()
      expect(json.caption).toContain('Hello caption')
    })
  })

  it('recalculates image rows', () => {
    const images = [{ src: '1' }, { src: '2' }, { src: '3' }, { src: '4' }]
    recalculateImageRows(images as import('@/types/gallery').GalleryImage[])

    expect(images[0].row).toBe(0)
    expect(images[1].row).toBe(0)
    expect(images[2].row).toBe(0)
    expect(images[3].row).toBe(1)
  })

  it('limits images when setting', async () => {
    await updateEditor(editor, () => {
      const node = $createGalleryNode({})
      const images = Array.from({ length: MAX_IMAGES + 2 }, (_, i) => ({ src: String(i) }))
      node.setImages(images as import('@/types/gallery').GalleryImage[])

      expect(node.images).toHaveLength(MAX_IMAGES)
    })
  })

  it('adds images up to the maximum', async () => {
    await updateEditor(editor, () => {
      const node = $createGalleryNode({})
      node.setImages([{ src: '0' }, { src: '1' }] as import('@/types/gallery').GalleryImage[])
      node.addImages(
        Array.from({ length: MAX_IMAGES }, (_, i) => ({
          src: String(i + 2),
        })) as import('@/types/gallery').GalleryImage[],
      )

      expect(node.images).toHaveLength(MAX_IMAGES)
    })
  })
})
