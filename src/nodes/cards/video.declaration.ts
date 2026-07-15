import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { VideoNode } from '@/nodes/base/nodes/video/VideoNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

export const videoDeclaration = {
  nodeType: 'video',
  baseNode: VideoNode,
  nestedEditors,
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'video'>
