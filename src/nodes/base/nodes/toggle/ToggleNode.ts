import type { CardImportSpec } from '@/nodes/base/import-spec'

import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { renderToggleNode } from '@/nodes/base/nodes/toggle/toggle-renderer'

const toggleProperties = [
  { name: 'heading', default: '', urlType: 'html', wordCount: true },
  { name: 'content', default: '', urlType: 'html', wordCount: true },
] as const satisfies readonly DecoratorNodeProperty[]

export const toggleImportSpec = {
  conversions: [
    {
      tag: 'div',
      priority: 1,
      guardClass: 'inkling-toggle-card',
      reads: [
        { name: 'heading', kind: 'text', selector: '.inkling-toggle-heading-text', fallback: '' },
        { name: 'content', kind: 'text', selector: '.inkling-toggle-content', fallback: '' },
      ],
    },
  ],
} satisfies CardImportSpec

export type ToggleData = DecoratorNodeData<typeof toggleProperties>

export interface ToggleNode extends DecoratorNodeValueMap<typeof toggleProperties> {}

export class ToggleNode extends generateDecoratorNode({
  nodeType: 'toggle',
  properties: toggleProperties,
  defaultRenderFn: renderToggleNode,
  importSpec: toggleImportSpec,
}) {}

export const $createToggleNode = (dataset: ToggleData = {}) => {
  return new ToggleNode(dataset)
}

export function $isToggleNode(node: unknown): node is ToggleNode {
  return node instanceof ToggleNode
}
