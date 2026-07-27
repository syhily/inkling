import type { LexicalNode, NodeKey } from 'lexical'
import type { ComponentType } from 'react'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseImageNode } from '@/nodes/base/nodes/image/ImageNode'
import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_IMAGE_COMMAND, OPEN_GIF_SELECTOR_COMMAND, OPEN_IMAGE_LIBRARY_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and value types on the declaration's
// type — the `__*` field map derives both from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true },
  },
] as const satisfies readonly NestedEditorSpec[]

const transientProps = [
  {
    name: 'previewSrc',
    initial: (dataset): string | null => (dataset.previewSrc || '') as string,
    datasetKey: '__previewSrc',
  },
  {
    name: 'triggerFileDialog',
    // don't trigger the file dialog when rendering if we've already been given a url
    initial: (dataset): boolean => ((!dataset.src && dataset.triggerFileDialog) || false) as boolean,
    datasetKey: '__triggerFileDialog',
  },
  // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
  {
    name: 'initialFile',
    initial: (dataset): File | undefined => (dataset.initialFile || undefined) as File | undefined,
  },
  // selector overlay component (e.g. the GIF picker) and the flag that hides
  // the image while it is open — client-side only, never serialized
  {
    name: 'selector',
    initial: (dataset): ComponentType<{ nodeKey: NodeKey }> | undefined =>
      dataset.selector as ComponentType<{ nodeKey: NodeKey }> | undefined,
  },
  { name: 'isImageHidden', initial: (dataset): boolean | undefined => dataset.isImageHidden as boolean | undefined },
] as const satisfies readonly TransientPropSpec[]

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
      labelKey: 'image',
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
      labelKey: 'gif',
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
    {
      label: 'Image library',
      labelKey: 'imageLibrary',
      desc: 'Pick from your media library',
      icon: 'image',
      command: OPEN_IMAGE_LIBRARY_COMMAND,
      insertParams: {
        triggerFileDialog: false,
      },
      matches: ['library', 'media'],
      priority: 18,
      isHidden: ({ config }) => !config?.imageLibrary,
      shortcut: '/library',
    },
  ],
  insert: { command: INSERT_IMAGE_COMMAND, claimsMediaInsert: true },
  uploadType: 'image',
  toolbarLabel: 'image',
  markdown: true,
} satisfies CardDeclaration<'image'>
