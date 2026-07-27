import type { NodeKey } from 'lexical'

import React from 'react'

// Genuinely card-local state, provided by InklingCardWrapper to the card
// subtree. Selection/edit-mode state is NOT here — readers subscribe to the
// per-composer card selection store via useCardSelectionState
// (state.selectedCardKey === nodeKey, plus state.isEditingCard), and entering
// edit mode is a direct EDIT_CARD_COMMAND dispatch. Card width flows from the
// node through the declaration's decorateTarget width mapper to the wrapper's
// width prop (and to the card component as a prop for Image/Video) — there is
// no context mirror.
export interface CardContextValue {
  captionHasFocus: boolean
  nodeKey: NodeKey | undefined
  setCaptionHasFocus: (focused: boolean) => void
}

const CardContext = React.createContext<CardContextValue>({
  captionHasFocus: false,
  nodeKey: undefined,
  setCaptionHasFocus: () => {},
})

export default CardContext
