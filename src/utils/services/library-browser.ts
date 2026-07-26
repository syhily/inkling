// Library browser — the headless module behind a media-library picker
// (docs/kobato-fit-plan.md C8): one debounced request track over the host's
// `search` callback, behind injected ports (the scheduler and the search
// promise factory) so the race matrix is a synchronous unit test instead of
// renderHook + wall-clock sleeps. One state owner, one publish: the browser
// keeps the item list plus the loading/error flags; React subscribes to the
// snapshot and dispatches intents. Deliberately smaller than the gif browser
// — no pagination track, no column balancing, no keyboard-navigation machine
// (tiles are plain buttons, Tab order = DOM order). Generic over the item
// shape so a host's own library pickers (e.g. a music library on a host card)
// reuse the same machine. The React adapter is `useLibraryBrowser`;
// `LibrarySelector` renders and dispatches intents.

export const LIBRARY_SEARCH_DEBOUNCE_MS = 300

export interface LibraryBrowserSnapshot<TItem> {
  items: TItem[]
  isLoading: boolean
  error: string | null
}

export type LibraryBrowserIntent = { type: 'search'; term: string }

/** Scheduler port for the debounced query track — tests inject a manual one. */
export interface LibraryScheduler {
  schedule: (fn: () => void, ms: number) => () => void
}

export interface LibraryBrowser<TItem> {
  getSnapshot: () => LibraryBrowserSnapshot<TItem>
  subscribe: (listener: () => void) => () => void
  dispatch: (intent: LibraryBrowserIntent) => void
  dispose: () => void
}

const defaultScheduler: LibraryScheduler = {
  schedule(fn, ms) {
    const id = setTimeout(fn, ms)
    return () => {
      clearTimeout(id)
    }
  },
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
  scheduler = defaultScheduler,
  debounceMs = LIBRARY_SEARCH_DEBOUNCE_MS,
}: {
  search: (query: string) => Promise<TItem[] | undefined>
  scheduler?: LibraryScheduler
  debounceMs?: number
}): LibraryBrowser<TItem> {
  let items: TItem[] = []
  let isLoading = false
  let error: string | null = null
  // Latest-wins request guard: a newer search supersedes every in-flight
  // request from an older track, so a slow response can never overwrite newer
  // results.
  let requestSeq = 0
  let cancelScheduledSearch: (() => void) | null = null

  let snapshot: LibraryBrowserSnapshot<TItem> = { items, isLoading, error }
  const listeners = new Set<() => void>()

  const emit = () => {
    snapshot = { items, isLoading, error }
    for (const listener of listeners) {
      listener()
    }
  }

  const runSearch = async (seq: number, term: string): Promise<void> => {
    error = null
    isLoading = true
    emit()

    let results: TItem[] | undefined
    let failure: string | null = null
    try {
      results = await search(term)
    } catch (e: unknown) {
      failure = e instanceof Error ? e.message : 'Unknown error'
    }

    // a newer search superseded this request while we were awaiting — the
    // newer request owns the flags, and the stale outcome must not apply
    if (seq !== requestSeq) {
      return
    }

    if (failure !== null) {
      // a rejection keeps the last items and surfaces the error
      error = failure
    } else if (results !== undefined) {
      items = results
    }
    // undefined resolves like a cancellation: keep the current items

    isLoading = false
    emit()
  }

  const startSearch = (term: string): void => {
    requestSeq += 1
    void runSearch(requestSeq, term)
  }

  const setSearch = (term: string): void => {
    cancelScheduledSearch?.()
    cancelScheduledSearch = null

    // the default (unfiltered) listing fires immediately — no debounce
    if (term === '') {
      startSearch(term)
      return
    }

    cancelScheduledSearch = scheduler.schedule(() => {
      cancelScheduledSearch = null
      startSearch(term)
    }, debounceMs)
  }

  return {
    getSnapshot: () => snapshot,

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    dispatch(intent: LibraryBrowserIntent) {
      switch (intent.type) {
        case 'search':
          setSearch(intent.term)
      }
    },

    /** Cancel the pending search and invalidate every in-flight request. */
    dispose() {
      cancelScheduledSearch?.()
      cancelScheduledSearch = null
      requestSeq += 1
    },
  }
}
