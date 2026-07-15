import type { EditorState, LexicalEditor } from 'lexical'

import type { CodeBlockData } from '@/nodes/base/nodes/codeblock/CodeBlockNode'
import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { assembleCardNode } from '@/nodes/assemble-card-node'
import { codeBlockDeclaration } from '@/nodes/cards/codeblock.declaration'

export { $isCodeBlockNode } from '@/nodes/base/nodes/codeblock/CodeBlockNode'
export { INSERT_CODE_BLOCK_COMMAND } from '@/nodes/cards/card-menus'

export type CodeBlockNodeDataset = CodeBlockData &
  CaptionEditorDataset & {
    _openInEditMode?: boolean
  }

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and
 * `$isCodeBlockNode` is canonical on the base node. `$createCodeBlockNode`
 * keeps constructing the assembled class so the nested-editor and
 * transient-prop specs are initialized.
 */
export const CodeBlockNode = assembleCardNode(codeBlockDeclaration)
export type CodeBlockNode = InstanceType<typeof CodeBlockNode> & {
  __openInEditMode: boolean
  __captionEditor: LexicalEditor | null
  __captionEditorInitialState: EditorState | undefined
}

export function $createCodeBlockNode(dataset: CodeBlockNodeDataset): CodeBlockNode {
  // the nested-editor and transient fields are initialized by the constructor from the dataset
  return new CodeBlockNode(dataset) as CodeBlockNode
}
