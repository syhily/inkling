import React from 'react'

import { createLibraryBrowser, type LibraryBrowser, type LibraryScheduler } from '@/utils/services/library-browser'

// React adapter over @/utils/services/library-browser (the deep module — the
// debounced request track and race policy live there). The browser is
// recreated when the search function or the injected ports change, mirroring
// useGifBrowser; hosts resolve their adapter once, so the memo keys on
// function identity.

interface UseLibraryBrowserOptions<TItem> {
  search: (query: string) => Promise<TItem[] | undefined>
  scheduler?: LibraryScheduler
  debounceMs?: number
}

export function useLibraryBrowser<TItem>({
  search,
  scheduler,
  debounceMs,
}: UseLibraryBrowserOptions<TItem>): LibraryBrowser<TItem> {
  const browser = React.useMemo(
    () => createLibraryBrowser<TItem>({ search, scheduler, debounceMs }),
    [search, scheduler, debounceMs],
  )

  React.useEffect(() => {
    return () => {
      browser.dispose()
    }
  }, [browser])

  return browser
}
