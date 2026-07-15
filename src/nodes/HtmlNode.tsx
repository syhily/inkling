import { HtmlNode as BaseHtmlNode, type HtmlData } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_HTML_COMMAND } from '@/nodes/cards/card-menus'

export type HtmlNodeDataset = HtmlData

export class HtmlNode extends BaseHtmlNode {
  static cardMenu = CARD_MENUS.html

  constructor(dataset: HtmlNodeDataset = {}, key?: string) {
    super(dataset, key)
  }

  decorate() {
    return decorateCard(this)
  }
}

export function $createHtmlNode(dataset: HtmlNodeDataset) {
  return new HtmlNode(dataset)
}

export function $isHtmlNode(node: unknown): node is HtmlNode {
  return node instanceof HtmlNode
}
