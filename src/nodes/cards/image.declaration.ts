import type { NodeKey } from 'lexical'
import type { ComponentType } from 'react'

import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import {
  fnOr,
  strOr,
  transientInitialFileProp,
  transientTriggerFileDialogProp,
} from '@/nodes/base/generate-decorator-node'
import { BaseImageNode } from '@/nodes/base/nodes/image/ImageNode'
import { decorateCardWidth } from '@/nodes/base/utils/card-widths'

import type { CardDeclaration } from './card-declaration'

import { captionEditorSpec } from './caption-editor-spec'
import { INSERT_IMAGE_COMMAND, OPEN_GIF_SELECTOR_COMMAND, OPEN_IMAGE_LIBRARY_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and value types on the declaration's
// type — the `__*` field map derives both from them (CardSpecFieldMap)
export const nestedEditors = [
  captionEditorSpec({ cleanBasicHtml: { firstChildInnerContent: true } }),
] as const satisfies readonly NestedEditorSpec[]

export const transientProps = [
  {
    name: 'previewSrc',
    // the `string | null` annotation is the type source for the `__previewSrc`
    // field (CardSpecFieldMap) — `strOr` itself returns string, but the field
    // must stay nullable because the upload lifecycle clears it by writing
    // `node.previewSrc = null` (src/utils/upload-intent.ts)
    initial: (dataset): string | null => strOr(dataset.previewSrc, ''),
    datasetKey: '__previewSrc',
    accessor: true,
  },
  { ...transientTriggerFileDialogProp, datasetKey: '__triggerFileDialog' },
  // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
  transientInitialFileProp,
  // selector overlay component (e.g. the GIF picker) and the flag that hides
  // the image while it is open — client-side only, never serialized
  {
    name: 'selector',
    initial: (dataset): ComponentType<{ nodeKey: NodeKey }> | undefined =>
      fnOr<ComponentType<{ nodeKey: NodeKey }>>(dataset.selector),
  },
  {
    name: 'isImageHidden',
    initial: (dataset): boolean | undefined =>
      typeof dataset.isImageHidden === 'boolean' ? dataset.isImageHidden : undefined,
  },
] as const satisfies readonly TransientPropSpec[]

export const imageDeclaration = {
  nodeType: 'image',
  baseNode: BaseImageNode,
  nestedEditors,
  transientProps,
  decorateTarget: {
    width: decorateCardWidth,
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
