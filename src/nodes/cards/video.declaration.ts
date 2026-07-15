import { VideoNode } from '@/nodes/base/nodes/video/VideoNode'

import type { CardDeclaration } from './card-declaration'

export const videoDeclaration = {
  nodeType: 'video',
  baseNode: VideoNode,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'video'>
