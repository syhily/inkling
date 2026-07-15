import { CalloutNode } from '@/nodes/base/nodes/callout/CalloutNode'

import type { CardDeclaration } from './card-declaration'

export const calloutDeclaration = {
  nodeType: 'callout',
  baseNode: CalloutNode,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
  },
} satisfies CardDeclaration<'callout'>
