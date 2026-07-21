import React from 'react'

import { createSearchCoordinator, type ListOptionSection, type SearchLinksFn } from '@/hooks/search-coordinator'

// React adapter over @/hooks/search-coordinator (the deep module — request
// tracks, URL short-circuit, and race policy live there). The coordinator is
// recreated when the search function or options change, which both restarts
// the default prefetch and re-issues the current query, matching the previous
// effect-per-input wiring.

export type { ListOptionItem, ListOptionSection, SearchLinksFn, SearchResult } from '@/hooks/search-coordinator'

interface UseSearchLinksOptions {
  noResultOptions?: (query: string) => ListOptionSection[]
}

interface UseSearchLinksResult {
  isSearching: boolean
  listOptions: ListOptionSection[]
}

export const useSearchLinks = (
  query: string,
  searchLinks?: SearchLinksFn,
  { noResultOptions }: UseSearchLinksOptions = {},
): UseSearchLinksResult => {
  const coordinator = React.useMemo(
    () => createSearchCoordinator({ searchLinks, noResultOptions }),
    [searchLinks, noResultOptions],
  )

  React.useEffect(() => {
    coordinator.start()
    return () => {
      coordinator.dispose()
    }
  }, [coordinator])

  React.useEffect(() => {
    coordinator.setQuery(query)
  }, [coordinator, query])

  const snapshot = React.useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot)

  return {
    isSearching: snapshot.isSearching,
    listOptions: query ? snapshot.listOptions : snapshot.defaultListOptions,
  }
}
