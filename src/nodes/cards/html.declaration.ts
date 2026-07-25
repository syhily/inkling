import { BaseHtmlNode } from '@/nodes/base/nodes/html/HtmlNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_HTML_COMMAND } from './card-commands'

export const htmlDeclaration = {
  nodeType: 'html',
  baseNode: BaseHtmlNode,
  decorateTarget: {
    wrapperStyle: 'wide',
    // the icon component attaches one layer up (`@/nodes/cards/decorate/html`)
    hasIndicatorIcon: true,
  },
  menu: [
    {
      label: 'HTML',
      desc: 'Insert a HTML editor card',
      icon: 'html',
      command: INSERT_HTML_COMMAND,
      matches: ['html'],
      priority: 18,
      shortcut: '/html',
    },
  ],
  insert: { command: INSERT_HTML_COMMAND, openInEditMode: true },
  toolbarLabel: 'html',
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'html'>
