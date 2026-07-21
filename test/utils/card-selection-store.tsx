import React from 'react'

import { CardSelectionStoreContext } from '@/context/CardSelectionStoreContext'
import { createCardSelectionStore, type CardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'

// Test stand-in for the per-composer provider InklingComposer mounts: wraps
// children in a CardSelectionStoreContext.Provider backed by a real store.
// Returns the store alongside the wrapper so tests can seed or inspect state.
export function createCardSelectionStoreWrapper(store: CardSelectionStore = createCardSelectionStore()) {
  function CardSelectionStoreWrapper({ children }: { children: React.ReactNode }) {
    return <CardSelectionStoreContext.Provider value={store}>{children}</CardSelectionStoreContext.Provider>
  }
  return { store, wrapper: CardSelectionStoreWrapper }
}
