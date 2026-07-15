import { createCommand, type EditorState, type LexicalEditor } from 'lexical'

import CalloutCardIcon from '@/assets/icons/inkling-card-type-callout.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { CalloutNode as BaseCalloutNode, type CalloutData } from '@/nodes/base'
import { CalloutNodeComponent } from '@/nodes/CalloutNodeComponent'
import { calloutDeclaration } from '@/nodes/cards/callout.declaration'

export type CalloutNodeDataset = CalloutData & {
  calloutTextEditor?: LexicalEditor
  calloutTextEditorInitialState?: EditorState
}

export const INSERT_CALLOUT_COMMAND = createCommand<CalloutNodeDataset>()

export class CalloutNode extends BaseCalloutNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __calloutTextEditor: LexicalEditor | null
  declare __calloutTextEditorInitialState: EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = calloutDeclaration.nestedEditors

  static cardMenu = [
    {
      label: 'Callout',
      desc: 'Info boxes that stand out',
      Icon: CalloutCardIcon,
      insertCommand: INSERT_CALLOUT_COMMAND,
      matches: ['callout'],
      priority: 9,
      shortcut: '/callout',
    },
  ]

  getIcon() {
    return CalloutCardIcon
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()}>
        <CalloutNodeComponent
          backgroundColor={this.backgroundColor}
          calloutEmoji={this.calloutEmoji}
          calloutTextEditor={this.__calloutTextEditor}
          calloutTextEditorInitialState={this.__calloutTextEditorInitialState}
          nodeKey={this.getKey()}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createCalloutNode = (dataset: CalloutNodeDataset) => {
  return new CalloutNode(dataset)
}

export function $isCalloutNode(node: unknown): node is CalloutNode {
  return node instanceof CalloutNode
}
