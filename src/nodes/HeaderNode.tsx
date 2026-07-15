import { $canShowPlaceholderCurry } from '@lexical/text'
import { createCommand, type EditorState, type LexicalEditor } from 'lexical'

import HeaderCardIcon from '@/assets/icons/inkling-card-type-header.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { HeaderNode as BaseHeaderNode, normalizeCardWidth, type CardWidth, type HeaderData } from '@/nodes/base'
import { headerDeclaration } from '@/nodes/cards/header.declaration'
import HeaderNodeComponent from '@/nodes/header/HeaderNodeComponent'

export type HeaderNodeDataset = HeaderData & {
  headerTextEditor?: LexicalEditor
  headerTextEditorInitialState?: EditorState
  subheaderTextEditor?: LexicalEditor
  subheaderTextEditorInitialState?: EditorState
}

export const INSERT_HEADER_COMMAND = createCommand<HeaderNodeDataset>()

export class HeaderNode extends BaseHeaderNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __headerTextEditor: LexicalEditor | null
  declare __subheaderTextEditor: LexicalEditor | null
  declare __headerTextEditorInitialState: EditorState | undefined
  declare __subheaderTextEditorInitialState: EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = headerDeclaration.nestedEditors

  static cardMenu = [
    {
      label: 'Header',
      desc: 'Add a header',
      Icon: HeaderCardIcon,
      insertCommand: INSERT_HEADER_COMMAND,
      matches: ['header', 'heading'],
      priority: 11,
      insertParams: () => ({
        version: 2,
      }),
      shortcut: '/header',
    },
  ]

  getIcon() {
    return HeaderCardIcon
  }

  getCardWidth(): CardWidth | undefined {
    const layout = this.layout
    return normalizeCardWidth(layout === 'split' ? 'full' : layout)
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
        <HeaderNodeComponent
          accentColor={this.accentColor}
          alignment={this.alignment}
          backgroundColor={this.backgroundColor}
          backgroundImageHeight={this.backgroundImageHeight}
          backgroundImageSrc={this.backgroundImageSrc}
          backgroundImageWidth={this.backgroundImageWidth}
          backgroundSize={this.backgroundSize}
          buttonColor={this.buttonColor}
          buttonEnabled={this.buttonEnabled}
          buttonText={this.buttonText}
          buttonTextColor={this.buttonTextColor}
          buttonUrl={this.buttonUrl}
          header={this.header}
          headerTextEditor={this.__headerTextEditor}
          headerTextEditorState={this.__headerTextEditorInitialState}
          isSwapped={this.swapped}
          layout={this.layout}
          nodeKey={this.getKey()}
          subheader={this.subheader}
          subheaderTextEditor={this.__subheaderTextEditor}
          subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
          subheaderTextEditorState={this.__subheaderTextEditorInitialState}
          textColor={this.textColor}
        />
      </InklingCardWrapper>
    )
  }

  // override the default `isEmpty` check because we need to check the nested editors
  // rather than the data properties themselves
  isEmpty() {
    const isHtmlEmpty = this.__headerTextEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    const isSubHtmlEmpty = this.__subheaderTextEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    return (
      isHtmlEmpty &&
      isSubHtmlEmpty &&
      (!this.buttonEnabled || (!this.buttonText && !this.buttonUrl)) &&
      !this.backgroundImageSrc
    )
  }
}

export const $createHeaderNode = (dataset: HeaderNodeDataset) => {
  return new HeaderNode(dataset)
}

export function $isHeaderNode(node: unknown): node is HeaderNode {
  return node instanceof HeaderNode
}
