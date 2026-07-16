import React from 'react'

// Temporary home (plan 047) for the word-count callback channel: hand-rolled
// pub/sub where the top-level WordCountPlugin writes .current in a layout
// effect and InklingNestedComposer reads it during render. Step 5 replaces it
// with an editor-side handle in the plan-038 store shape and deletes this
// module.
export interface InklingComposerContextValue {
  onWordCountChangeRef: React.MutableRefObject<((count: number) => void) | null>
}

const InklingComposerContext = React.createContext<InklingComposerContextValue>({
  onWordCountChangeRef: { current: null },
})

export default InklingComposerContext
