import type { EditorState, LexicalEditor } from 'lexical'

import type { CalloutData } from '@/nodes/base/nodes/callout/CalloutNode'

import { assembleCardNode } from '@/nodes/assemble-card-node'
import { calloutDeclaration } from '@/nodes/cards/callout.declaration'

export { $isCalloutNode } from '@/nodes/base/nodes/callout/CalloutNode'
export { INSERT_CALLOUT_COMMAND } from '@/nodes/cards/card-menus'

export type CalloutNodeDataset = CalloutData & {
  calloutTextEditor?: LexicalEditor
  calloutTextEditorInitialState?: EditorState
}

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and `$isCalloutNode`
 * is canonical on the base node. `$createCalloutNode` keeps constructing the
 * assembled class so the nested-editor spec is set up.
 */
export const CalloutNode = assembleCardNode(calloutDeclaration)
export type CalloutNode = InstanceType<typeof CalloutNode> & {
  __calloutTextEditor: LexicalEditor | null
  __calloutTextEditorInitialState: EditorState | undefined
}

export const $createCalloutNode = (dataset: CalloutNodeDataset): CalloutNode => {
  // the nested-editor fields are set up by the constructor from the dataset
  return new CalloutNode(dataset) as CalloutNode
}
