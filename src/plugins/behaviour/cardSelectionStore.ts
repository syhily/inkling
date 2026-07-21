import { createComposerHandle, type ComposerHandle } from './composer-handle'

// Editor-side handle for card selection state (plan 038), built on the
// composer handle factory. Owns the values non-React code needs —
// selectedCardKey, isEditingCard, and showVisibilitySettings — so Lexical
// handlers can read them synchronously instead of closing over a stale React
// mirror. Fed by registerCardSelection and the card/visibility command
// handlers; React subscribes render-only via useCardSelection.
// showVisibilitySettings is global (not per card): the visibility command
// handlers set it and HtmlNodeComponent — the sole indicator-icon card —
// reads it, gated by its own CardContext.isSelected.
// One instance per top-level composer (created in InklingComposer).

export interface CardSelectionState {
  selectedCardKey: string | null
  isEditingCard: boolean
  showVisibilitySettings: boolean
}

export type CardSelectionStore = ComposerHandle<CardSelectionState>

export function createCardSelectionStore(): CardSelectionStore {
  return createComposerHandle<CardSelectionState>({
    selectedCardKey: null,
    isEditingCard: false,
    showVisibilitySettings: false,
  })
}
