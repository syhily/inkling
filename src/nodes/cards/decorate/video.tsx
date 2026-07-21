import type { VideoNode } from '@/nodes/VideoNode'

import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import { VideoNodeComponent } from '@/nodes/VideoNodeComponent'

/**
 * Video's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: VideoNode) {
  const cardWidth = normalizeCardWidth(node.cardWidth) ?? 'regular'

  return (
    <VideoNodeComponent
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      cardWidth={cardWidth}
      customThumbnail={node.customThumbnailSrc}
      initialFile={node.__initialFile}
      isLoopChecked={node.loop}
      nodeKey={node.getKey()}
      thumbnail={node.thumbnailSrc}
      totalDuration={node.formattedDuration}
      triggerFileDialog={node.__triggerFileDialog}
    />
  )
}
