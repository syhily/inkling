import type { CardSelectionState } from '@/plugins/behaviour/cardSelectionStore'

import { useCardSelectionState } from '@/context/CardSelectionStoreContext'

// Render-only subscription to the per-composer card selection store
// (plan 038). useSyncExternalStore compares snapshots with Object.is, so a
// subscriber re-renders only when its selected slice changes — keep selectors
// returning primitives (e.g. state => state.selectedCardKey), not fresh
// objects.
export function useCardSelection<T>(selector: (state: CardSelectionState) => T): T {
  return useCardSelectionState(selector)
}
