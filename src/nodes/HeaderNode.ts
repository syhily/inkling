import type { EditorState, LexicalEditor } from 'lexical'

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
 * The registered class is assembled once from the card declaration, and
 * `$isHeaderNode` is canonical on the base node. The instance type carries
 * the spec-derived `__*` field map (names and value types from the
 * declaration's spec via CardSpecFieldMap), so `$createHeaderNode`
 * constructs the assembled class — which sets up the nested-editor spec —
 * with no cast.
 */
export const HeaderNode = assembleCardNodeOnce(headerDeclaration)
export type HeaderNode = InstanceType<typeof HeaderNode>

export const $createHeaderNode = (dataset: HeaderNodeDataset): HeaderNode => {
  // the nested-editor fields are set up by the constructor from the dataset
  return new HeaderNode(dataset)
}
