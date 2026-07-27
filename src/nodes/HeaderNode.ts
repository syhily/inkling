import type { EditorState, LexicalEditor } from 'lexical'

import type { CardSpecFieldMap } from '@/nodes/base/generate-decorator-node'
import type { HeaderData } from '@/nodes/base/nodes/header/HeaderNode'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { headerDeclaration } from '@/nodes/cards/header.declaration'

export { $isHeaderNode } from '@/nodes/base/nodes/header/HeaderNode'
export { INSERT_HEADER_COMMAND } from '@/nodes/cards/card-commands'

export type HeaderNodeDataset = HeaderData & {
  headerTextEditor?: LexicalEditor
  // not read by the constructor, and the declaration sets
  // `exposeInitialStateInDataset: false` so getDataset never emits them
  // either — `__headerTextEditorInitialState` is set internally when the
  // editor is populated from its serialized HTML (src/utils/nested-editors.ts)
  headerTextEditorInitialState?: EditorState
  subheaderTextEditor?: LexicalEditor
  // see headerTextEditorInitialState
  subheaderTextEditorInitialState?: EditorState
}

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled once from the card declaration
 * (`@/nodes/cards/card-wrappers`), and `$isHeaderNode` is canonical on the
 * base node. `$createHeaderNode` keeps constructing the assembled class so
 * the nested-editor spec is set up.
 */
export const HeaderNode = assembleCardNodeOnce(headerDeclaration)
// the `__*` field names derive from the declaration's spec — renaming a spec
// entry is a compile error here (CardSpecFieldMap)
export type HeaderNode = InstanceType<typeof HeaderNode> &
  CardSpecFieldMap<
    typeof headerDeclaration,
    {
      // non-null: the constructor's nested-editor setup always assigns an editor
      // instance (src/utils/nested-editors.ts)
      __headerTextEditor: LexicalEditor
      __subheaderTextEditor: LexicalEditor
      __headerTextEditorInitialState: EditorState | undefined
      __subheaderTextEditorInitialState: EditorState | undefined
    }
  >

export const $createHeaderNode = (dataset: HeaderNodeDataset): HeaderNode => {
  // the nested-editor fields are set up by the constructor from the dataset
  return new HeaderNode(dataset) as HeaderNode
}
