import React from 'react'

import type { GifProviderConfig } from '@/utils/services/gif'

import { createGifBrowser, type GifBrowser, type GifFetchPage, type GifScheduler } from '@/utils/services/gif-browser'

// React adapter over @/utils/services/gif-browser (the deep module — fetch
// tracks, column balancing, and the navigation machine live there). The
// browser is recreated when the provider config fields or the injected ports
// change; callers re-resolve the config object per render, so the memo keys
// on its fields rather than its identity.

interface UseGifBrowserOptions {
  config: GifProviderConfig
  fetchPage?: GifFetchPage
  scheduler?: GifScheduler
  debounceMs?: number
}

export function useGifBrowser({ config, fetchPage, scheduler, debounceMs }: UseGifBrowserOptions): GifBrowser {
  const browser = React.useMemo(
    () => createGifBrowser({ config, fetchPage, scheduler, debounceMs }),
    // config is re-resolved per render by callers; its fields are the real inputs
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [config.provider, config.apiUrl, config.apiKey, config.contentFilter, fetchPage, scheduler, debounceMs],
  )

  React.useEffect(() => {
    return () => {
      browser.dispose()
    }
  }, [browser])

  return browser
}
