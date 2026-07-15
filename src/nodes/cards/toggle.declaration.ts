import { ToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'

import type { CardDeclaration } from './card-declaration'

export const toggleDeclaration = {
  nodeType: 'toggle',
  baseNode: ToggleNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'toggle'>
