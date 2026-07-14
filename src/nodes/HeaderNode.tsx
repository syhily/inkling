import { $generateHtmlFromNodes } from '@lexical/html'
import { $canShowPlaceholderCurry } from '@lexical/text'
import { createCommand, type EditorState, type LexicalEditor } from 'lexical'

import HeaderCardIcon from '@/assets/icons/inkling-card-type-header.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { cleanBasicHtml } from '@/html/clean-basic-html'
import { HeaderNode as BaseHeaderNode, normalizeCardWidth, type CardWidth, type HeaderData } from '@/nodes/base'
import HeaderNodeComponent from '@/nodes/header/v2/HeaderNodeComponent'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { populateNestedEditor, setupNestedEditor } from '@/utils/nested-editors'

export type HeaderNodeDataset = HeaderData & {
  headerTextEditor?: LexicalEditor
  headerTextEditorInitialState?: EditorState
  subheaderTextEditor?: LexicalEditor
  subheaderTextEditorInitialState?: EditorState
}

export const INSERT_HEADER_COMMAND = createCommand<HeaderNodeDataset>()

export class HeaderNode extends BaseHeaderNode {
  __headerTextEditor!: LexicalEditor | null
  __subheaderTextEditor!: LexicalEditor | null
  __headerTextEditorInitialState!: EditorState | undefined
  __subheaderTextEditorInitialState!: EditorState | undefined

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

  constructor(dataset: HeaderNodeDataset = {}, key?: string) {
    super(dataset, key)

    setupNestedEditor(this, '__headerTextEditor', { editor: dataset.headerTextEditor, nodes: MINIMAL_NODES })
    setupNestedEditor(this, '__subheaderTextEditor', { editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES })

    // populate nested editors on initial construction
    if (!dataset.headerTextEditor && dataset.header) {
      populateNestedEditor(this, '__headerTextEditor', `${dataset.header}`) // we serialize with no wrapper
    }
    if (!dataset.subheaderTextEditor && dataset.subheader) {
      populateNestedEditor(this, '__subheaderTextEditor', `${dataset.subheader}`) // we serialize with no wrapper
    }
  }

  exportJSON() {
    const json = super.exportJSON()

    if (this.__headerTextEditor) {
      this.__headerTextEditor.getEditorState().read(() => {
        const html = $generateHtmlFromNodes(this.__headerTextEditor!, null)
        const cleanedHtml = cleanBasicHtml(html, { firstChildInnerContent: true, allowBr: true })
        json.header = cleanedHtml
      })
    }

    if (this.__subheaderTextEditor) {
      this.__subheaderTextEditor.getEditorState().read(() => {
        const html = $generateHtmlFromNodes(this.__subheaderTextEditor!, null)
        const cleanedHtml = cleanBasicHtml(html, { firstChildInnerContent: true, allowBr: true })
        json.subheader = cleanedHtml
      })
    }

    return json
  }

  getDataset() {
    const dataset = super.getDataset()

    // client-side only data properties such as nested editors
    const self = this.getLatest()
    dataset.headerTextEditor = self.__headerTextEditor
    dataset.subheaderTextEditor = self.__subheaderTextEditor
    return dataset
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
