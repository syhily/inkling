import type { LexicalEditor } from 'lexical'

import { generateDecoratorNode, type DecoratorNodeProperty } from '@/nodes/base/generate-decorator-node'
import { parseCalloutNode } from '@/nodes/base/nodes/callout/callout-parser'
import { renderCalloutNode } from '@/nodes/base/nodes/callout/callout-renderer'

export interface CalloutData {
  calloutText?: string
  calloutEmoji?: string
  backgroundColor?: string
}

/** Transient nested-editor fields the wrapper layer passes through the constructor. */
interface CalloutEditorDataset {
  calloutTextEditor?: LexicalEditor
}

export interface CalloutNode {
  calloutText: string
  calloutEmoji: string
  backgroundColor: string
}

const calloutProperties = [
  { name: 'calloutText', default: '', wordCount: true },
  { name: 'calloutEmoji', default: '💡' },
  { name: 'backgroundColor', default: 'blue' },
] as const satisfies readonly DecoratorNodeProperty[]

export class CalloutNode extends generateDecoratorNode({
  nodeType: 'callout',
  properties: calloutProperties,
  defaultRenderFn: renderCalloutNode,
}) {
  /* override */
  constructor(
    { calloutText, calloutEmoji, backgroundColor, calloutTextEditor }: CalloutData & CalloutEditorDataset = {},
    key?: string,
  ) {
    // Forward the callout text and a passed-in editor so the generated
    // constructor can run the nested-editor setup/populate for wrapper
    // subclasses that adopt a `nestedEditors` spec (a no-op on this class).
    super({ calloutText, calloutTextEditor } as Partial<CalloutData>, key)
    this.__calloutText = calloutText || ''
    this.__calloutEmoji = calloutEmoji ?? '💡'
    this.__backgroundColor = backgroundColor || 'blue'
  }

  static importDOM() {
    return parseCalloutNode(this)
  }
}

export function $isCalloutNode(node: unknown): node is CalloutNode {
  return node instanceof CalloutNode
}

export const $createCalloutNode = (dataset: CalloutData = {}) => {
  return new CalloutNode(dataset)
}
