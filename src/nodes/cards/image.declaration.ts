import type { LexicalNode } from 'lexical'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { ImageNode, imageImportSpec } from '@/nodes/base/nodes/image/ImageNode'
import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true },
  },
]

const transientProps: readonly TransientPropSpec[] = [
  { name: 'previewSrc', initial: (dataset) => dataset.previewSrc || '', datasetKey: '__previewSrc' },
  {
    name: 'triggerFileDialog',
    // don't trigger the file dialog when rendering if we've already been given a url
    initial: (dataset) => (!dataset.src && dataset.triggerFileDialog) || false,
    datasetKey: '__triggerFileDialog',
  },
  // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
  { name: 'initialFile', initial: (dataset) => dataset.initialFile || undefined },
  // selector overlay component (e.g. the GIF picker) and the flag that hides
  // the image while it is open — client-side only, never serialized
  { name: 'selector' },
  { name: 'isImageHidden' },
]

export const imageDeclaration = {
  nodeType: 'image',
  baseNode: ImageNode,
  nestedEditors,
  transientProps,
  importSpec: imageImportSpec,
  decorateTarget: {
    width: (node: LexicalNode) => normalizeCardWidth((node as ImageNode).cardWidth) ?? 'regular',
  },
  insert: { claimsMediaInsert: true },
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'image'>
