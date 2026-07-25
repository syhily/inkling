import type { TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseFileNode } from '@/nodes/base/nodes/file/FileNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_FILE_COMMAND } from './card-commands'

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
  baseNode: BaseFileNode,
  transientProps,
  menu: [
    {
      label: 'File',
      desc: 'Upload a downloadable file',
      icon: 'file',
      command: INSERT_FILE_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['file'],
      priority: 15,
      shortcut: '/file',
    },
  ],
  insert: { command: INSERT_FILE_COMMAND },
  uploadType: 'file',
  // diverges from the node type: the toolbar label is a live e2e selector
  // contract ("file-upload"), not a transform of "file"
  toolbarLabel: 'file-upload',
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'file'>
