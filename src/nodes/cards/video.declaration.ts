import type { LexicalNode } from 'lexical'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { VideoNode } from '@/nodes/base/nodes/video/VideoNode'
import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

const transientProps: readonly TransientPropSpec[] = [
  {
    name: 'triggerFileDialog',
    // don't trigger the file dialog when rendering if we've already been given a url
    initial: (dataset) => (!dataset.src && dataset.triggerFileDialog) || false,
  },
  { name: 'initialFile', initial: (dataset) => dataset.initialFile || null },
]

export const videoDeclaration = {
  nodeType: 'video',
  baseNode: VideoNode,
  nestedEditors,
  transientProps,
  decorateTarget: {
    width: (node: LexicalNode) => normalizeCardWidth((node as VideoNode).cardWidth) ?? 'regular',
  },
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'video'>
