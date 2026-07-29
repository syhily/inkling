// Library browser — the headless module behind a media-library picker
// (docs/kobato-fit-plan.md C8): one debounced request track over the host's
// `search` callback, composed from the request-track primitives
// (src/utils/services/request-track.ts — scheduler port, snapshot store,
// latest-wins guard) so the race matrix is a synchronous unit test instead
// of renderHook + wall-clock sleeps. One state owner, one publish: the
// browser keeps the item list plus the loading/error flags; React subscribes
// to the snapshot and dispatches intents. Deliberately smaller than the gif
// browser — no pagination track, no column balancing, no keyboard-navigation
// machine (tiles are plain buttons, Tab order = DOM order). Generic over the
// item shape so a host's own library pickers (e.g. a music library on a host
// card) reuse the same machine. The React adapter is `useLibraryBrowser`;
// `LibrarySelector` renders and dispatches intents.

import { createRequestTrack, type RequestScheduler } from '@/utils/services/request-track'
import { createSnapshotStore } from '@/utils/services/snapshot-store'

export const LIBRARY_SEARCH_DEBOUNCE_MS = 300

export interface LibraryBrowserSnapshot<TItem> {
  items: TItem[]
  isLoading: boolean
  error: string | null
}

export type LibraryBrowserIntent = { type: 'search'; term: string }

/** Scheduler port for the debounced query track — the public alias of the request track's `RequestScheduler`. */
export type LibraryScheduler = RequestScheduler

export interface LibraryBrowser<TItem> {
  getSnapshot: () => LibraryBrowserSnapshot<TItem>
  subscribe: (listener: () => void) => () => void
  dispatch: (intent: LibraryBrowserIntent) => void
  dispose: () => void
}

/**
 * Single request track (no pagination, no prefetch track): an empty term
 * fires immediately (the default listing); non-empty terms are debounced.
 * Latest-wins: stale/superseded responses never overwrite; a rejection
 * preserves the last items and sets `error`; `undefined` resolves like a
 * cancellation (search-coordinator.ts convention).
 */
export function createLibraryBrowser<TItem>({
  search,
  scheduler,
  debounceMs = LIBRARY_SEARCH_DEBOUNCE_MS,
}: {
  search: (query: string) => Promise<TItem[] | undefined>
  scheduler?: LibraryScheduler
  debounceMs?: number
}): LibraryBrowser<TItem> {
  const store = createSnapshotStore<LibraryBrowserSnapshot<TItem>>({ items: [], isLoading: false, error: null })
  const track = createRequestTrack({ scheduler })

  const runSearch = async (generation: number, term: string): Promise<void> => {
    store.emit({ error: null, isLoading: true })

    let results: TItem[] | undefined
    let failure: string | null = null
    try {
      results = await search(term)
    } catch (e: unknown) {
      failure = e instanceof Error ? e.message : 'Unknown error'
    }

    // a newer search superseded this request while we were awaiting — the
    // newer request owns the flags, and the stale outcome must not apply
    if (!track.isLatest(generation)) {
      return
    }

    if (failure !== null) {
      // a rejection keeps the last items and surfaces the error
      store.emit({ error: failure, isLoading: false })
    } else if (results !== undefined) {
      store.emit({ items: results, isLoading: false })
    } else {
      // undefined resolves like a cancellation: keep the current items
      store.emit({ isLoading: false })
    }
  }

  const startSearch = (term: string): void => {
    void runSearch(track.next(), term)
  }

  const setSearch = (term: string): void => {
    track.cancelScheduled()

    // the default (unfiltered) listing fires immediately — no debounce
    if (term === '') {
      startSearch(term)
      return
    }

    track.schedule(() => {
      startSearch(term)
    }, debounceMs)
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,

    dispatch(intent: LibraryBrowserIntent) {
      switch (intent.type) {
        case 'search':
          setSearch(intent.term)
      }
    },

    /** Cancel the pending search and invalidate every in-flight request. */
    dispose: () => track.dispose(),
  }
}
