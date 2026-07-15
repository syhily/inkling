import { $canShowPlaceholderCurry } from '@lexical/text'
import { createCommand, type EditorState, type LexicalEditor } from 'lexical'

import ToggleIcon from '@/assets/icons/inkling-card-type-toggle.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { ToggleNode as BaseToggleNode, type ToggleData } from '@/nodes/base'
import { toggleDeclaration } from '@/nodes/cards/toggle.declaration'
import { ToggleNodeComponent } from '@/nodes/ToggleNodeComponent'

export const INSERT_TOGGLE_COMMAND = createCommand<ToggleNodeDataset>('INSERT_TOGGLE_COMMAND')

export type ToggleNodeDataset = ToggleData & {
  titleEditor?: LexicalEditor
  titleEditorInitialState?: EditorState
  contentEditor?: LexicalEditor
  contentEditorInitialState?: EditorState
}

export type SerializedToggleNode = ReturnType<BaseToggleNode['exportJSON']> & {
  heading: string
  content: string
}

export class ToggleNode extends BaseToggleNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __titleEditor: LexicalEditor | null
  declare __titleEditorInitialState: EditorState | undefined
  declare __contentEditor: LexicalEditor | null
  declare __contentEditorInitialState: EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = toggleDeclaration.nestedEditors

  static cardMenu = [
    {
      label: 'Toggle',
      desc: 'Collapsible content block',
      Icon: ToggleIcon,
      insertCommand: INSERT_TOGGLE_COMMAND,
      insertParams: {},
      matches: ['toggle', 'collapsible', 'accordion'],
      priority: 16,
      shortcut: '/toggle',
    },
  ]

  getIcon() {
    return ToggleIcon
  }

  isEmpty() {
    const isTitleEmpty = this.__titleEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    const isContentEmpty = this.__contentEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    return isTitleEmpty && isContentEmpty
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()} width="regular">
        <ToggleNodeComponent
          contentEditor={this.__contentEditor!}
          contentEditorInitialState={this.__contentEditorInitialState}
          headingEditor={this.__titleEditor!}
          headingEditorInitialState={this.__titleEditorInitialState}
          nodeKey={this.getKey()}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createToggleNode = (dataset?: ToggleNodeDataset): ToggleNode => {
  return new ToggleNode(dataset)
}

export function $isToggleNode(node: unknown): node is ToggleNode {
  return node instanceof ToggleNode
}
