import { BaseButtonNode } from '@/nodes/base/nodes/button/ButtonNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_BUTTON_COMMAND } from './card-commands'

export const buttonDeclaration = {
  nodeType: 'button',
  baseNode: BaseButtonNode,
  decorateTarget: {
    width: 'regular',
    wrapperStyle: 'wide',
  },
  menu: [
    {
      label: 'Button',
      desc: 'Call-to-action button',
      icon: 'button',
      command: INSERT_BUTTON_COMMAND,
      insertParams: {},
      matches: ['button', 'btn'],
      priority: 16,
      shortcut: '/button',
    },
  ],
  insert: { command: INSERT_BUTTON_COMMAND, openInEditMode: true },
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'button'>
