import { FileNode } from '@/nodes/base/nodes/file/FileNode'

import type { CardDeclaration } from './card-declaration'

export const fileDeclaration = {
  nodeType: 'file',
  baseNode: FileNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'file'>
