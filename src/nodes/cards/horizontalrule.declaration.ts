import { BaseHorizontalRuleNode } from '@/nodes/base/nodes/horizontalrule/HorizontalRuleNode'

import type { CardDeclaration } from './card-declaration'

import { INSERT_HORIZONTAL_RULE_COMMAND } from './card-commands'

export const horizontalRuleDeclaration = {
  nodeType: 'horizontalrule',
  baseNode: BaseHorizontalRuleNode,
  // No decorateTarget: the card renders with no wrapper props. It
  // historically passed `className="inline-block"`, but `InklingCardWrapper`
  // never destructured it — the prop was inert and is dropped here.
  menu: [
    {
      label: 'Divider',
      desc: 'Insert a dividing line',
      icon: 'divider',
      command: INSERT_HORIZONTAL_RULE_COMMAND,
      matches: ['divider', 'horizontal-rule', 'hr'],
      priority: 2,
      shortcut: '/hr',
    },
  ],
  // no toolbar renders for the divider today; the label matches the node type
  toolbarLabel: 'horizontalrule',
  // Markdown-eligible with no card transformer: `---` is handled by
  // DEFAULT_TRANSFORMERS (`HR` in `@/markdown/transformers`).
  markdown: true,
} satisfies CardDeclaration<'horizontalrule'>
