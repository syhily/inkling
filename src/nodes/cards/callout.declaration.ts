import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { CalloutNode, calloutImportSpec } from '@/nodes/base/nodes/callout/CalloutNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'calloutTextEditor',
    serializedKey: 'calloutText',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { allowBr: true },
  },
]

export const calloutDeclaration = {
  nodeType: 'callout',
  baseNode: CalloutNode,
  nestedEditors,
  importSpec: calloutImportSpec,
  insert: { openInEditMode: true },
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'callout'>
