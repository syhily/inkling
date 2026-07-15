import { HorizontalRuleNode as BaseHorizontalRuleNode } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_HORIZONTAL_RULE_COMMAND } from '@/nodes/cards/card-menus'

export class HorizontalRuleNode extends BaseHorizontalRuleNode {
  static cardMenu = CARD_MENUS.horizontalrule

  decorate() {
    return decorateCard(this)
  }
}

export function $createHorizontalRuleNode() {
  return new HorizontalRuleNode()
}

export function $isHorizontalRuleNode(node: unknown): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode
}
