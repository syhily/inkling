import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { CodeBlockNode } from '@/nodes/base/nodes/codeblock/CodeBlockNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

const transientProps: readonly TransientPropSpec[] = [
  // the `_openInEditMode` edit-mode flag is the same shape as the upload
  // cards' transient props: read from the construction dataset, never
  // serialized, cleared via the node's `clearOpenInEditMode`
  {
    name: '_openInEditMode',
    privateName: '__openInEditMode',
    initial: (dataset) => dataset._openInEditMode || false,
  },
]

export const codeBlockDeclaration = {
  nodeType: 'codeblock',
  baseNode: CodeBlockNode,
  nestedEditors,
  transientProps,
  decorateTarget: {
    wrapperStyle: 'code-card',
  },
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    // Markdown-eligible with no card transformer: the code fence is handled
    // by DEFAULT_TRANSFORMERS (`CODE_BLOCK` in `@/plugins/MarkdownShortcutPlugin`).
    markdown: true,
  },
} satisfies CardDeclaration<'codeblock'>
