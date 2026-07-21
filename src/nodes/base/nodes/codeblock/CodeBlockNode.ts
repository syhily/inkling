import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { parseCodeBlockNode } from '@/nodes/base/nodes/codeblock/codeblock-parser'
import { renderCodeBlockNode } from '@/nodes/base/nodes/codeblock/codeblock-renderer'

const codeBlockProperties = [
  { name: 'code', default: '', wordCount: true },
  { name: 'language', default: '' },
  { name: 'caption', default: '', urlType: 'html', wordCount: true },
] as const satisfies readonly DecoratorNodeProperty[]

export type CodeBlockData = DecoratorNodeData<typeof codeBlockProperties>

export interface BaseCodeBlockNode extends DecoratorNodeValueMap<typeof codeBlockProperties> {}

export class BaseCodeBlockNode extends generateDecoratorNode({
  nodeType: 'codeblock',
  properties: codeBlockProperties,
  defaultRenderFn: renderCodeBlockNode,
}) {
  static importDOM() {
    return parseCodeBlockNode(this)
  }

  // The transient-prop spec (codeblock.declaration.ts) initializes this only
  // on spec-adopting assembled classes; a raw `new BaseCodeBlockNode()`
  // leaves it unset, so `undefined` is part of the honest type for spec-less
  // instances
  declare __openInEditMode: boolean | undefined

  // Clears the transient `_openInEditMode` flag the card spec initializes
  // from the construction dataset; a no-op for spec-less instances.
  clearOpenInEditMode() {
    const self = this.getWritable()
    self.__openInEditMode = false
  }

  isEmpty() {
    return !this.__code
  }
}

export function $createBaseCodeBlockNode(dataset: CodeBlockData = {}) {
  return new BaseCodeBlockNode(dataset)
}

export function $isCodeBlockNode(node: unknown): node is BaseCodeBlockNode {
  return node instanceof BaseCodeBlockNode
}
