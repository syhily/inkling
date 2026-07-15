import { ImageNode } from '@/nodes/base/nodes/image/ImageNode'

import type { CardDeclaration } from './card-declaration'

export const imageDeclaration = {
  nodeType: 'image',
  baseNode: ImageNode,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'image'>
