import type { TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { FileNode, fileImportSpec } from '@/nodes/base/nodes/file/FileNode'

import type { CardDeclaration } from './card-declaration'

const transientProps: readonly TransientPropSpec[] = [
  {
    name: 'triggerFileDialog',
    // don't trigger the file dialog when rendering if we've already been given a url
    initial: (dataset) => (!dataset.src && dataset.triggerFileDialog) || false,
  },
  { name: 'initialFile' },
]

export const fileDeclaration = {
  nodeType: 'file',
  baseNode: FileNode,
  transientProps,
  importSpec: fileImportSpec,
  insert: {},
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'file'>
