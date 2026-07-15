import { CodeBlockNode } from '@/nodes/base/nodes/codeblock/CodeBlockNode'

import type { CardDeclaration } from './card-declaration'

export const codeBlockDeclaration = {
  nodeType: 'codeblock',
  baseNode: CodeBlockNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'codeblock'>
