import { ButtonNode as BaseButtonNode, type ButtonData } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_BUTTON_COMMAND } from '@/nodes/cards/card-menus'

export type ButtonNodeDataset = ButtonData

export class ButtonNode extends BaseButtonNode {
  static cardMenu = CARD_MENUS.button

  constructor(dataset: ButtonNodeDataset = {}, key?: string) {
    super(dataset, key)
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createButtonNode = (dataset?: ButtonNodeDataset): ButtonNode => {
  return new ButtonNode(dataset)
}

export function $isButtonNode(node: unknown): node is ButtonNode {
  return node instanceof ButtonNode
}
