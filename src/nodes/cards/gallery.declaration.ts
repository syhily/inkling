import { GalleryNode } from '@/nodes/base/nodes/gallery/GalleryNode'

import type { CardDeclaration } from './card-declaration'

export const galleryDeclaration = {
  nodeType: 'gallery',
  baseNode: GalleryNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'gallery'>
