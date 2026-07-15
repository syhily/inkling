import { createCommand, type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import VideoCardIcon from '@/assets/icons/inkling-card-type-video.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { normalizeCardWidth, VideoNode as BaseVideoNode, type VideoData } from '@/nodes/base'
import { videoDeclaration } from '@/nodes/cards/video.declaration'
import { VideoNodeComponent } from '@/nodes/VideoNodeComponent'

export type VideoNodeDataset = VideoData &
  CaptionEditorDataset & {
    initialFile?: File
    triggerFileDialog?: boolean
  }

export const INSERT_VIDEO_COMMAND = createCommand<VideoNodeDataset>()

export class VideoNode extends BaseVideoNode {
  // transient properties used to control node behaviour
  __triggerFileDialog = false
  __initialFile: File | null = null
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | null
  declare __captionEditorInitialState: import('lexical').EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = videoDeclaration.nestedEditors

  static cardMenu = [
    {
      label: 'Video',
      desc: 'Upload and play a video file',
      Icon: VideoCardIcon,
      insertCommand: INSERT_VIDEO_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['video'],
      priority: 13,
      shortcut: '/video',
    },
  ]

  static uploadType = 'video'

  getIcon() {
    return VideoCardIcon
  }

  constructor(dataset: VideoNodeDataset = {}, key?: string) {
    super(dataset, key)

    const { triggerFileDialog, initialFile } = dataset

    // don't trigger the file dialog when rendering if we've already been given a url
    this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false

    this.__initialFile = initialFile || null
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  decorate() {
    const cardWidth = normalizeCardWidth(this.cardWidth) ?? 'regular'

    return (
      <InklingCardWrapper nodeKey={this.getKey()} width={cardWidth}>
        <VideoNodeComponent
          captionEditor={this.__captionEditor}
          captionEditorInitialState={this.__captionEditorInitialState}
          cardWidth={cardWidth}
          customThumbnail={this.customThumbnailSrc}
          initialFile={this.__initialFile}
          isLoopChecked={this.loop}
          nodeKey={this.getKey()}
          thumbnail={this.thumbnailSrc}
          totalDuration={this.formattedDuration}
          triggerFileDialog={this.__triggerFileDialog}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createVideoNode = (dataset: VideoNodeDataset) => {
  return new VideoNode(dataset)
}

export function $isVideoNode(node: unknown): node is VideoNode {
  return node instanceof VideoNode
}
