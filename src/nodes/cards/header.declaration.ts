import { HeaderNode } from '@/nodes/base/nodes/header/HeaderNode'

import type { CardDeclaration } from './card-declaration'

export const headerDeclaration = {
  nodeType: 'header',
  baseNode: HeaderNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    // Not markdown-eligible: the header card has no markdown representation.
    markdown: false,
  },
} satisfies CardDeclaration<'header'>
