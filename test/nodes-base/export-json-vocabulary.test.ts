import type { LexicalEditor } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { describe, expect, it } from 'vitest'

import { $createFileNode, FileNode } from '@/nodes/base/nodes/file/FileNode'
import { $createImageNode, ImageNode } from '@/nodes/base/nodes/image/ImageNode'
import { $createVideoNode, VideoNode } from '@/nodes/base/nodes/video/VideoNode'

/**
 * Drift guard for the cards whose `exportJSON` is (or was) a hand-written key
 * list: the serialized vocabulary must stay tied to the card's declared
 * `properties`. Video/File derive `exportJSON` from the generated path, so
 * this pins the agreement for them; Image keeps a hand-written override
 * because its persisted key order is historical, so this is the check that
 * fails when a property is added without updating the override. Bookmark is
 * excluded — its serialized shape (nested `metadata`) is deliberately not a
 * flat property list.
 */

const editor: LexicalEditor = createHeadlessEditor({ nodes: [ImageNode, VideoNode, FileNode] })

function inEditor<T>(fn: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    editor.update(() => {
      try {
        resolve(fn())
      } catch (error) {
        reject(error)
      }
    })
  })
}

function declaredPropertyNames(nodeClass: { getPropertyDefaults(): Record<string, unknown> }): string[] {
  return Object.keys(nodeClass.getPropertyDefaults())
}

describe('card exportJSON vocabulary', function () {
  it('video exportJSON keys are exactly the declared properties, in declared order', () =>
    inEditor(() => {
      const json = $createVideoNode().exportJSON()
      expect(Object.keys(json)).toEqual(['type', 'version', ...declaredPropertyNames(VideoNode)])
    }))

  it('file exportJSON keys are exactly the declared properties, in declared order', () =>
    inEditor(() => {
      const json = $createFileNode().exportJSON()
      expect(Object.keys(json)).toEqual(['type', 'version', ...declaredPropertyNames(FileNode)])
    }))

  it('image exportJSON keys are exactly the declared properties, in the historical persisted order', () =>
    inEditor(() => {
      const json = $createImageNode().exportJSON()
      // the persisted key order differs from `imageProperties` order and
      // must not change — payloads stay byte-identical
      expect(Object.keys(json)).toEqual([
        'type',
        'version',
        'src',
        'width',
        'height',
        'title',
        'alt',
        'caption',
        'cardWidth',
        'href',
      ])
      expect(Object.keys(json).sort()).toEqual(['type', 'version', ...declaredPropertyNames(ImageNode)].sort())
    }))

  it.each([
    { card: 'image', create: $createImageNode },
    { card: 'video', create: $createVideoNode },
    { card: 'file', create: $createFileNode },
  ])('$card exportJSON persists the placeholder for a data-string src', ({ create }) =>
    inEditor(() => {
      const json = create({ src: 'data:image/png;base64,iVBORw0KGgo=' }).exportJSON()
      expect(json.src).toBe('<base64String>')
    }),
  )
})
