import type { EditorState, LexicalEditor } from 'lexical'

import type { CardSpecFieldMap } from '@/nodes/base/generate-decorator-node'
import type { ToggleData } from '@/nodes/base/nodes/toggle/ToggleNode'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { toggleDeclaration } from '@/nodes/cards/toggle.declaration'

export { $isToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
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
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled once from the card declaration
 * (`@/nodes/cards/card-wrappers`), and `$isToggleNode` is canonical on the
 * base node. `$createToggleNode` keeps constructing the assembled class so
 * the nested-editor spec is set up.
 */
export const ToggleNode = assembleCardNodeOnce(toggleDeclaration)
// the `__*` field names derive from the declaration's spec — renaming a spec
// entry is a compile error here (CardSpecFieldMap)
export type ToggleNode = InstanceType<typeof ToggleNode> &
  CardSpecFieldMap<
    typeof toggleDeclaration,
    {
      // null only inside the headless markdown round-trip editor (the toggle card
      // transformer nulls both nested editors after plain-text import)
      __titleEditor: LexicalEditor | null
      __titleEditorInitialState: EditorState | undefined
      __contentEditor: LexicalEditor | null
      __contentEditorInitialState: EditorState | undefined
    }
  >

export const $createToggleNode = (dataset?: ToggleNodeDataset): ToggleNode => {
  // the nested-editor fields are set up by the constructor from the dataset
  return new ToggleNode(dataset) as ToggleNode
}
