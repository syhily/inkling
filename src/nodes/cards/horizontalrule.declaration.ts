import { HorizontalRuleNode } from '@/nodes/base/nodes/horizontalrule/HorizontalRuleNode'

import type { CardDeclaration } from './card-declaration'

export const horizontalRuleDeclaration = {
  nodeType: 'horizontalrule',
  baseNode: HorizontalRuleNode,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: true,
  },
} satisfies CardDeclaration<'horizontalrule'>
