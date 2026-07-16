import { ButtonNode, buttonImportSpec } from '@/nodes/base/nodes/button/ButtonNode'

import type { CardDeclaration } from './card-declaration'

export const buttonDeclaration = {
  nodeType: 'button',
  baseNode: ButtonNode,
  importSpec: buttonImportSpec,
  decorateTarget: {
    width: 'regular',
    wrapperStyle: 'wide',
  },
  insert: { openInEditMode: true },
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'button'>
