import { createCommand, type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { CodeBlockNode as BaseCodeBlockNode, type CodeBlockData } from '@/nodes/base'
import { codeBlockDeclaration } from '@/nodes/cards/codeblock.declaration'
import { decorateCard } from '@/nodes/decorate-card'

export type CodeBlockNodeDataset = CodeBlockData &
  CaptionEditorDataset & {
    _openInEditMode?: boolean
  }

export const INSERT_CODE_BLOCK_COMMAND = createCommand<CodeBlockNodeDataset>()

export class CodeBlockNode extends BaseCodeBlockNode {
  // transient props live on the generated base class (static `transientProps`);
  // `declare` keeps these type-only so no field initializer clobbers the
  // values the base constructor computes from the dataset
  declare __openInEditMode: boolean
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | null
  declare __captionEditorInitialState: import('lexical').EditorState | undefined

  // adopt the card declaration's nested-editor and transient-prop specs
  static nestedEditors = codeBlockDeclaration.nestedEditors
  static transientProps = codeBlockDeclaration.transientProps

  clearOpenInEditMode() {
    const self = this.getWritable()
    self.__openInEditMode = false
  }

  decorate() {
    return decorateCard(this)
  }
}

export function $createCodeBlockNode(dataset: CodeBlockNodeDataset) {
  return new CodeBlockNode(dataset)
}

export function $isCodeBlockNode(node: unknown): node is CodeBlockNode {
  return node instanceof CodeBlockNode
}
