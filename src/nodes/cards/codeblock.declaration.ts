import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

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

export const codeBlockDeclaration = {
  nodeType: 'codeblock',
  baseNode: CodeBlockNode,
  nestedEditors,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    // Markdown-eligible with no card transformer: the code fence is handled
    // by DEFAULT_TRANSFORMERS (`CODE_BLOCK` in `@/plugins/MarkdownShortcutPlugin`).
    markdown: true,
  },
} satisfies CardDeclaration<'codeblock'>
