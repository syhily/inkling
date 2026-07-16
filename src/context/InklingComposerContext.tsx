import React from 'react'

import type { DragDropHandler } from '@/utils/draggable/DragDropHandler'

// Temporary home (plan 047) for the two per-composer channels that are not
// context reads at all: the drag-drop handler/container element (installed by
// mutating this value from DragDropReorderPlugin) and the word-count callback
// ref (hand-rolled pub/sub between WordCountPlugin and InklingNestedComposer).
// Steps 3 and 5 replace them with editor-side handles in the plan-038 store
// shape; this module is deleted once both land.
export interface InklingComposerContextValue {
  editorContainerRef: React.RefObject<HTMLElement | null>
  onWordCountChangeRef: React.MutableRefObject<((count: number) => void) | null>
  dragDropHandler?: DragDropHandler
}

const InklingComposerContext = React.createContext<InklingComposerContextValue>({
  editorContainerRef: { current: null },
  onWordCountChangeRef: { current: null },
})

export default InklingComposerContext
