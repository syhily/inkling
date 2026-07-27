import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseCodeBlockNode } from '@/nodes/base/nodes/codeblock/CodeBlockNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

// `as const` keeps the literal `name`s and value types on the declaration's
// type — the `__*` field map derives both from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
] as const satisfies readonly NestedEditorSpec[]

const transientProps = [
  // the `_openInEditMode` edit-mode flag is the same shape as the upload
  // cards' transient props: read from the construction dataset, never
  // serialized, cleared via the node's `clearOpenInEditMode`
  {
    name: '_openInEditMode',
    privateName: '__openInEditMode',
    initial: (dataset): boolean => (dataset._openInEditMode || false) as boolean,
  },
] as const satisfies readonly TransientPropSpec[]

export const codeBlockDeclaration = {
  nodeType: 'codeblock',
  baseNode: BaseCodeBlockNode,
  nestedEditors,
  transientProps,
  decorateTarget: {
    wrapperStyle: 'code-card',
  },
  // No menu entry — the code block is inserted by its markdown code fence —
  // so the drag-preview icon is named explicitly instead.
  dragIcon: 'codeblock',
  // diverges from the node type: the toolbar label is a live e2e selector
  // contract ("code-block"), not a transform of "codeblock"
  toolbarLabel: 'code-block',
  // Markdown-eligible with no card transformer: the code fence is handled
  // by DEFAULT_TRANSFORMERS (`CODE_BLOCK` in `@/markdown/transformers`).
  markdown: true,
} satisfies CardDeclaration<'codeblock'>
