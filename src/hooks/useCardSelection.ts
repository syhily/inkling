import React from 'react'

import type { CardSelectionState } from '@/plugins/behaviour/cardSelectionStore'

import { CardSelectionStoreContext } from '@/context/CardSelectionStoreContext'

// Render-only subscription to the per-composer card selection store
// (plan 038). useSyncExternalStore compares snapshots with Object.is, so a
// subscriber re-renders only when its selected slice changes — keep selectors
// returning primitives (e.g. state => state.selectedCardKey), not fresh
// objects.
export function useCardSelection<T>(selector: (state: CardSelectionState) => T): T {
  const store = React.useContext(CardSelectionStoreContext)
  const getSnapshot = () => selector(store.getState())
  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}
