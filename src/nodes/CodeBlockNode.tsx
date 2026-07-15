import { createCommand, type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import CodeBlockIcon from '@/assets/icons/inkling-card-type-gen-embed.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { CodeBlockNode as BaseCodeBlockNode, type CodeBlockData } from '@/nodes/base'
import { codeBlockDeclaration } from '@/nodes/cards/codeblock.declaration'
import { CodeBlockNodeComponent } from '@/nodes/CodeBlockNodeComponent'

export type CodeBlockNodeDataset = CodeBlockData &
  CaptionEditorDataset & {
    _openInEditMode?: boolean
  }

export const INSERT_CODE_BLOCK_COMMAND = createCommand<CodeBlockNodeDataset>()

export class CodeBlockNode extends BaseCodeBlockNode {
  // transient properties used to control node behaviour
  __openInEditMode = false
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | null
  declare __captionEditorInitialState: import('lexical').EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = codeBlockDeclaration.nestedEditors

  constructor(dataset: CodeBlockNodeDataset = {}, key?: string) {
    super(dataset, key)

    const { _openInEditMode } = dataset
    this.__openInEditMode = _openInEditMode || false
  }

  getIcon() {
    return CodeBlockIcon
  }

  clearOpenInEditMode() {
    const self = this.getWritable()
    self.__openInEditMode = false
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()} wrapperStyle="code-card">
        <CodeBlockNodeComponent
          captionEditor={this.__captionEditor}
          captionEditorInitialState={this.__captionEditorInitialState}
          code={this.code}
          language={this.language}
          nodeKey={this.getKey()}
        />
      </InklingCardWrapper>
    )
  }
}

export function $createCodeBlockNode(dataset: CodeBlockNodeDataset) {
  return new CodeBlockNode(dataset)
}

export function $isCodeBlockNode(node: unknown): node is CodeBlockNode {
  return node instanceof CodeBlockNode
}
