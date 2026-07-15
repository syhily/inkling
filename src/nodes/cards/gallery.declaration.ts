import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { GalleryNode } from '@/nodes/base/nodes/gallery/GalleryNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

export const galleryDeclaration = {
  nodeType: 'gallery',
  baseNode: GalleryNode,
  nestedEditors,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'gallery'>
