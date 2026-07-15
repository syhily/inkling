import { HorizontalRuleNode } from '@/nodes/base/nodes/horizontalrule/HorizontalRuleNode'

import type { CardDeclaration } from './card-declaration'

export const horizontalRuleDeclaration = {
  nodeType: 'horizontalrule',
  baseNode: HorizontalRuleNode,
  decorateTarget: {
    className: 'inline-block',
  },
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: true,
    // Markdown-eligible with no card transformer: `---` is handled by
    // DEFAULT_TRANSFORMERS (`HR` in `@/plugins/MarkdownShortcutPlugin`).
    markdown: true,
  },
} satisfies CardDeclaration<'horizontalrule'>
