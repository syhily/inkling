import React from 'react'

import EarthIcon from '@/assets/icons/inkling-earth.svg?react'
import { debounce } from '@/utils'

const DEBOUNCE_MS = 100
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

export type SearchLinksFn = (term?: string) => Promise<SearchResult[] | undefined>

interface UseSearchLinksOptions {
  noResultOptions?: (query: string) => ListOptionSection[]
}

interface UseSearchLinksResult {
  isSearching: boolean
  listOptions: ListOptionSection[]
}

interface SearchRequest {
  id: number
  term: string
}

interface DefaultSearchRequest {
  id: number
  promise: Promise<void>
}

export const useSearchLinks = (
  query: string,
  searchLinks?: SearchLinksFn,
  { noResultOptions }: UseSearchLinksOptions = {},
): UseSearchLinksResult => {
  const [defaultListOptions, setDefaultListOptions] = React.useState<ListOptionSection[]>([])
  const [listOptions, setListOptions] = React.useState<ListOptionSection[]>([])
  const [isSearching, setIsSearching] = React.useState<boolean>(false)

  const latestRequestIdRef = React.useRef(0)
  const latestDefaultRequestIdRef = React.useRef(0)
  const defaultRequestRef = React.useRef<DefaultSearchRequest | null>(null)
  const defaultOptionsLoadedRef = React.useRef(false)

  const search = React.useMemo(() => {
    return async function _search({ id, term }: SearchRequest): Promise<void> {
      if (latestRequestIdRef.current !== id) {
        return
      }

      setIsSearching(true)
      try {
        // a missing search function resolves like a cancelled search: keep the
        // current options and leave the searching state
        const results = searchLinks ? await searchLinks(term) : undefined

        // a newer query superseded this one while we were awaiting — don't
        // let a slow older response overwrite the newer results
        if (latestRequestIdRef.current !== id) {
          return
        }

        // can return undefined if the search was cancelled, avoid updating
        // in that scenario because we can end up in a race condition where
        // we overwrite the results with an empty array whilst still waiting
        // for a later search to complete. Avoids flashing of "no results".
        if (results !== undefined) {
          setListOptions(convertSearchResultsToListOptions(results, term, { noResultOptions }))
        }
      } catch {
        // Search is best-effort. Preserve the last options when the host
        // rejects, and always leave the searching state below.
      } finally {
        if (latestRequestIdRef.current === id) {
          setIsSearching(false)
        }
      }
    }
  }, [searchLinks, noResultOptions])

  const debouncedSearch = React.useMemo(() => {
    return debounce(search, DEBOUNCE_MS)
  }, [search])

  const startDefaultOptionsFetch = React.useCallback((): Promise<void> => {
    const id = latestDefaultRequestIdRef.current + 1
    latestDefaultRequestIdRef.current = id
    const promise = (async () => {
      try {
        const results = searchLinks ? await searchLinks() : undefined
        if (latestDefaultRequestIdRef.current === id) {
          setDefaultListOptions(convertSearchResultsToListOptions(results, '', { type: 'default' }))
          defaultOptionsLoadedRef.current = true
        }
      } catch {
        // Default suggestions are best-effort.
      }
    })()

    defaultRequestRef.current = { id, promise }
    void promise.then(() => {
      if (defaultRequestRef.current?.id === id) {
        defaultRequestRef.current = null
      }
    })
    return promise
  }, [searchLinks])

  const waitForDefaultOptions = React.useCallback((): Promise<void> => {
    if (defaultOptionsLoadedRef.current) {
      return Promise.resolve()
    }
    return defaultRequestRef.current?.promise ?? startDefaultOptionsFetch()
  }, [startDefaultOptionsFetch])

  React.useEffect(() => {
    defaultOptionsLoadedRef.current = false
    const promise = startDefaultOptionsFetch()

    return () => {
      latestDefaultRequestIdRef.current += 1
      if (defaultRequestRef.current?.promise === promise) {
        defaultRequestRef.current = null
      }
    }
  }, [startDefaultOptionsFetch])

  React.useEffect(
    () => () => {
      debouncedSearch.cancel()
      latestRequestIdRef.current += 1
    },
    [debouncedSearch],
  )

  React.useEffect(() => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    // perform a non-debounced search if the query is a URL so the
    // "Link to web page" option updates more responsively
    if (URL_QUERY_REGEX.test(query)) {
      debouncedSearch.cancel()
      setListOptions(urlQueryOptions(query))
      setIsSearching(false)
      return
    }

    if (!query) {
      debouncedSearch.cancel()
      if (defaultOptionsLoadedRef.current) {
        setIsSearching(false)
      } else {
        setIsSearching(true)
        void waitForDefaultOptions().then(() => {
          if (latestRequestIdRef.current === requestId) {
            setIsSearching(false)
          }
        })
      }
      return
    }

    debouncedSearch({ id: requestId, term: query })
  }, [query, debouncedSearch, waitForDefaultOptions])

  const displayedListOptions = query ? listOptions : defaultListOptions

  return {
    isSearching,
    listOptions: displayedListOptions,
  }
}
