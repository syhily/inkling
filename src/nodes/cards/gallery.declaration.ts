import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseGalleryNode } from '@/nodes/base/nodes/gallery/GalleryNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_GALLERY_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s on the declaration's type — the shim's
// `__*` field map derives its keys from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
] as const satisfies readonly NestedEditorSpec[]

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
      labelKey: 'gallery',
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
  toolbarLabel: 'gallery',
  markdown: true,
} satisfies CardDeclaration<'gallery'>
