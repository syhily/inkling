import { BookmarkNode } from '@/nodes/base/nodes/bookmark/BookmarkNode'

import type { CardDeclaration } from './card-declaration'

export const bookmarkDeclaration = {
  nodeType: 'bookmark',
  baseNode: BookmarkNode,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'bookmark'>
