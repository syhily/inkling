import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { HeaderNode } from '@/nodes/base/nodes/header/HeaderNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'headerTextEditor',
    serializedKey: 'header',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
    // Header's dataset exposes the editors but not their initial states.
    exposeInitialStateInDataset: false,
  },
  {
    name: 'subheaderTextEditor',
    serializedKey: 'subheader',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
    exposeInitialStateInDataset: false,
  },
]

export const headerDeclaration = {
  nodeType: 'header',
  baseNode: HeaderNode,
  nestedEditors,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    // Not markdown-eligible: the header card has no markdown representation.
    markdown: false,
  },
} satisfies CardDeclaration<'header'>
