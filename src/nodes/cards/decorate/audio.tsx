import type { AudioNode } from '@/nodes/AudioNode'

import { AudioNodeComponent } from '@/nodes/AudioNodeComponent'

/**
 * Audio's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: AudioNode) {
  return (
    <AudioNodeComponent
      duration={node.duration}
      initialFile={node.__initialFile}
      nodeKey={node.getKey()}
      src={node.src}
      thumbnailSrc={node.thumbnailSrc}
      title={node.title}
      triggerFileDialog={node.__triggerFileDialog}
    />
  )
}
