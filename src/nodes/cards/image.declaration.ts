import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { ImageNode } from '@/nodes/base/nodes/image/ImageNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true },
  },
]

export const imageDeclaration = {
  nodeType: 'image',
  baseNode: ImageNode,
  nestedEditors,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'image'>
