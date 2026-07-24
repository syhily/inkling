// Card menu navigator — the headless state machine owning the slash menu's
// keyboard selection: the wrap-around index policy, the scroll-request latch,
// and the reset-on-rebuild. Same shape as `@/hooks/search-coordinator`: a
// plain store with snapshot subscription, so the wrap/reset/enter-resolution
// matrix is a synchronous test table. SlashCardMenuPlugin keeps the Lexical
// command registrations and calls in; CardMenu renders the snapshot as-is.

export interface MenuNavigatorSnapshot {
  selectedItemIndex: number
  scrollToSelectedItem: boolean
}

export function createMenuNavigator() {
  let snapshot: MenuNavigatorSnapshot = { selectedItemIndex: 0, scrollToSelectedItem: false }
  const listeners = new Set<() => void>()

  const emit = (partial: Partial<MenuNavigatorSnapshot>) => {
    snapshot = { ...snapshot, ...partial }
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    getSnapshot: () => snapshot,

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    /** Arrow up/left: step back one item, wrapping to the last from the first. Latches a scroll request. */
    moveUp(maxItemIndex: number) {
      emit({
        scrollToSelectedItem: true,
        selectedItemIndex: snapshot.selectedItemIndex === 0 ? maxItemIndex : snapshot.selectedItemIndex - 1,
      })
    },

    /** Arrow down/right: step forward one item, wrapping to the first from the last. Latches a scroll request. */
    moveDown(maxItemIndex: number) {
      emit({
        scrollToSelectedItem: true,
        selectedItemIndex: snapshot.selectedItemIndex === maxItemIndex ? 0 : snapshot.selectedItemIndex + 1,
      })
    },

    /** Menu rebuilt (query/config changed): the selection returns to the first item. The scroll latch is untouched. */
    reset() {
      if (snapshot.selectedItemIndex !== 0) {
        emit({ selectedItemIndex: 0 })
      }
    },

    /** Read and clear the scroll-request latch (menu close). Returns whether a scroll was pending. */
    consumeScrollRequest(): boolean {
      const requested = snapshot.scrollToSelectedItem
      if (requested) {
        emit({ scrollToSelectedItem: false })
      }
      return requested
    },

    /** Enter resolution: the item at the current index in the flat render-ordered list. */
    selectedItem<T>(items: T[]): T | undefined {
      return items[snapshot.selectedItemIndex]
    },
  }
}

export type MenuNavigator = ReturnType<typeof createMenuNavigator>
