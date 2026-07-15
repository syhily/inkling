import { BaseAudioNode } from '@/nodes/base/nodes/audio/AudioNode'

import type { CardDeclaration } from './card-declaration'

export const audioDeclaration = {
  nodeType: 'audio',
  baseNode: BaseAudioNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'audio'>
