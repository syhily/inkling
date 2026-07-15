import { CodeBlockNode } from '@/nodes/base/nodes/codeblock/CodeBlockNode'

import type { CardDeclaration } from './card-declaration'

export const codeBlockDeclaration = {
  nodeType: 'codeblock',
  baseNode: CodeBlockNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    // Markdown-eligible with no card transformer: the code fence is handled
    // by DEFAULT_TRANSFORMERS (`CODE_BLOCK` in `@/plugins/MarkdownShortcutPlugin`).
    markdown: true,
  },
} satisfies CardDeclaration<'codeblock'>
