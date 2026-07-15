import type { LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { type VideoData, VideoNode as BaseVideoNode } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { videoDeclaration } from '@/nodes/cards/video.declaration'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_VIDEO_COMMAND } from '@/nodes/cards/card-menus'

export type VideoNodeDataset = VideoData &
  CaptionEditorDataset & {
    initialFile?: File
    triggerFileDialog?: boolean
  }

export class VideoNode extends BaseVideoNode {
  // transient props live on the generated base class (static `transientProps`);
  // `declare` keeps these type-only so no field initializer clobbers the
  // values the base constructor computes from the dataset
  declare __triggerFileDialog: boolean
  declare __initialFile: File | null
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | null
  declare __captionEditorInitialState: import('lexical').EditorState | undefined

  // adopt the card declaration's nested-editor and transient-prop specs
  static nestedEditors = videoDeclaration.nestedEditors
  static transientProps = videoDeclaration.transientProps

  static cardMenu = CARD_MENUS.video

  static uploadType = 'video'

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createVideoNode = (dataset: VideoNodeDataset) => {
  return new VideoNode(dataset)
}

export function $isVideoNode(node: unknown): node is VideoNode {
  return node instanceof VideoNode
}
