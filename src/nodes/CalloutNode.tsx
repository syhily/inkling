import { type EditorState, type LexicalEditor } from 'lexical'

import { CalloutNode as BaseCalloutNode, type CalloutData } from '@/nodes/base'
import { calloutDeclaration } from '@/nodes/cards/callout.declaration'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_CALLOUT_COMMAND } from '@/nodes/cards/card-menus'

export type CalloutNodeDataset = CalloutData & {
  calloutTextEditor?: LexicalEditor
  calloutTextEditorInitialState?: EditorState
}

export class CalloutNode extends BaseCalloutNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __calloutTextEditor: LexicalEditor | null
  declare __calloutTextEditorInitialState: EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = calloutDeclaration.nestedEditors

  static cardMenu = CARD_MENUS.callout

  decorate() {
    return decorateCard(this)
  }
}

export const $createCalloutNode = (dataset: CalloutNodeDataset) => {
  return new CalloutNode(dataset)
}

export function $isCalloutNode(node: unknown): node is CalloutNode {
  return node instanceof CalloutNode
}
