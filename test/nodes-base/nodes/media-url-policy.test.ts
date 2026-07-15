import type { Klass, LexicalEditor, LexicalNode } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'

import type { ExportDOMOptions } from '@/nodes/base/index'

import { dom } from '#/nodes-base/test-utils/index'
import {
  BaseAudioNode,
  BookmarkNode,
  GalleryNode,
  ImageNode,
  VideoNode,
  $createAudioNode,
  $createBookmarkNode,
  $createGalleryNode,
  $createImageNode,
  $createVideoNode,
} from '@/nodes/base/index'

const rejectedMediaSource = 'unsupported-scheme:payload'

function exportCardHtml(nodes: Klass<LexicalNode>[], createNode: () => LexicalNode, options: ExportDOMOptions = {}) {
  const editor: LexicalEditor = createHeadlessEditor({ nodes })
  let html = ''
  editor.update(() => {
    const node = createNode() as LexicalNode & {
      exportDOM(editor: LexicalEditor, options: ExportDOMOptions): { element: unknown }
    }
    const { element } = node.exportDOM(editor, { dom, ...options })
    html = (element as HTMLElement).outerHTML
  })
  return html
}

describe('media URL policy consistency', function () {
  it.each([
    ['image', () => exportCardHtml([ImageNode], () => $createImageNode({ src: rejectedMediaSource }))],
    [
      'gallery',
      () =>
        exportCardHtml([GalleryNode], () =>
          $createGalleryNode({
            images: [{ row: 0, fileName: 'bad.jpg', src: rejectedMediaSource, width: 100, height: 100 }],
            caption: '',
          }),
        ),
    ],
    [
      'audio (web)',
      () =>
        exportCardHtml([BaseAudioNode], () =>
          $createAudioNode({ src: rejectedMediaSource, title: 'title', duration: 60, thumbnailSrc: '' }),
        ),
    ],
    [
      'audio (email)',
      () =>
        exportCardHtml(
          [BaseAudioNode],
          () => $createAudioNode({ src: rejectedMediaSource, title: 'title', duration: 60, thumbnailSrc: '' }),
          { target: 'email', postUrl: 'https://example.com/posts/test-audio' },
        ),
    ],
    [
      'video',
      () =>
        exportCardHtml([VideoNode], () =>
          $createVideoNode({
            src: rejectedMediaSource,
            width: 200,
            height: 100,
            duration: 60,
            thumbnailSrc: rejectedMediaSource,
          }),
        ),
    ],
    [
      'bookmark (web)',
      () =>
        exportCardHtml([BookmarkNode], () =>
          $createBookmarkNode({
            url: 'https://example.com',
            metadata: {
              icon: rejectedMediaSource,
              title: 'title',
              description: '',
              author: '',
              publisher: '',
              thumbnail: rejectedMediaSource,
            },
            caption: '',
          }),
        ),
    ],
  ])('never emits the rejected media source for %s', (_name, render) => {
    expect(render()).not.toContain(rejectedMediaSource)
  })
})
