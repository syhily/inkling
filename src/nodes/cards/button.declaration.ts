import { ButtonNode } from '@/nodes/base/nodes/button/ButtonNode'

import type { CardDeclaration } from './card-declaration'

export const buttonDeclaration = {
  nodeType: 'button',
  baseNode: ButtonNode,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'button'>
