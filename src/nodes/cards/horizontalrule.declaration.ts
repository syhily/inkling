import { HorizontalRuleNode } from '@/nodes/base/nodes/horizontalrule/HorizontalRuleNode'

import type { CardDeclaration } from './card-declaration'

export const horizontalRuleDeclaration = {
  nodeType: 'horizontalrule',
  baseNode: HorizontalRuleNode,
  // No decorateTarget: the card renders with no wrapper props. It
  // historically passed `className="inline-block"`, but `InklingCardWrapper`
  // never destructured it — the prop was inert and is dropped here.
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: true,
    // Markdown-eligible with no card transformer: `---` is handled by
    // DEFAULT_TRANSFORMERS (`HR` in `@/markdown/transformers`).
    markdown: true,
  },
} satisfies CardDeclaration<'horizontalrule'>
