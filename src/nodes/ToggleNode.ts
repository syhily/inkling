import type { EditorState, LexicalEditor } from 'lexical'

import type { ToggleData } from '@/nodes/base/nodes/toggle/ToggleNode'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { toggleDeclaration } from '@/nodes/cards/toggle.declaration'

export { $isToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
export type { SerializedToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
export { INSERT_TOGGLE_COMMAND } from '@/nodes/cards/card-commands'

export type ToggleNodeDataset = ToggleData & {
  titleEditor?: LexicalEditor
  // accepted for getDataset/clone symmetry but not read by the constructor —
  // `__titleEditorInitialState` is set internally when the editor is
  // populated from its serialized HTML (src/utils/nested-editors.ts)
  titleEditorInitialState?: EditorState
  contentEditor?: LexicalEditor
  // see titleEditorInitialState
  contentEditorInitialState?: EditorState
}

/**
 * The registered class is assembled once from the card declaration, and
 * `$isToggleNode` is canonical on the base node. The instance type carries
 * the spec-derived `__*` field map (names and value types from the
 * declaration's spec via CardSpecFieldMap), so `$createToggleNode`
 * constructs the assembled class — which sets up the nested-editor spec —
 * with no cast.
 */
export const ToggleNode = assembleCardNodeOnce(toggleDeclaration)
export type ToggleNode = InstanceType<typeof ToggleNode>

export const $createToggleNode = (dataset?: ToggleNodeDataset): ToggleNode => {
  // the nested-editor fields are set up by the constructor from the dataset
  return new ToggleNode(dataset)
}
