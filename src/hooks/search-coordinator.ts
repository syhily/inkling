import React from 'react'

import EarthIcon from '@/assets/icons/inkling-earth.svg?react'
import { createRequestTrack, createSnapshotStore, type RequestScheduler } from '@/utils/services/request-track'

// Search coordinator — the headless module owning the link-search flow behind
// useSearchLinks: two request tracks (the debounced query search and the
// default-options prefetch, both composed from the request-track primitives
// in src/utils/services/request-track.ts), the URL short-circuit, and the
// cross-track waiting. The churn (stale responses, superseded queries,
// rejections, cancellation) lives here behind injected ports — the scheduler
// and the searchLinks promise factory — so the race matrix is a synchronous
// test table instead of renderHook + wall-clock sleeps. The React adapter is
// useSearchLinks (~40 lines): position and constraints in, a snapshot out.

export const SEARCH_DEBOUNCE_MS = 100

// A third URL table, deliberately not unified with either side of the
// clipboard protocol's policy pair: it classifies link-search-box queries
// (accepts mailto/tel, not ftp), not pasted links (`isPasteableLinkUrl` in
// `@/plugins/behaviour/clipboard-protocol`) or export-safe hrefs (`isSafeUrl`
// in `@/nodes/base/utils/is-safe-url`).
const URL_QUERY_REGEX = /^http|^#|^\/|^mailto:|^tel:/

export interface ListOptionItem {
  label: string
  value: string | null
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  highlight: boolean
  type: string
  metaText?: string
  MetaIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  metaIconTitle?: string
}

export interface ListOptionSection {
  label: string
  items: ListOptionItem[]
}

export interface SearchResult {
  label: string
  items: Array<{
    title: string
    url: string
    Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
    metaText?: string
    MetaIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
    metaIconTitle?: string
  }>
}

export type SearchLinksFn = (term?: string) => Promise<SearchResult[] | undefined>

function urlQueryOptions(query: string): ListOptionSection[] {
  return [
    {
      label: 'Link to web page',
      items: [
        {
          label: query,
          value: query,
          Icon: EarthIcon,
          highlight: false,
          type: 'url',
        },
      ],
    },
  ]
}

function defaultNoResultOptions(query: string): ListOptionSection[] {
  return [
    {
      label: 'Link to web page',
      items: [
        {
          label: `Enter URL to create link`,
          value: null,
          Icon: EarthIcon,
          highlight: false,
          type: 'no-results',
        },
      ],
    },
  ]
}

function convertSearchResultsToListOptions(
  results: SearchResult[] | undefined,
  query: string,
  { noResultOptions, type }: { noResultOptions?: (query: string) => ListOptionSection[]; type?: string } = {},
): ListOptionSection[] {
  if (!results || !results.length) {
    return (noResultOptions || defaultNoResultOptions)(query)
  }

  return results.map((result) => {
    const items: ListOptionItem[] = result.items.map((item) => {
      return {
        label: item.title,
        value: item.url,
        Icon: item.Icon ?? EarthIcon,
        highlight: type !== 'default',
        metaText: item.metaText,
        MetaIcon: item.MetaIcon,
        metaIconTitle: item.metaIconTitle,
        type: type || 'internal',
      }
    })

    return { ...result, items }
  })
}

export interface SearchCoordinatorSnapshot {
  isSearching: boolean
  listOptions: ListOptionSection[]
  defaultListOptions: ListOptionSection[]
}

/** Scheduler port for the debounced query track — an alias of the request track's `RequestScheduler`. */
export type SearchScheduler = RequestScheduler

interface CreateSearchCoordinatorOptions {
  searchLinks?: SearchLinksFn
  noResultOptions?: (query: string) => ListOptionSection[]
  scheduler?: SearchScheduler
  debounceMs?: number
}

export function createSearchCoordinator({
  searchLinks,
  noResultOptions,
  scheduler,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: CreateSearchCoordinatorOptions) {
  const store = createSnapshotStore<SearchCoordinatorSnapshot>({
    isSearching: false,
    listOptions: [],
    defaultListOptions: [],
  })

  // query track (debounced) and default (prefetch) track — the latest-wins
  // guards are the shared request-track primitive
  const queryTrack = createRequestTrack({ scheduler })
  const defaultTrack = createRequestTrack()
  let defaultRequest: { id: number; promise: Promise<void> } | null = null
  let defaultOptionsLoaded = false

  const runSearch = async (id: number, term: string): Promise<void> => {
    if (!queryTrack.isLatest(id)) {
      return
    }

    store.emit({ isSearching: true })
    try {
      // a missing search function resolves like a cancelled search: keep the
      // current options and leave the searching state
      const results = searchLinks ? await searchLinks(term) : undefined

      // a newer query superseded this one while we were awaiting — don't
      // let a slow older response overwrite the newer results
      if (!queryTrack.isLatest(id)) {
        return
      }

      // undefined means the search was cancelled: keep the current options
      // instead of flashing "no results" while a later search is in flight
      if (results !== undefined) {
        store.emit({ listOptions: convertSearchResultsToListOptions(results, term, { noResultOptions }) })
      }
    } catch {
      // Search is best-effort. Preserve the last options when the host
      // rejects, and always leave the searching state below.
    } finally {
      if (queryTrack.isLatest(id)) {
        store.emit({ isSearching: false })
      }
    }
  }

  const startDefaultOptionsFetch = (): Promise<void> => {
    const id = defaultTrack.next()
    const promise = (async () => {
      try {
        const results = searchLinks ? await searchLinks() : undefined
        if (defaultTrack.isLatest(id)) {
          defaultOptionsLoaded = true
          store.emit({ defaultListOptions: convertSearchResultsToListOptions(results, '', { type: 'default' }) })
        }
      } catch {
        // Default suggestions are best-effort.
      }
    })()

    defaultRequest = { id, promise }
    void promise.then(() => {
      if (defaultRequest?.id === id) {
        defaultRequest = null
      }
    })
    return promise
  }

  const waitForDefaultOptions = (): Promise<void> => {
    if (defaultOptionsLoaded) {
      return Promise.resolve()
    }
    return defaultRequest?.promise ?? startDefaultOptionsFetch()
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,

    setQuery(query: string) {
      const requestId = queryTrack.next()

      // URL queries skip the debounced search so the "Link to web page"
      // option updates more responsively
      if (URL_QUERY_REGEX.test(query)) {
        queryTrack.cancelScheduled()
        store.emit({ listOptions: urlQueryOptions(query), isSearching: false })
        return
      }

      if (!query) {
        queryTrack.cancelScheduled()
        if (defaultOptionsLoaded) {
          store.emit({ isSearching: false })
        } else {
          store.emit({ isSearching: true })
          void waitForDefaultOptions().then(() => {
            if (queryTrack.isLatest(requestId)) {
              store.emit({ isSearching: false })
            }
          })
        }
        return
      }

      queryTrack.schedule(() => void runSearch(requestId, query), debounceMs)
    },

    /** Begin the default-options prefetch (adapter mount). */
    start() {
      defaultOptionsLoaded = false
      void startDefaultOptionsFetch()
    },

    /** Invalidate every in-flight request (adapter unmount / recreation). */
    dispose() {
      queryTrack.dispose()
      defaultTrack.dispose()
      defaultRequest = null
    },
  }
}

export type SearchCoordinator = ReturnType<typeof createSearchCoordinator>
