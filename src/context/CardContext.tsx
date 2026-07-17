import type { NodeKey } from 'lexical'

import React from 'react'

import type { CardWidth } from '@/nodes/base/utils/card-widths'

export interface CardContextValue {
  isSelected: boolean
  isEditing: boolean
  captionHasFocus: boolean
  cardWidth: CardWidth
  nodeKey: NodeKey | undefined
  setCardWidth: (width: CardWidth) => void
  setCaptionHasFocus: (focused: boolean) => void
  setEditing: (shouldEdit: boolean) => void
}

const CardContext = React.createContext<CardContextValue>({
  isSelected: false,
  isEditing: false,
  captionHasFocus: false,
  cardWidth: 'regular',
  nodeKey: undefined,
  setCardWidth: () => {},
  setCaptionHasFocus: () => {},
  setEditing: () => {},
})

export default CardContext
