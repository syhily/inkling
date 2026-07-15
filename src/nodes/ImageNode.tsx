import { createCommand, type LexicalEditor, type LexicalNode, type NodeKey } from 'lexical'
import React from 'react'

import type { CardConfig } from '@/context/InklingComposerContext'
import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import GIFIcon from '@/assets/icons/inkling-card-type-gif.svg?react'
import ImageCardIcon from '@/assets/icons/inkling-card-type-image.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { ImageNode as BaseImageNode, normalizeCardWidth, type ImageData } from '@/nodes/base'
import { imageDeclaration } from '@/nodes/cards/image.declaration'
import { ImageNodeComponent } from '@/nodes/ImageNodeComponent'
import { OPEN_GIF_SELECTOR_COMMAND } from '@/plugins/InklingSelectorPlugin'

export const INSERT_IMAGE_COMMAND = createCommand<ImageNodeDataset>()

export type ImageNodeDataset = ImageData &
  CaptionEditorDataset & {
    previewSrc?: string
    triggerFileDialog?: boolean
    initialFile?: File
    selector?: React.ComponentType<{ nodeKey: NodeKey }>
    isImageHidden?: boolean
    // image datasets also flow through drag-and-drop payloads that carry
    // extra keys; keep the record open for those transient fields
    [key: string]: unknown
  }

export class ImageNode extends BaseImageNode {
  // transient properties used to control node behaviour
  __triggerFileDialog = false
  __previewSrc: string | null = null
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | undefined
  declare __captionEditorInitialState: import('lexical').EditorState | undefined
  __initialFile: File | undefined
  __selector: React.ComponentType<{ nodeKey: NodeKey }> | undefined
  __isImageHidden: boolean | undefined

  // adopt the card declaration's nested-editor spec (drives constructor
  // setup/populate, getDataset appends, and exportJSON re-serialization on
  // the generated base class)
  static nestedEditors = imageDeclaration.nestedEditors

  static cardMenu = [
    {
      label: 'Image',
      desc: 'Upload, or embed with /image [url]',
      Icon: ImageCardIcon,
      insertCommand: INSERT_IMAGE_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['image', 'img'],
      queryParams: ['src'],
      priority: 1,
      shortcut: '/image',
    },
    {
      label: 'GIF',
      desc: 'Search and embed gifs',
      Icon: GIFIcon,
      insertCommand: OPEN_GIF_SELECTOR_COMMAND,
      insertParams: {
        triggerFileDialog: false,
      },
      matches: ['gif', 'giphy', 'tenor', 'klipy'],
      priority: 17,
      queryParams: ['src'],
      isHidden: ({ config }: { config: CardConfig }) => !config?.tenor && !config?.klipy,
      shortcut: '/gif',
    },
  ]

  static uploadType = 'image'

  constructor(dataset: ImageNodeDataset = {}, key?: NodeKey) {
    super(dataset, key)

    const { previewSrc, triggerFileDialog, initialFile, selector, isImageHidden } = dataset

    this.__previewSrc = previewSrc || ''
    // don't trigger the file dialog when rendering if we've already been given a url
    this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false

    // passed via INSERT_MEDIA_COMMAND on drag+drop or paste
    this.__initialFile = initialFile || undefined

    this.__selector = selector
    this.__isImageHidden = isImageHidden
  }

  getIcon() {
    return ImageCardIcon
  }

  getDataset() {
    const dataset = super.getDataset() as ImageNodeDataset

    dataset.__previewSrc = this.__previewSrc
    dataset.__triggerFileDialog = this.__triggerFileDialog

    return dataset
  }

  get previewSrc() {
    const self = this.getLatest()
    return self.__previewSrc
  }

  set previewSrc(previewSrc: string | null) {
    const writable = this.getWritable()
    writable.__previewSrc = previewSrc
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  createDOM() {
    return document.createElement('div')
  }

  decorate() {
    const Selector = this.__selector

    return (
      <InklingCardWrapper nodeKey={this.getKey()} width={normalizeCardWidth(this.cardWidth) ?? 'regular'}>
        {Selector && <Selector nodeKey={this.getKey()} />}

        {!this.__isImageHidden && (
          <ImageNodeComponent
            altText={this.alt}
            captionEditor={this.__captionEditor}
            captionEditorInitialState={this.__captionEditorInitialState}
            href={this.href}
            initialFile={this.__initialFile}
            nodeKey={this.getKey()}
            previewSrc={this.previewSrc ?? undefined}
            src={this.src}
            triggerFileDialog={this.__triggerFileDialog}
          />
        )}
      </InklingCardWrapper>
    )
  }
}

export const $createImageNode = (dataset: ImageNodeDataset = {}, key?: NodeKey): ImageNode => {
  return new ImageNode(dataset, key)
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
