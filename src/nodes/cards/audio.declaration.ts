import type { TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { transientInitialFileProp, transientTriggerFileDialogProp } from '@/nodes/base/generate-decorator-node'
import { BaseAudioNode } from '@/nodes/base/nodes/audio/AudioNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_AUDIO_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and `initial` value types on the
// declaration's type — the `__*` field map derives both from them
// (CardSpecFieldMap)
export const transientProps = [
  transientTriggerFileDialogProp,
  transientInitialFileProp,
] as const satisfies readonly TransientPropSpec[]

export const audioDeclaration = {
  nodeType: 'audio',
  baseNode: BaseAudioNode,
  transientProps,
  menu: [
    {
      label: 'Audio',
      labelKey: 'audio',
      desc: 'Upload and play an audio file',
      icon: 'audio',
      command: INSERT_AUDIO_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['audio'],
      priority: 14,
      shortcut: '/audio',
    },
  ],
  insert: { command: INSERT_AUDIO_COMMAND, claimsMediaInsert: true },
  uploadType: 'audio',
  toolbarLabel: 'audio',
  markdown: true,
} satisfies CardDeclaration<'audio'>
