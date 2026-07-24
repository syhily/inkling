import type { EditorState, LexicalEditor } from 'lexical'

import type { VideoData } from '@/nodes/base/nodes/video/VideoNode'
import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { videoDeclaration } from '@/nodes/cards/video.declaration'

export { $isVideoNode } from '@/nodes/base/nodes/video/VideoNode'
export { INSERT_VIDEO_COMMAND } from '@/nodes/cards/card-commands'

export type VideoNodeDataset = VideoData &
  CaptionEditorDataset & {
    initialFile?: File
    triggerFileDialog?: boolean
  }

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and `$isVideoNode`
 * is canonical on the base node. `$createVideoNode` keeps constructing the
 * assembled class so the nested-editor and transient-prop specs are
 * initialized.
 */
export const VideoNode = assembleCardNodeOnce(videoDeclaration)
export type VideoNode = InstanceType<typeof VideoNode> & {
  __triggerFileDialog: boolean
  __initialFile: File | null
  __captionEditor: LexicalEditor | null
  __captionEditorInitialState: EditorState | undefined
}

export const $createVideoNode = (dataset: VideoNodeDataset): VideoNode => {
  // the nested-editor and transient fields are initialized by the constructor from the dataset
  return new VideoNode(dataset) as VideoNode
}
