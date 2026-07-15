import { $canShowPlaceholderCurry } from '@lexical/text'
import { type EditorState, type LexicalEditor } from 'lexical'

import { HeaderNode as BaseHeaderNode, type CardWidth, type HeaderData } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { headerCardWidth, headerDeclaration } from '@/nodes/cards/header.declaration'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_HEADER_COMMAND } from '@/nodes/cards/card-menus'

export type HeaderNodeDataset = HeaderData & {
  headerTextEditor?: LexicalEditor
  headerTextEditorInitialState?: EditorState
  subheaderTextEditor?: LexicalEditor
  subheaderTextEditorInitialState?: EditorState
}

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

  static cardMenu = CARD_MENUS.header

  getCardWidth(): CardWidth | undefined {
    return headerCardWidth(this)
  }

  decorate() {
    return decorateCard(this)
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
