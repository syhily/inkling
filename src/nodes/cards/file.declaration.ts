import type { TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { fileOr, transientTriggerFileDialogProp } from '@/nodes/base/generate-decorator-node'
import { BaseFileNode } from '@/nodes/base/nodes/file/FileNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_FILE_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and `initial` value types on the
// declaration's type — the `__*` field map derives both from them
// (CardSpecFieldMap)
const transientProps = [
  transientTriggerFileDialogProp,
  { name: 'initialFile', initial: (dataset): File | undefined => fileOr(dataset.initialFile, undefined) },
] as const satisfies readonly TransientPropSpec[]

export const fileDeclaration = {
  nodeType: 'file',
  baseNode: BaseFileNode,
  transientProps,
  menu: [
    {
      label: 'File',
      labelKey: 'file',
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
  markdown: true,
} satisfies CardDeclaration<'file'>
