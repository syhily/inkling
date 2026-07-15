import React from 'react'

import { createCardSelectionStore, type CardSelectionStore } from '@/plugins/behaviour/cardSelectionStore'

// Internal context carrying the per-composer card selection store (plan 038).
// The InklingSelectedCardContext provider creates one instance per top-level
// composer and exposes it here. The default is a fallback for consumers
// rendered outside any provider (e.g. isolated plugin tests); real editors
// always get the provider's instance, so composers never share selection
// state through this default.
export const CardSelectionStoreContext = React.createContext<CardSelectionStore>(createCardSelectionStore())

export const useCardSelectionStore = () => React.useContext(CardSelectionStoreContext)
