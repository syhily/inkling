import type { LexicalNode } from 'lexical'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseImageNode } from '@/nodes/base/nodes/image/ImageNode'
import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_IMAGE_COMMAND, OPEN_GIF_SELECTOR_COMMAND } from './card-commands'

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
  baseNode: BaseImageNode,
  nestedEditors,
  transientProps,
  decorateTarget: {
    width: (node: LexicalNode) => normalizeCardWidth((node as BaseImageNode).cardWidth) ?? 'regular',
  },
  menu: [
    {
      label: 'Image',
      desc: 'Upload, or embed with /image [url]',
      icon: 'image',
      command: INSERT_IMAGE_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['image', 'img'],
      queryParams: ['src'],
      priority: 1,
      shortcut: '/image',
    },
    {
      label: 'GIF',
      desc: 'Search and embed gifs',
      icon: 'gif',
      command: OPEN_GIF_SELECTOR_COMMAND,
      insertParams: {
        triggerFileDialog: false,
      },
      matches: ['gif', 'giphy', 'tenor', 'klipy'],
      priority: 17,
      queryParams: ['src'],
      isHidden: ({ config }) => !config?.tenor && !config?.klipy,
      shortcut: '/gif',
    },
  ],
  insert: { command: INSERT_IMAGE_COMMAND, claimsMediaInsert: true },
  uploadType: 'image',
  toolbarLabel: 'image',
  markdown: true,
} satisfies CardDeclaration<'image'>
