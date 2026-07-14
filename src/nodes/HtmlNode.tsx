import { createCommand } from 'lexical'

import HtmlCardIcon from '@/assets/icons/inkling-card-type-html.svg?react'
import HtmlIndicatorIcon from '@/assets/icons/inkling-indicator-html.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { HtmlNode as BaseHtmlNode, type HtmlData } from '@/nodes/base'
import { HtmlNodeComponent } from '@/nodes/HtmlNodeComponent'

export type HtmlNodeDataset = HtmlData

export const INSERT_HTML_COMMAND = createCommand<HtmlNodeDataset>()

export class HtmlNode extends BaseHtmlNode {
  static cardMenu = {
    label: 'HTML',
    desc: 'Insert a HTML editor card',
    Icon: HtmlCardIcon,
    insertCommand: INSERT_HTML_COMMAND,
    matches: ['html'],
    priority: 18,
    shortcut: '/html',
  }

  getIcon() {
    return HtmlCardIcon
  }

  constructor(dataset: HtmlNodeDataset = {}, key?: string) {
    super(dataset, key)
  }

  decorate() {
    return (
      <InklingCardWrapper
        IndicatorIcon={HtmlIndicatorIcon}
        isVisibilityActive={this.getIsVisibilityActive()}
        nodeKey={this.getKey()}
        wrapperStyle="wide"
      >
        <HtmlNodeComponent html={this.html} nodeKey={this.getKey()} />
      </InklingCardWrapper>
    )
  }
}

export function $createHtmlNode(dataset: HtmlNodeDataset) {
  return new HtmlNode(dataset)
}

export function $isHtmlNode(node: unknown): node is HtmlNode {
  return node instanceof HtmlNode
}
