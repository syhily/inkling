import { $generateHtmlFromNodes } from '@lexical/html'
import { $canShowPlaceholderCurry } from '@lexical/text'
import { createCommand, type EditorState, type LexicalEditor } from 'lexical'

import ToggleIcon from '@/assets/icons/inkling-card-type-toggle.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { cleanBasicHtml } from '@/html/clean-basic-html'
import { ToggleNode as BaseToggleNode, type ToggleData } from '@/nodes/base'
import BASIC_NODES from '@/nodes/BasicNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { ToggleNodeComponent } from '@/nodes/ToggleNodeComponent'
import { populateNestedEditor, setupNestedEditor } from '@/utils/nested-editors'

export const INSERT_TOGGLE_COMMAND = createCommand<ToggleNodeDataset>('INSERT_TOGGLE_COMMAND')

export type ToggleNodeDataset = ToggleData & {
  titleEditor?: LexicalEditor
  titleEditorInitialState?: EditorState
  contentEditor?: LexicalEditor
  contentEditorInitialState?: EditorState
}

export type SerializedToggleNode = ReturnType<BaseToggleNode['exportJSON']> & {
  heading: string
  content: string
}

export class ToggleNode extends BaseToggleNode {
  __titleEditor!: LexicalEditor | null
  __titleEditorInitialState!: EditorState | undefined
  __contentEditor!: LexicalEditor | null
  __contentEditorInitialState!: EditorState | undefined

  static cardMenu = [
    {
      label: 'Toggle',
      desc: 'Collapsible content block',
      Icon: ToggleIcon,
      insertCommand: INSERT_TOGGLE_COMMAND,
      insertParams: {},
      matches: ['toggle', 'collapsible', 'accordion'],
      priority: 16,
      shortcut: '/toggle',
    },
  ]

  constructor(dataset: ToggleNodeDataset = {}, key?: string) {
    super(dataset, key)

    setupNestedEditor(this, '__titleEditor', { editor: dataset.titleEditor, nodes: MINIMAL_NODES })
    setupNestedEditor(this, '__contentEditor', { editor: dataset.contentEditor, nodes: BASIC_NODES })

    if (!dataset.titleEditor && dataset.heading) {
      populateNestedEditor(this, '__titleEditor', `${dataset.heading}`)
    }

    if (!dataset.contentEditor && dataset.content) {
      populateNestedEditor(this, '__contentEditor', `${dataset.content}`)
    }
  }

  getIcon() {
    return ToggleIcon
  }

  isEmpty() {
    const isTitleEmpty = this.__titleEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    const isContentEmpty = this.__contentEditor!.getEditorState().read($canShowPlaceholderCurry(false))
    return isTitleEmpty && isContentEmpty
  }

  getDataset() {
    const dataset = super.getDataset() as Record<string, unknown>
    const self = this.getLatest()

    dataset.titleEditor = self.__titleEditor
    dataset.titleEditorInitialState = self.__titleEditorInitialState
    dataset.contentEditor = self.__contentEditor
    dataset.contentEditorInitialState = self.__contentEditorInitialState

    return dataset
  }

  exportJSON(): SerializedToggleNode {
    const json = super.exportJSON() as SerializedToggleNode

    if (this.__titleEditor) {
      this.__titleEditor.getEditorState().read(() => {
        const html = $generateHtmlFromNodes(this.__titleEditor!, null)
        const cleanedHtml = cleanBasicHtml(html, { firstChildInnerContent: true, allowBr: true })
        json.heading = cleanedHtml
      })
    }

    if (this.__contentEditor) {
      this.__contentEditor.getEditorState().read(() => {
        const html = $generateHtmlFromNodes(this.__contentEditor!, null)
        const cleanedHtml = cleanBasicHtml(html, { allowBr: true })
        json.content = cleanedHtml
      })
    }

    return json
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()} width="regular">
        <ToggleNodeComponent
          contentEditor={this.__contentEditor!}
          contentEditorInitialState={this.__contentEditorInitialState}
          headingEditor={this.__titleEditor!}
          headingEditorInitialState={this.__titleEditorInitialState}
          nodeKey={this.getKey()}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createToggleNode = (dataset?: ToggleNodeDataset): ToggleNode => {
  return new ToggleNode(dataset)
}

export function $isToggleNode(node: unknown): node is ToggleNode {
  return node instanceof ToggleNode
}
