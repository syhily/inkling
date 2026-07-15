import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { ToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
import BASIC_NODES from '@/nodes/BasicNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'titleEditor',
    serializedKey: 'heading',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
  },
  {
    name: 'contentEditor',
    serializedKey: 'content',
    nodes: BASIC_NODES,
    cleanBasicHtml: { allowBr: true },
  },
]

export const toggleDeclaration = {
  nodeType: 'toggle',
  baseNode: ToggleNode,
  nestedEditors,
  decorateTarget: {
    width: 'regular',
  },
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'toggle'>
