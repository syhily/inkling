import { BaseMathNode } from '@/nodes/base/nodes/math/MathNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_MATH_COMMAND } from './card-commands'

export const mathDeclaration = {
  nodeType: 'math',
  baseNode: BaseMathNode,
  decorateTarget: {
    width: 'regular',
  },
  menu: [
    {
      label: 'Math',
      labelKey: 'math',
      desc: 'Block math (KaTeX)',
      icon: 'math',
      command: INSERT_MATH_COMMAND,
      matches: ['math', 'katex', 'tex', 'formula'],
      priority: 17,
      shortcut: '/math',
    },
  ],
  insert: { command: INSERT_MATH_COMMAND, openInEditMode: true },
  toolbarLabel: 'math',
  // Not in the markdown round-trip: GFM has no math block syntax.
  markdown: false,
} satisfies CardDeclaration<'math'>
