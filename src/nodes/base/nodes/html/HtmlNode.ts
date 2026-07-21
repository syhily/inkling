import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { parseHtmlNode } from '@/nodes/base/nodes/html/html-parser'
import { renderHtmlNode } from '@/nodes/base/nodes/html/html-renderer'

const htmlProperties = [
  { name: 'html', default: '', urlType: 'html', wordCount: true },
] as const satisfies readonly DecoratorNodeProperty[]

export type HtmlData = DecoratorNodeData<typeof htmlProperties, true>

export interface BaseHtmlNode extends DecoratorNodeValueMap<typeof htmlProperties, true> {}

export class BaseHtmlNode extends generateDecoratorNode({
  nodeType: 'html',
  hasVisibility: true,
  properties: htmlProperties,
  defaultRenderFn: renderHtmlNode,
}) {
  static importDOM() {
    return parseHtmlNode(this)
  }

  isEmpty() {
    return !this.__html
  }
}

export function $createBaseHtmlNode(dataset: HtmlData = {}) {
  return new BaseHtmlNode(dataset)
}

export function $isHtmlNode(node: unknown): node is BaseHtmlNode {
  return node instanceof BaseHtmlNode
}
