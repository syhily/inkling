import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BookmarkNode } from '@/nodes/base/nodes/bookmark/BookmarkNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

export const bookmarkDeclaration = {
  nodeType: 'bookmark',
  baseNode: BookmarkNode,
  nestedEditors,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'bookmark'>
