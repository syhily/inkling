import type { LexicalNode } from 'lexical'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseVideoNode } from '@/nodes/base/nodes/video/VideoNode'
import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_VIDEO_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s on the declaration's type — the shim's
// `__*` field map derives its keys from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
] as const satisfies readonly NestedEditorSpec[]

const transientProps = [
  {
    name: 'triggerFileDialog',
    // don't trigger the file dialog when rendering if we've already been given a url
    initial: (dataset) => (!dataset.src && dataset.triggerFileDialog) || false,
  },
  { name: 'initialFile', initial: (dataset) => dataset.initialFile || null },
] as const satisfies readonly TransientPropSpec[]

export const videoDeclaration = {
  nodeType: 'video',
  baseNode: BaseVideoNode,
  nestedEditors,
  transientProps,
  decorateTarget: {
    width: (node: LexicalNode) => normalizeCardWidth((node as BaseVideoNode).cardWidth) ?? 'regular',
  },
  menu: [
    {
      label: 'Video',
      labelKey: 'video',
      desc: 'Upload and play a video file',
      icon: 'video',
      command: INSERT_VIDEO_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['video'],
      priority: 13,
      shortcut: '/video',
    },
  ],
  insert: { command: INSERT_VIDEO_COMMAND, claimsMediaInsert: true },
  uploadType: 'video',
  toolbarLabel: 'video',
  markdown: true,
} satisfies CardDeclaration<'video'>
