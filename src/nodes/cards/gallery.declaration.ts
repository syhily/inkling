import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseGalleryNode } from '@/nodes/base/nodes/gallery/GalleryNode'

import type { CardDeclaration } from './card-declaration'

import { captionEditorSpec } from './caption-editor-spec'
import { INSERT_GALLERY_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and value types on the declaration's
// type — the `__*` field map derives both from them (CardSpecFieldMap). The
// nested editor rides captionEditorSpec's nullable carrier: the markdown
// round-trip detaches it
export const nestedEditors = [captionEditorSpec({ nullable: true })] as const satisfies readonly NestedEditorSpec[]

export const galleryDeclaration = {
  nodeType: 'gallery',
  baseNode: BaseGalleryNode,
  nestedEditors,
  decorateTarget: {
    width: 'wide',
  },
  menu: [
    {
      label: 'Gallery',
      labelKey: 'gallery',
      desc: 'Create an image gallery',
      icon: 'gallery',
      command: INSERT_GALLERY_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['gallery'],
      priority: 5,
      shortcut: '/gallery',
    },
  ],
  insert: { command: INSERT_GALLERY_COMMAND },
  toolbarLabel: 'gallery',
  markdown: true,
} satisfies CardDeclaration<'gallery'>
