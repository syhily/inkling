import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseGalleryNode } from '@/nodes/base/nodes/gallery/GalleryNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_GALLERY_COMMAND } from './card-commands'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

export const galleryDeclaration = {
  nodeType: 'gallery',
  baseNode: BaseGalleryNode,
  nestedEditors,
  decorateTarget: {
    width: 'wide',
  },
  menu: [
    {
      label: 'Gallery',
      desc: 'Create an image gallery',
      icon: 'gallery',
      command: INSERT_GALLERY_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['gallery'],
      priority: 5,
      shortcut: '/gallery',
    },
  ],
  insert: { command: INSERT_GALLERY_COMMAND },
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'gallery'>
