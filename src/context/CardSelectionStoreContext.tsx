import { createCardSelectionStore, type CardSelectionState } from '@/plugins/behaviour/cardSelectionStore'
import { createComposerHandleBinding } from '@/plugins/behaviour/composer-handle'

// Internal context carrying the per-composer card selection store (plan 038).
// InklingComposer creates one instance per top-level composer and exposes it
// here. The default is a fallback for consumers rendered outside any provider
// (e.g. isolated plugin tests); real editors always get the provider's
// instance, so composers never share selection state through this default.
export const {
  Context: CardSelectionStoreContext,
  useHandle: useCardSelectionStore,
  useHandleState: useCardSelectionState,
} = createComposerHandleBinding<CardSelectionState>(createCardSelectionStore)
