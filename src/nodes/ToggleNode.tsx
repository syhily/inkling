import { $canShowPlaceholderCurry } from '@lexical/text'
import { type EditorState, type LexicalEditor } from 'lexical'

import { ToggleNode as BaseToggleNode, type ToggleData } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { toggleDeclaration } from '@/nodes/cards/toggle.declaration'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_TOGGLE_COMMAND } from '@/nodes/cards/card-menus'

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

  static cardMenu = CARD_MENUS.toggle

  isEmpty() {
    const isTitleEmpty = this.__titleEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    const isContentEmpty = this.__contentEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    return isTitleEmpty && isContentEmpty
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createToggleNode = (dataset?: ToggleNodeDataset): ToggleNode => {
  return new ToggleNode(dataset)
}

export function $isToggleNode(node: unknown): node is ToggleNode {
  return node instanceof ToggleNode
}
