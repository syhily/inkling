import type { TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseAudioNode } from '@/nodes/base/nodes/audio/AudioNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_AUDIO_COMMAND } from './card-commands'

const transientProps: readonly TransientPropSpec[] = [
  {
    name: 'triggerFileDialog',
    // don't trigger the file dialog when rendering if we've already been given a url
    initial: (dataset) => (!dataset.src && dataset.triggerFileDialog) || false,
  },
  { name: 'initialFile' },
]

export const audioDeclaration = {
  nodeType: 'audio',
  baseNode: BaseAudioNode,
  transientProps,
  menu: [
    {
      label: 'Audio',
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
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'audio'>
