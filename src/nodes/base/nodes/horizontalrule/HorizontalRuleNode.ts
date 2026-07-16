import type { CardImportSpec } from '@/nodes/base/import-spec'

import { generateDecoratorNode } from '@/nodes/base/generate-decorator-node'
import { renderHorizontalRuleNode } from '@/nodes/base/nodes/horizontalrule/horizontalrule-renderer'

export const horizontalRuleImportSpec = {
  conversions: [{ tag: 'hr', priority: 0, reads: [] }],
} satisfies CardImportSpec

export class HorizontalRuleNode extends generateDecoratorNode({
  nodeType: 'horizontalrule',
  defaultRenderFn: renderHorizontalRuleNode,
  importSpec: horizontalRuleImportSpec,
}) {
  getTextContent() {
    return '---\n\n'
  }

  hasEditMode() {
    return false
  }
}

export function $createHorizontalRuleNode() {
  return new HorizontalRuleNode()
}

export function $isHorizontalRuleNode(node: unknown): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode
}
