import type { CardImportSpec } from '@/nodes/base/import-spec'

import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { renderButtonNode } from '@/nodes/base/nodes/button/button-renderer'

const buttonProperties = [
  { name: 'buttonText', default: '' },
  { name: 'alignment', default: 'center' },
  { name: 'buttonUrl', default: '', urlType: 'url' },
] as const satisfies readonly DecoratorNodeProperty[]

export const buttonImportSpec = {
  conversions: [
    {
      tag: 'div',
      priority: 1,
      guardClass: 'inkling-button-card',
      reads: [
        { name: 'buttonUrl', kind: 'attribute', attribute: 'href', selector: '.inkling-btn', fallback: '' },
        { name: 'buttonText', kind: 'text', selector: '.inkling-btn', fallback: '' },
        // omitted on no class match, coalescing to the 'center' default
        { name: 'alignment', kind: 'classMap', classMap: [{ pattern: /inkling-align-(left|center)/ }] },
      ],
    },
  ],
} satisfies CardImportSpec

export type ButtonData = DecoratorNodeData<typeof buttonProperties>

export interface ButtonNode extends DecoratorNodeValueMap<typeof buttonProperties> {}

export class ButtonNode extends generateDecoratorNode({
  nodeType: 'button',
  properties: buttonProperties,
  defaultRenderFn: renderButtonNode,
  importSpec: buttonImportSpec,
}) {}

export const $createButtonNode = (dataset: ButtonData = {}) => {
  return new ButtonNode(dataset)
}

export function $isButtonNode(node: unknown): node is ButtonNode {
  return node instanceof ButtonNode
}
