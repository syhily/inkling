// Editor-side store for card selection state (plan 038). Owns the two values
// non-React code needs — selectedCardKey and isEditingCard — so Lexical
// handlers can read them synchronously instead of closing over a stale React
// mirror. Fed once by registerCardSelection; React subscribes render-only via
// useCardSelection (useSyncExternalStore). One instance per top-level composer
// (created in the InklingSelectedCardContext provider) — never a module
// singleton, so multiple composers on one page cannot clobber each other.

export interface CardSelectionState {
  selectedCardKey: string | null
  isEditingCard: boolean
}

export type CardSelectionListener = (state: CardSelectionState) => void

export interface CardSelectionStore {
  getState: () => CardSelectionState
  setState: (partial: Partial<CardSelectionState>) => void
  subscribe: (listener: CardSelectionListener) => () => void
}

export function createCardSelectionStore(): CardSelectionStore {
  let state: CardSelectionState = { selectedCardKey: null, isEditingCard: false }
  const listeners = new Set<CardSelectionListener>()

  return {
    getState: () => state,

    setState: (partial) => {
      const next = { ...state, ...partial }
      if (next.selectedCardKey === state.selectedCardKey && next.isEditingCard === state.isEditingCard) {
        return
      }
      state = next
      for (const listener of listeners) {
        listener(state)
      }
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
