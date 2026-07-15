import { HtmlNode } from '@/nodes/base/nodes/html/HtmlNode'

import type { CardDeclaration } from './card-declaration'

export const htmlDeclaration = {
  nodeType: 'html',
  baseNode: HtmlNode,
  decorateTarget: {
    wrapperStyle: 'wide',
    // the icon component attaches one layer up (`@/nodes/cards/card-decorate`)
    hasIndicatorIcon: true,
  },
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'html'>
