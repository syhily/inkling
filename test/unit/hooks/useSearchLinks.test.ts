import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type SearchResult, useSearchLinks } from '@/hooks/useSearchLinks'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function resultsFor(label: string): SearchResult[] {
  return [{ label, items: [{ title: `${label} result`, url: `https://example.com/${label}` }] }]
}

async function waitForDebounce() {
  // the hook debounces searches by 100ms
  await act(async () => {
    await new Promise((r) => {
      setTimeout(r, 150)
    })
  })
}

describe('useSearchLinks', () => {
  it('resolves like a cancelled search when no search function is provided', async () => {
    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query), {
      initialProps: { query: '' },
    })

    // mount settles out of the searching state with the URL-entry default
    await waitFor(() => expect(result.current.isSearching).toBe(false))
    expect(result.current.listOptions[0]?.label).toBe('Link to web page')

    // a query resolves undefined — nothing is written, searching clears,
    // and the displayed list (the search results, never written) is empty
    rerender({ query: 'anything' })
    await waitForDebounce()
    expect(result.current.isSearching).toBe(false)
    expect(result.current.listOptions).toEqual([])

    // clearing the query brings the untouched defaults back
    rerender({ query: '' })
    await waitForDebounce()
    expect(result.current.listOptions[0]?.label).toBe('Link to web page')
  })

  it('ignores stale responses that resolve out of order', async () => {
    const first = deferred<SearchResult[]>()
    const second = deferred<SearchResult[]>()
    const searchLinks = vi.fn((term?: string): Promise<SearchResult[] | undefined> => {
      if (term === 'first') {
        return first.promise
      }
      if (term === 'second') {
        return second.promise
      }
      return Promise.resolve([])
    })

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'first' })
    await waitForDebounce()
    rerender({ query: 'second' })
    await waitForDebounce()

    await act(async () => {
      second.resolve(resultsFor('second'))
    })
    await waitFor(() => expect(result.current.listOptions[0]?.label).toBe('second'))

    // the older query resolves after the newer one — it must not overwrite
    await act(async () => {
      first.resolve(resultsFor('first'))
      await new Promise((r) => {
        setTimeout(r, 0)
      })
    })
    expect(result.current.listOptions[0]?.label).toBe('second')
  })

  it('clears the searching state when the search resolves to undefined', async () => {
    const searchLinks = vi.fn(
      (term?: string): Promise<SearchResult[] | undefined> =>
        term === 'gone' ? Promise.resolve(undefined) : Promise.resolve([]),
    )

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'gone' })

    await waitFor(() => expect(searchLinks).toHaveBeenCalledWith('gone'))
    await waitFor(() => expect(result.current.isSearching).toBe(false))
  })

  it('shows the URL option for URL queries without searching', async () => {
    const searchLinks = vi.fn((): Promise<SearchResult[] | undefined> => Promise.resolve([]))

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))
    expect(searchLinks).toHaveBeenCalledTimes(1)

    rerender({ query: 'https://example.com/page' })

    expect(result.current.listOptions[0]?.label).toBe('Link to web page')
    expect(result.current.listOptions[0]?.items[0]?.value).toBe('https://example.com/page')
    expect(searchLinks).toHaveBeenCalledTimes(1)
  })

  it('treats mailto: queries as URLs without searching', async () => {
    const searchLinks = vi.fn((): Promise<SearchResult[] | undefined> => Promise.resolve([]))

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))
    expect(searchLinks).toHaveBeenCalledTimes(1)

    rerender({ query: 'mailto:hello@example.com' })

    expect(result.current.listOptions[0]?.label).toBe('Link to web page')
    expect(result.current.listOptions[0]?.items[0]?.type).toBe('url')
    expect(result.current.listOptions[0]?.items[0]?.value).toBe('mailto:hello@example.com')
    expect(searchLinks).toHaveBeenCalledTimes(1)
  })

  it('loads default options on mount and marks them as the default type', async () => {
    const searchLinks = vi.fn((): Promise<SearchResult[] | undefined> => Promise.resolve(resultsFor('recent')))

    const { result } = renderHook(() => useSearchLinks('', searchLinks))

    expect(result.current.isSearching).toBe(true)
    await waitFor(() => expect(result.current.isSearching).toBe(false))

    expect(result.current.listOptions[0]?.label).toBe('recent')
    expect(result.current.listOptions[0]?.items[0]).toMatchObject({
      label: 'recent result',
      value: 'https://example.com/recent',
      highlight: false,
      type: 'default',
    })
  })

  it('maps search results to list options', async () => {
    const searchLinks = vi.fn(
      (term?: string): Promise<SearchResult[] | undefined> =>
        term === 'cats'
          ? Promise.resolve([
              { label: 'Pages', items: [{ title: 'Cats', url: 'https://example.com/cats', metaText: 'Page' }] },
            ])
          : Promise.resolve([]),
    )

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'cats' })
    await waitForDebounce()

    await waitFor(() => expect(result.current.listOptions[0]?.label).toBe('Pages'))
    expect(result.current.listOptions[0]?.items[0]).toMatchObject({
      label: 'Cats',
      value: 'https://example.com/cats',
      highlight: true,
      type: 'internal',
      metaText: 'Page',
    })
  })

  it('shows the no-results option when a search returns an empty array', async () => {
    const searchLinks = vi.fn((): Promise<SearchResult[] | undefined> => Promise.resolve([]))

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'nothing-matches' })
    await waitForDebounce()

    await waitFor(() => expect(result.current.listOptions[0]?.items[0]?.type).toBe('no-results'))
    expect(result.current.listOptions[0]?.label).toBe('Link to web page')
    expect(result.current.listOptions[0]?.items[0]?.label).toBe('Enter URL to create link')
    expect(result.current.listOptions[0]?.items[0]?.value).toBeNull()
  })

  it('uses custom noResultOptions when a search returns nothing', async () => {
    const searchLinks = vi.fn((): Promise<SearchResult[] | undefined> => Promise.resolve([]))
    const noResultOptions = vi.fn(() => [
      {
        label: 'Custom',
        items: [{ label: 'Nothing here', value: null, Icon: () => null, highlight: false, type: 'custom-empty' }],
      },
    ])

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks, { noResultOptions }), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.isSearching).toBe(false))

    rerender({ query: 'nothing-matches' })
    await waitForDebounce()

    await waitFor(() => expect(result.current.listOptions[0]?.label).toBe('Custom'))
    expect(result.current.listOptions[0]?.items[0]?.type).toBe('custom-empty')
    expect(noResultOptions).toHaveBeenCalled()
  })

  it('shows the default options again when the query is cleared', async () => {
    const searchLinks = vi.fn(
      (term?: string): Promise<SearchResult[] | undefined> =>
        term === 'cats' ? Promise.resolve(resultsFor('search')) : Promise.resolve(resultsFor('default')),
    )

    const { result, rerender } = renderHook(({ query }) => useSearchLinks(query, searchLinks), {
      initialProps: { query: '' },
    })

    await waitFor(() => expect(result.current.listOptions[0]?.label).toBe('default'))

    rerender({ query: 'cats' })
    await waitForDebounce()
    await waitFor(() => expect(result.current.listOptions[0]?.label).toBe('search'))

    rerender({ query: '' })
    expect(result.current.listOptions[0]?.label).toBe('default')
  })
})
