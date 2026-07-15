import { HtmlNode } from '@/nodes/base/nodes/html/HtmlNode'

import type { CardDeclaration } from './card-declaration'

export const htmlDeclaration = {
  nodeType: 'html',
  baseNode: HtmlNode,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'html'>
