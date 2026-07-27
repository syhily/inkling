import { createHeadlessEditor } from '@lexical/headless'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { getCardDragIcon, getCardMenu } from '@/nodes/cards/card-menus'
import { VideoNode, $createVideoNode, $isVideoNode, INSERT_VIDEO_COMMAND } from '@/nodes/VideoNode'

const editorNodes = [VideoNode]

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

describe('VideoNode', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createHeadlessEditor({ nodes: editorNodes, onError: () => {} })
  })

  it('matches node with $isVideoNode', async () => {
    await updateEditor(editor, () => {
      const node = $createVideoNode({})
      expect($isVideoNode(node)).toBe(true)
    })
  })

  it('resolves a card menu entry', () => {
    expect(getCardMenu('video')?.[0]?.label).toBe('Video')
    expect(getCardMenu('video')?.[0]?.insertCommand).toBe(INSERT_VIDEO_COMMAND)
  })

  it('resolves the video drag icon from the card menu', () => {
    expect(typeof getCardDragIcon('video')).toBe('function')
  })

  it('sets __triggerFileDialog when no src is provided', async () => {
    await updateEditor(editor, () => {
      const node = $createVideoNode({ triggerFileDialog: true })
      expect(node.__triggerFileDialog).toBe(true)
    })
  })

  it('getDataset includes caption editor state', async () => {
    await updateEditor(editor, () => {
      const node = $createVideoNode({ caption: 'A caption' })
      const dataset = node.getDataset()

      expect(dataset.caption).toBe('A caption')
      expect(dataset.captionEditor).toBeDefined()
      expect(dataset.captionEditorInitialState).toBeDefined()
    })
  })

  it('exports caption as html when a caption editor exists', async () => {
    await updateEditor(editor, () => {
      const node = $createVideoNode({})
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
      if (!('caption' in json)) {
        throw new Error('Expected serialized video to include caption')
      }
      expect(json.caption).toContain('Hello caption')
    })
  })
})
